import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Expediente from "./Expediente.js";

const Archivo = db.define("archivos", {

  nombre_original: {
    type: DataTypes.STRING,
    allowNull: false
  },

  nombre_guardado: {
    type: DataTypes.STRING,
    allowNull: false
  },

  hash_sha256: {
    type: DataTypes.STRING,
    allowNull: false
  },

  tamaño: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  expedienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "expedientes",
      key: "id"
    }
  }

}, {
  timestamps: true
});

Archivo.belongsTo(Expediente, {
  foreignKey: "expedienteId",
  onDelete: "CASCADE"
});

Expediente.hasMany(Archivo, {
  foreignKey: "expedienteId",
  onDelete: "CASCADE"
});

export default Archivo;