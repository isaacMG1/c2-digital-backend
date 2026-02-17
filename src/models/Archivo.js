import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Expediente from "./Expediente.js";

const Archivo = db.define("Archivo", {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING, // pdf, jpg
    allowNull: false,
  },
});

Archivo.belongsTo(Expediente, {
  foreignKey: "expedienteId",
  onDelete: "CASCADE",
});

Expediente.hasMany(Archivo, {
  foreignKey: "expedienteId",
});

export default Archivo;
