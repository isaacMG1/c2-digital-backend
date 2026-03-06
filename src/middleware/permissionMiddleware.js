import Rol from "../models/Rol.js";

export const requirePermission = (permiso) => {
  return (req, res, next) => {

    if (!req.user || !req.user.permisos) {
      return res.status(401).json({
        message: "No autenticado"
      });
    }

    if (!req.user.permisos.includes(permiso)) {
      return res.status(403).json({
        message: "No tienes permiso para realizar esta acción"
      });
    }

    next();
  };
};
