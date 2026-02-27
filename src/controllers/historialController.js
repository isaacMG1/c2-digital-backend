import HistorialAccion from "../models/HistorialAccion.js";
import Usuario from "../models/Usuario.js";
import Rol from "../models/Rol.js";

export const registrarAccion = async ({
  id_usuario,
  accion,
  archivo = null,
  descripcion = null
}) => {

  try {

    await HistorialAccion.create({
      id_usuario,
      accion,
      archivo,
      descripcion
    });

  } catch (error) {
    console.error("Error al registrar acción:", error);
  }

};

export const obtenerHistorial = async (req, res) => {

  try {

    const historial = await HistorialAccion.findAll({

      include: [{
        model: Usuario,
        attributes: ["id", "nombre", "email"],
        include: [{
          model: Rol,
          attributes: ["nombre"]
        }]
      }],

      order: [["createdAt", "DESC"]]

    });

    res.json(historial);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener historial"
    });

  }

};

