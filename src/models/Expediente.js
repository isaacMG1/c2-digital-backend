import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Expediente = db.define("expedientes", {
  titulo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
});

export default Expediente;
