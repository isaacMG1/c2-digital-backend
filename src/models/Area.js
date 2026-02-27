import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Area = db.define("areas", {
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue("nombre", value.trim().toUpperCase());
    }
  }
}, {
  timestamps: true
});

export default Area;