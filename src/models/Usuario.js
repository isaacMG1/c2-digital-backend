import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Rol from "./Rol.js";

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
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  permisosAdicionales: {
  type: DataTypes.JSON,
  allowNull: true,
  },

  permisosDenegados: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  resetCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  resetCodeExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

Usuario.belongsTo(Rol, { foreignKey: "rolId" });
Rol.hasMany(Usuario, { foreignKey: "rolId" });

export default Usuario;