import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";
import Rol from "../models/Rol.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado: token faltante" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findByPk(payload.id, {
      include: Rol
    });

    if (!usuario) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    let permisosRol = [];
    if (usuario.Rol && usuario.Rol.permisos) {
      permisosRol = JSON.parse(usuario.Rol.permisos);
    }

    // 🔥 Combinar permisos
    const permisosAdicionales = usuario.permisosAdicionales || [];
    const permisosDenegados = usuario.permisosDenegados || [];

    const permisosFinales = permisosRol
      .concat(permisosAdicionales)
      .filter(p => !permisosDenegados.includes(p));

    req.user = {
      id: usuario.id,
      rolId: usuario.rolId,
      rolNombre: usuario.Rol?.nombre,
      permisos: permisosFinales
    };

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
      error: error.message,
    });
  }
};