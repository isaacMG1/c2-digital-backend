import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Usuario = db.define("Usuario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  contraseña: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM("admin", "usuario"),
    allowNull: false,
    defaultValue: "usuario",
  },
});

export default Usuario;
