import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";
import Rol from "../models/Rol.js";
import crypto from "crypto";
import { transporter } from "../utils/mailer.js";
import { registrarAccion } from "./historialController.js";

export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, correo, password, rol } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const existe = await Usuario.findOne({ where: { email: correo } });
    if (existe) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // 🔹 Buscar rol por nombre
    const rolEncontrado = await Rol.findOne({
      where: { nombre: rol || "Usuario" }
    });

    if (!rolEncontrado) {
      return res.status(400).json({ message: "Rol no válido" });
    }

    const nuevoUsuario = await Usuario.create({
      nombre,
      email: correo,
      password: hashed,
      rolId: rolEncontrado.id
    });

    const { password: _, ...usuarioSinPassword } = nuevoUsuario.toJSON();

    res.status(201).json({
      message: "Usuario registrado correctamente",
      usuario: usuarioSinPassword,
    });

  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario" });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ 
        message: "Correo y contraseña son obligatorios" 
      });
    }

    const usuario = await Usuario.findOne({ 
      where: { email: correo } 
    });

    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return res.status(401).json({ 
        message: "Credenciales inválidas" 
      });
    }

    const rol = await Rol.findByPk(usuario.rolId);

    let permisosRol = rol?.permisos || [];
    if (typeof permisosRol === "string") {
      permisosRol = JSON.parse(permisosRol);
    }

    let adicionales = usuario.permisosAdicionales || [];
    if (typeof adicionales === "string") {
      adicionales = JSON.parse(adicionales);
    }

    let denegados = usuario.permisosDenegados || [];
    if (typeof denegados === "string") {
      denegados = JSON.parse(denegados);
    }
    let permisosFinales = new Set([
      ...permisosRol,
      ...adicionales
    ]);

    denegados.forEach(p => permisosFinales.delete(p));

    permisosFinales = Array.from(permisosFinales);

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: rol?.nombre,
        permisos: permisosFinales
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Inicio de sesión exitoso",
      token,
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ 
      message: "Error al iniciar sesión" 
    });
  }
};

export const usuarioActual = async (req, res) => {
  try {

    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: ["id", "nombre", "email"],
      include: {
        model: Rol,
        attributes: ["nombre"]
      }
    });

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.Rol?.nombre
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuario actual" });
  }
};

export const enviarCodigoReset = async (req, res) => {
  try {
    const { correo } = req.body;

    const usuario = await Usuario.findOne({ where: { email: correo } });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const codigo = crypto.randomInt(100000, 999999).toString();

    usuario.resetCode = codigo;
    usuario.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    await usuario.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correo,
      subject: "Código de recuperación de tu cuenta",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #8b153d;">Código de recuperación</h2>

          <p>Hola <strong>${usuario.nombre}</strong></p>

          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no enviaste esta solicitud, puedes ignorar este mensaje y tu cuenta no se verá afectada.</p>

          <p>Para verificar tu identidad, usa el siguiente código:</p>

          <div style="font-size: 36px; font-weight: bold; color: #8b153d; text-align: center; margin: 20px 0; background: #f5f5f5; padding: 15px 0; border-radius: 8px;">
            ${codigo}
          </div>

          <p>Este código expirará en <strong>15 minutos</strong>. Por seguridad, no compartas este código con nadie.</p>

          <p>Atentamente,<br/>
            <strong>Equipo de Soporte</strong></p>
        </div>
        `
    });

    res.json({ message: "Código enviado al correo" });

  } catch (error) {
  console.error("ERROR EN ENVIAR CODIGO:", error);
  res.status(500).json({ message: "Error al enviar código", error });
}
};

export const verificarCodigo = async (req, res) => {
  try {
    const { correo, codigo } = req.body;

    const usuario = await Usuario.findOne({ where: { email: correo } });

    if (
      !usuario ||
      usuario.resetCode !== codigo ||
      new Date() > usuario.resetCodeExpires
    ) {
      return res.status(400).json({ valido: false });
    }

    res.json({ valido: true });

  } catch (error) {
    res.status(500).json({ valido: false });
  }
};

export const cambiarPassword = async (req, res) => {
  try {
    const { correo, password } = req.body;

    const usuario = await Usuario.findOne({ where: { email: correo } });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const hashed = await bcrypt.hash(password, 10);

    usuario.password = hashed;
    usuario.resetCode = null;
    usuario.resetCodeExpires = null;

    await usuario.save();

    res.json({ message: "Contraseña actualizada correctamente" });

  } catch (error) {
    res.status(500).json({ message: "Error al cambiar contraseña" });
  }
};

export const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ["password"] },
      include: {
        model: Rol,
        attributes: ["nombre"]
      }
    });

    const resultado = usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rolId: u.rolId,
      rolNombre: u.Rol?.nombre
    }));

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {

    const { id } = req.params;
    const { nombre, email } = req.body;

    const usuarioAdmin = req.user;

    if (!usuarioAdmin.permisos.includes("ADMINISTRAR_USUARIOS")) {
      return res.status(403).json({
        message: "No autorizado para actualizar usuarios"
      });
    }

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }
    const nombreAnterior = usuario.nombre;
    usuario.nombre = nombre ?? usuario.nombre;
    usuario.email = email ?? usuario.email;

    await usuario.save();
    await registrarAccion({
      id_usuario: usuarioAdmin.id,
      accion: "Actualizó Usuario",
      archivo: usuario.nombre,
      descripcion: `El usuario ${usuarioAdmin.nombre} actualizó el usuario ${nombreAnterior}`
    });

    res.json({
      message: "Usuario actualizado correctamente",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });

  } catch (error) {

    console.error("Error al actualizar usuario:", error);

    res.status(500).json({
      message: "Error al actualizar usuario"
    });

  }
};

export const eliminarUsuario = async (req, res) => {
  try {

    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const nombreEliminado = usuario.nombre;
    const correoEliminado = usuario.email;

    await usuario.destroy();

    await registrarAccion({
      id_usuario: req.user.id,
      accion: "Eliminar usuario",
      archivo: usuario.nombre,
      descripcion: `Se eliminó el usuario ${nombreEliminado} (${correoEliminado})`
    });

    res.json({ message: "Usuario eliminado correctamente" });

  } catch (error) {
    console.error("ERROR AL ELIMINAR USUARIO:", error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
};

export const verificarCorreo = async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({
        ok: false,
        mensaje: "El correo es obligatorio"
      });
    }

    const usuario = await Usuario.findOne({
      where: { email: correo }
    });

    if (!usuario) {
      return res.status(200).json({
        ok: true,
        existe: false
      });
    }

    return res.status(200).json({
      ok: true,
      existe: true
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al verificar el correo"
    });
  }
};

export const obtenerPermisosUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      include: Rol
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    let permisosRol = usuario.Rol?.permisos || [];
    if (typeof permisosRol === "string") {
      permisosRol = JSON.parse(permisosRol);
    }

    let adicionales = usuario.permisosAdicionales || [];
    let denegados = usuario.permisosDenegados || [];

    if (typeof adicionales === "string") adicionales = JSON.parse(adicionales);
    if (typeof denegados === "string") denegados = JSON.parse(denegados);

    let permisosFinales = new Set([...permisosRol, ...adicionales]);
    denegados.forEach(p => permisosFinales.delete(p));

    res.json({
      rolId: usuario.rolId,
      permisosFinales: Array.from(permisosFinales),
      permisosRol
    });

  } catch (error) {
    res.status(500).json({ message: "Error al obtener permisos" });
  }
};

export const actualizarPermisosUsuario = async (req, res) => {
  try {

    const { id } = req.params;
    const { rolId, permisosSeleccionados } = req.body;

    const usuarioAdmin = req.user; // quien hace el cambio

    const usuario = await Usuario.findByPk(id, {
      include: Rol
    });

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const nuevoRol = await Rol.findByPk(rolId);

    if (!nuevoRol) {
      return res.status(400).json({
        message: "Rol inválido"
      });
    }

    let permisosRol = nuevoRol.permisos || [];

    if (typeof permisosRol === "string") {
      permisosRol = JSON.parse(permisosRol);
    }

    const adicionales = permisosSeleccionados.filter(
      p => !permisosRol.includes(p)
    );

    const denegados = permisosRol.filter(
      p => !permisosSeleccionados.includes(p)
    );

    usuario.rolId = rolId;
    usuario.permisosAdicionales = adicionales;
    usuario.permisosDenegados = denegados;

    await usuario.save();

    let permisosFinales = new Set([
      ...permisosRol,
      ...adicionales
    ]);

    denegados.forEach(p => permisosFinales.delete(p));

    permisosFinales = Array.from(permisosFinales);

    const tokenNuevo = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: nuevoRol.nombre,
        email: usuario.email,
        permisos: permisosFinales
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // ✅ REGISTRAR ACTIVIDAD
    await registrarAccion({
      id_usuario: usuarioAdmin.id,
      accion: "Permisos Modificados",
      archivo: usuario.nombre,
      descripcion: `El usuario ${usuarioAdmin.nombre} modificó los permisos de ${usuario.nombre}`
    });

    res.json({
      message: "Permisos actualizados correctamente",
      token: tokenNuevo,
      permisos: permisosFinales
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al actualizar permisos"
    });

  }
};

export const obtenerRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll({
      attributes: ["id", "nombre", "permisos"]
    });

    res.json(roles);

  } catch (error) {
    console.error("Error al obtener roles:", error);
    res.status(500).json({
      message: "Error al obtener roles"
    });
  }
};