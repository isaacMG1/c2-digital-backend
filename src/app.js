import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";
import "./models/Usuario.js";
import "./models/Expediente.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import expedienteRoutes from "./routes/expedienteRoutes.js";
import "./models/Archivo.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/expedientes", expedienteRoutes);


(async () => {
  try {
    await db.authenticate();
    console.log("Conexión a la base de datos establecida correctamente.");

    // Crea o actualiza las tablas
    await db.sync({ alter: true });
    console.log("Tablas creadas o actualizadas correctamente.");
  } catch (error) {
    console.error("Error al conectar con la base de datos:", error);
  }
})();


app.get("/", (req, res) => {
  res.json({ message: "Servidor C2 DIGITAL BACK-END funcionando correctamente " });
});

const PORT = process.env.PORT || 3000;
app.use("/api/usuarios", usuarioRoutes);
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
