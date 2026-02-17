import express from "express";
import {
  crearExpediente,
  obtenerExpedientes,
  editarExpediente,
  eliminarExpediente
} from "../controllers/expedienteController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, crearExpediente);
router.get("/", verifyToken, obtenerExpedientes);


router.put("/:id", verifyToken, editarExpediente);


router.delete("/:id", verifyToken, eliminarExpediente);

export default router;
