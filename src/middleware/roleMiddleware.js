export const verificarRol = (rolPermitido) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        message: "No autenticado"
      });
    }

    if (req.user.rol !== rolPermitido) {
      return res.status(403).json({
        message: "No tienes permisos para esta acción"
      });
    }

    next();
  };
};