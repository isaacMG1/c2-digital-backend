import express from "express";
import { obtenerHistorial } from "../controllers/historialController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", verifyToken, obtenerHistorial);
export default router;