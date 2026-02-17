import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

// Crear base si no existe
const createDatabaseIfNotExists = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log("Base de datos verificada o creada correctamente.");
    await connection.end();
  } catch (error) {
    console.error("Error al verificar o crear la base de datos:", error);
  }
};

await createDatabaseIfNotExists();

// Conexión principal
const db = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
  }
);

export default db;
