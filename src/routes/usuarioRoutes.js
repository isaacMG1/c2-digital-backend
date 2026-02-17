import express from "express";
import { registrarUsuario, loginUsuario, usuarioActual } from "../controllers/usuarioController.js";
import { verifyToken } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/registro", registrarUsuario);
router.post("/login", loginUsuario);

router.get("/me", verifyToken, usuarioActual);


export default router;
