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

    if (!id_area) {
      return res.status(400).json({ message: "El área es obligatoria" });
    }

    if (!asunto || !fec_inicio) {
      return res.status(400).json({
        message: "Asunto y fecha de inicio son obligatorios"
      });
    }

    const nombreArea = id_area.trim().toUpperCase();

    let area = await Area.findOne({
      where: { nombre: nombreArea }
    });

    if (!area) {
      area = await Area.create({ nombre: nombreArea });
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

      if (req.file.size > 15 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Archivo demasiado grande" });
      }

      archivoOriginal = req.file.originalname;

      const fileBuffer = fs.readFileSync(req.file.path);
      hashArchivo = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

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
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (fs.existsSync(rutaZipTemp)) {
        fs.unlinkSync(rutaZipTemp);
      }
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

    return res.status(201).json({
      message: "Expediente creado correctamente",
      expediente: nuevoExpediente
    });

  } catch (error) {
    console.error("ERROR EN CREAR EXPEDIENTE:", error);

    return res.status(500).json({
      message: "Error al crear expediente",
      error: error.message
    });
  }
};

export const obtenerExpedientes = async (req, res) => {
  try {
    const { mostrarArchivados } = req.query;
    const whereClause = { usuarioId: req.user.id };

    if (!mostrarArchivados || mostrarArchivados === 'false') {
      whereClause.archivado = false;
    }

    const expedientes = await Expediente.findAll({
      where: whereClause,
      include: Area,
      order: [["createdAt", "DESC"]],
    });

    res.json({ expedientes });

  } catch (error) {
    res.status(500).json({
      message: "Error al obtener expedientes",
      error: error.message
    });
  }
};

export const descargarArchivo = async (req, res) => {
  try {

    const { id } = req.params;

    const expediente = await Expediente.findOne({
      where: { id, usuarioId: req.user.id }
    });

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

    let decryptedZip;

    try {
      const decipher = crypto.createDecipheriv("aes-256-cbc", SECRET_KEY, iv);

      decryptedZip = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
    } catch (err) {
      console.error("ERROR AL DESCIFRAR:", err);
      return res.status(500).json({ message: "Error al descifrar archivo" });
    }
    const directory = await unzipper.Open.buffer(decryptedZip);

    if (!directory.files || directory.files.length === 0) {
      return res.status(500).json({ message: "ZIP vacío o corrupto" });
    }

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
    console.error("ERROR DESCARGA:", error);
    res.status(500).json({
      message: "Error al descargar archivo",
      error: error.message
    });
  }
};

export const eliminarExpediente = async (req, res) => {
  try {

    const { clave } = req.params;

    const expediente = await Expediente.findOne({
      where: { clave, usuarioId: req.user.id }
    });

    if (!expediente) {
      return res.status(404).json({ message: "Expediente no encontrado" });
    }

    if (expediente.archivo_guardado) {
      const rutaArchivo = path.join("uploads", expediente.archivo_guardado);
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
      }
    }


    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Eliminar expediente",
      archivo: expediente.clave,
      descripcion: `Expediente con clave ${clave} eliminado`
    });
    await expediente.destroy();

    res.json({ message: "Expediente eliminado correctamente" });

  } catch (error) {
    console.error("ERROR AL ELIMINAR:", error);
    res.status(500).json({
      message: "Error al eliminar expediente",
      error: error.message
    });
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
        usuarioId: req.user.id, archivado: false,
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
    console.error("ERROR BUSCAR:", error);
    res.status(500).json({
      message: "Error al buscar expedientes",
      error: error.message
    });
  }
};

export const editarExpediente = async (req, res) => {
  try {

    const { clave } = req.params;

    const expediente = await Expediente.findOne({
      where: { clave, usuarioId: req.user.id }
    });

    if (!expediente) {
      return res.status(404).json({ message: "Expediente no encontrado" });
    }

    const {
      id_area,
      asunto,
      clave: nuevaClave,
      caja,
      legajo,
      fec_inicio,
      fec_termino,
      n_hojas,
      observaciones
    } = req.body;
    let area = await Area.findOne({
      where: { nombre: id_area.trim().toUpperCase() }
    });

    if (!area) {
      area = await Area.create({
        nombre: id_area.trim().toUpperCase()
      });
    }

    let archivoOriginal = expediente.archivo_original;
    let archivoGuardado = expediente.archivo_guardado;
    let hashArchivo = expediente.hash_sha256;

    if (req.file) {
      if (archivoGuardado) {
        const rutaAnterior = path.join("uploads", archivoGuardado);
        if (fs.existsSync(rutaAnterior)) {
          fs.unlinkSync(rutaAnterior);
        }
      }

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

      hashArchivo = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

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

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (fs.existsSync(rutaZipTemp)) fs.unlinkSync(rutaZipTemp);
    }
    

    await expediente.update({
      id_area: area.id,
      asunto,
      clave: nuevaClave || expediente.clave,
      caja: caja || null,
      legajo: legajo || null,
      fec_inicio,
      fec_termino: fec_termino || null,
      n_hojas: n_hojas || null,
      observaciones: observaciones || null,
      archivo_original: archivoOriginal,
      archivo_guardado: archivoGuardado,
      hash_sha256: hashArchivo
    });

    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Actualizar expediente",
      archivo: expediente.clave,
      descripcion: `Expediente ${expediente.clave} actualizado`
    });
    res.json({
      message: "Expediente actualizado correctamente",
      expediente
    });

  } catch (error) {
    console.error("ERROR EN EDITAR:", error);
    res.status(500).json({
      message: "Error al actualizar expediente",
      error: error.message
    });
  }
};

export const obtenerPorClave = async (req, res) => {
  try {
    const { clave } = req.params;

    const expediente = await Expediente.findOne({
      where: { clave, usuarioId: req.user.id, archivado: false },
      include: [
        {
          model: Area,
          as: "area",
          attributes: ["id", "nombre"]
        }
      ]
    });

    if (!expediente) {
      return res.status(404).json({ message: "Expediente no encontrado" });
    }

    return res.json(expediente);

  } catch (error) {
    return res.status(500).json({
      message: "Error al buscar expediente",
      error: error.message
    });
  }
};

export const archivarExpediente = async (req, res) => {
  try {
    const { id } = req.params;

    const expediente = await Expediente.findByPk(id);
    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    expediente.archivado = true;
    expediente.fecha_archivado = new Date();
    expediente.archivado_por = req.user.id;

    await expediente.save();

    // ✅ Registrar acción
    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Archivar expediente",
      archivo: expediente.clave,
      descripcion: `El expediente ${expediente.clave} fue archivado`
    });

    res.json({
      message: "Expediente archivado correctamente",
      expediente
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al archivar" });
  }
};

export const restaurarExpediente = async (req, res) => {
  try {
    const { id } = req.params;

    const expediente = await Expediente.findByPk(id);
    if (!expediente) {
      return res.status(404).json({ message: "No encontrado" });
    }

    expediente.archivado = false;
    expediente.fecha_archivado = null;
    expediente.archivado_por = null;

    await expediente.save();

    // ✅ Registrar acción
    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Restaurar expediente",
      archivo: expediente.clave,
      descripcion: `El expediente ${expediente.clave} fue restaurado`
    });

    res.json({
      message: "Expediente restaurado correctamente",
      expediente
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al restaurar" });
  }
};

export const buscarExpedientesAdmin = async (req, res) => {
  try {

    const { termino } = req.query;

    if (!termino) {
      return res.json({ expedientes: [] });
    }

    const expedientes = await Expediente.findAll({
      where: {
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
    console.error("ERROR BUSCAR ADMIN:", error);
    res.status(500).json({
      message: "Error al buscar expedientes",
      error: error.message
    });
  }
};

