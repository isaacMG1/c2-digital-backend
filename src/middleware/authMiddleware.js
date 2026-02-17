import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado: token faltante" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findByPk(payload.id, {
      attributes: { exclude: ["contraseña"] },
    });
    if (!usuario) return res.status(401).json({ message: "Usuario no encontrado" });

    req.user = usuario; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado", error: error.message });
  }
};
