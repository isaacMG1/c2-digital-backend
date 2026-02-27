import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Rol = db.define("Rol", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  permisos: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
});

export default Rol;