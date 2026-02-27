import Rol from "../models/Rol.js";

export const requirePermission = (permisoRequerido) => {
  return (req, res, next) => {
    try {
      const usuario = req.user;

      if (!usuario.permisos || !usuario.permisos.includes(permisoRequerido)) {
        return res.status(403).json({
          message: "No tienes permisos para realizar esta acción",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};