import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Area from "./Area.js";

const Expediente = db.define("expedientes", {

  id_area: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "areas",
      key: "id"
    }
  },

  asunto: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },

  clave: {
    type: DataTypes.STRING(30),
  },

  caja: DataTypes.INTEGER,
  legajo: DataTypes.INTEGER,

  fec_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  fec_termino: DataTypes.DATEONLY,
  n_hojas: DataTypes.INTEGER,
  observaciones: DataTypes.TEXT,

  archivo_original: {
    type: DataTypes.STRING,
    allowNull: true
  },

  archivo_guardado: {
    type: DataTypes.STRING,
    allowNull: true
  },

  hash_sha256: {
    type: DataTypes.STRING,
    allowNull: true
  },

  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  archivado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  fecha_archivado: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  archivado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  }


}, {
  timestamps: true
});

Area.hasMany(Expediente, {
  foreignKey: "id_area",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE"
});

Expediente.belongsTo(Area, {
  foreignKey: "id_area"
});

export default Expediente;