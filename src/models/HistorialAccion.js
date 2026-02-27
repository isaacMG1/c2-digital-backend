import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Usuario from "./Usuario.js";

const HistorialAccion = db.define("historial_acciones", {

  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "usuarios",
      key: "id"
    }
  },

  accion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  archivo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }

}, {
  timestamps: true
});

HistorialAccion.belongsTo(Usuario, {
  foreignKey: "id_usuario"
});

Usuario.hasMany(HistorialAccion, {
  foreignKey: "id_usuario"
});

export default HistorialAccion;