import Expediente from "../models/Expediente.js";

// Crear expediente
export const crearExpediente = async (req, res) => {
  try {
    const { titulo, descripcion } = req.body;

    const nuevoExpediente = await Expediente.create({
      titulo,
      descripcion,
      usuarioId: req.user.id
    });

    res.json({
      message: "Expediente creado correctamente",
      expediente: nuevoExpediente
    });

  } catch (error) {
    res.status(500).json({
      message: "Error al crear expediente",
      error
    });
  }
};

// Obtener todos los expedientes del usuario logueado
export const obtenerExpedientes = async (req, res) => {
  try {
    const expedientes = await Expediente.findAll({
      where: { usuarioId: req.user.id },
      order: [["createdAt", "DESC"]]
    });

    res.json({ expedientes });

  } catch (error) {
    res.status(500).json({
      message: "Error al obtener expedientes",
      error
    });
  }
};
// Editar expediente
export const editarExpediente = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion } = req.body;

    const expediente = await Expediente.findOne({
      where: { id, usuarioId: req.user.id }
    });

    if (!expediente) {
      return res.status(404).json({ message: "Expediente no encontrado" });
    }

    expediente.titulo = titulo;
    expediente.descripcion = descripcion;
    await expediente.save();

    res.json({
      message: "Expediente actualizado correctamente",
      expediente
    });

  } catch (error) {
    res.status(500).json({
      message: "Error al editar expediente",
      error
    });
  }
};

// Eliminar expediente
export const eliminarExpediente = async (req, res) => {
  try {
    const { id } = req.params;

    const expediente = await Expediente.findOne({
      where: { id, usuarioId: req.user.id }
    });

    if (!expediente) {
      return res.status(404).json({ message: "Expediente no encontrado" });
    }

    await expediente.destroy();

    res.json({ message: "Expediente eliminado correctamente" });

  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar expediente",
      error
    });
  }
};
