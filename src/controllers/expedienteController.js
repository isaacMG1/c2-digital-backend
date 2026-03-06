import Expediente from "../models/Expediente.js";
import Area from "../models/Area.js";
import path from "path";
import fs from "fs";
import { registrarAccion } from "./historialController.js";
import { Op } from "sequelize";
import crypto from "crypto";
import archiver from "archiver";
import mime from "mime-types";
import unzipper from "unzipper";

const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.FILE_SECRET || "CLAVE_SUPER_SECRETA_2026")
  .digest();

/* =====================================================
   CREAR EXPEDIENTE (TODOS PUEDEN)
===================================================== */
export const crearExpediente = async (req, res) => {
  try {
    const {
      id_area,
      asunto,
      clave,
      caja,
      legajo,
      fec_inicio,
      fec_termino,
      n_hojas,
      observaciones
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!id_area || !asunto || !fec_inicio) {
      return res.status(400).json({
        message: "Área, asunto y fecha de inicio son obligatorios"
      });
    }

    let area = await Area.findOne({
      where: { nombre: id_area.trim().toUpperCase() }
    });

    if (!area) {
      area = await Area.create({
        nombre: id_area.trim().toUpperCase()
      });
    }

    let archivoOriginal = null;
    let archivoGuardado = null;
    let hashArchivo = null;

    if (req.file) {
      const tiposPermitidos = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
      ];

      if (!tiposPermitidos.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Tipo de archivo no permitido" });
      }

      archivoOriginal = req.file.originalname;

      const fileBuffer = fs.readFileSync(req.file.path);
      hashArchivo = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      if (!fs.existsSync("temp")) fs.mkdirSync("temp");
      if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

      const nombreZipTemp = `${Date.now()}.zip`;
      const rutaZipTemp = path.join("temp", nombreZipTemp);

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(rutaZipTemp);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        archive.file(req.file.path, { name: archivoOriginal });
        archive.finalize();
      });

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", SECRET_KEY, iv);
      const zipBuffer = fs.readFileSync(rutaZipTemp);

      const encrypted = Buffer.concat([
        cipher.update(zipBuffer),
        cipher.final()
      ]);

      archivoGuardado = `${Date.now()}.bin`;
      const rutaFinal = path.join("uploads", archivoGuardado);

      fs.writeFileSync(rutaFinal, Buffer.concat([iv, encrypted]));

      fs.unlinkSync(req.file.path);
      fs.unlinkSync(rutaZipTemp);
    }

    const nuevoExpediente = await Expediente.create({
      id_area: area.id,
      asunto,
      clave,
      caja,
      legajo,
      fec_inicio,
      fec_termino,
      n_hojas,
      observaciones,
      archivo_original: archivoOriginal,
      archivo_guardado: archivoGuardado,
      hash_sha256: hashArchivo,
      usuarioId: req.user.id
    });

    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Crear expediente",
      archivo: clave,
      descripcion: `Expediente ${clave} creado`
    });

    res.status(201).json({
      message: "Expediente creado correctamente",
      expediente: nuevoExpediente
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   OBTENER TODOS (YA NO FILTRA POR USUARIO)
===================================================== */
export const obtenerExpedientes = async (req, res) => {
  try {
    const { mostrarArchivados } = req.query;

    const whereClause = {};

    if (!mostrarArchivados || mostrarArchivados === "false") {
      whereClause.archivado = false;
    }

    const expedientes = await Expediente.findAll({
      where: whereClause,
      include: Area,
      order: [["createdAt", "DESC"]],
    });

    res.json({ expedientes });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   DESCARGAR (TODOS PUEDEN)
===================================================== */
export const descargarArchivo = async (req, res) => {
  try {
    const { id } = req.params;

    const expediente = await Expediente.findByPk(id);

    if (!expediente || !expediente.archivo_guardado) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    const rutaArchivo = path.join(process.cwd(), "uploads", expediente.archivo_guardado);

    if (!fs.existsSync(rutaArchivo)) {
      return res.status(404).json({ message: "Archivo no existe en servidor" });
    }

    const fileData = fs.readFileSync(rutaArchivo);

    const iv = fileData.subarray(0, 16);
    const encrypted = fileData.subarray(16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", SECRET_KEY, iv);

    const decryptedZip = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    const directory = await unzipper.Open.buffer(decryptedZip);
    const archivo = directory.files[0];

    const mimeType =
      mime.lookup(expediente.archivo_original) ||
      "application/octet-stream";

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${expediente.archivo_original}"`
    );

    res.setHeader("Content-Type", mimeType);

    archivo.stream().pipe(res);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   EDITAR (SOLO ADMIN)
===================================================== */
export const editarExpediente = async (req, res) => {
  try {
    if (!req.user.permisos.includes("ACTUALIZAR_ARCHIVO")) {
       return res.status(403).json({ message: "No tienes permiso" });
    }

    const { clave } = req.params;

    const expediente = await Expediente.findOne({ where: { clave } });

    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    await expediente.update(req.body);

    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Actualizar expediente",
      archivo: expediente.clave,
      descripcion: `Expediente ${expediente.clave} actualizado`
    });

    res.json({ message: "Actualizado correctamente" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   ELIMINAR (SOLO ADMIN)
===================================================== */
export const eliminarExpediente = async (req, res) => {
  try {

    if (!req.user.permisos.includes("ELIMINAR_ARCHIVO")) {
      return res.status(403).json({ message: "No tienes permiso para eliminar" });
    }

    const { clave } = req.params;

    const expediente = await Expediente.findOne({
      where: { clave }
    });

    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    if (expediente.archivo_guardado) {
      const rutaArchivo = path.join("uploads", expediente.archivo_guardado);
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
      }
    }

    await expediente.destroy();

    res.json({ message: "Eliminado correctamente" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   ARCHIVAR (SOLO ADMIN)
===================================================== */
export const archivarExpediente = async (req, res) => {
  try {
    if (!req.user.permisos.includes("ARCHIVAR_DOCUMENTO")) {
      return res.status(403).json({ message: "No tienes permiso" });
}

    const expediente = await Expediente.findByPk(req.params.id);

    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    expediente.archivado = true;
    await expediente.save();

    res.json({ message: "Archivado correctamente" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   RESTAURAR (SOLO ADMIN)
===================================================== */
export const restaurarExpediente = async (req, res) => {
  try {
    if (!req.user.permisos.includes("RESTAURAR_DOCUMENTO")) {
      return res.status(403).json({ message: "No tienes permiso" });
    }

    const expediente = await Expediente.findByPk(req.params.id);

    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    expediente.archivado = false;
    await expediente.save();

    res.json({ message: "Restaurado correctamente" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const buscarExpedientes = async (req, res) => {
  try {
    const { termino } = req.query;

    if (!termino) {
      return res.json({ expedientes: [] });
    }

    const expedientes = await Expediente.findAll({
      where: {
        archivado: false,
        [Op.or]: [
          { clave: { [Op.like]: `%${termino}%` } },
          { asunto: { [Op.like]: `%${termino}%` } },
          { "$Area.nombre$": { [Op.like]: `%${termino}%` } }
        ]
      },
      include: [{ model: Area, required: false }],
      order: [["createdAt", "DESC"]]
    });

    res.json({ expedientes });

  } catch (error) {
    res.status(500).json({
      message: "Error al buscar expedientes",
      error: error.message
    });
  }
};

export const buscarExpedientesAdmin = async (req, res) => {
  try {
    const { termino } = req.query;

    const expedientes = await Expediente.findAll({
      where: {
        [Op.or]: [
          { clave: { [Op.like]: `%${termino}%` } },
          { asunto: { [Op.like]: `%${termino}%` } }
        ]
      },
      order: [["createdAt", "DESC"]]
    });

    res.json({ expedientes });

  } catch (error) {
    res.status(500).json({
      message: "Error al buscar expedientes",
      error: error.message
    });
  }
};

export const obtenerPorClave = async (req, res) => {
  try {

    const { clave } = req.params;

    const expediente = await Expediente.findOne({
      where: { clave }
    });

    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    res.json(expediente); // 👈 IMPORTANTE

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};