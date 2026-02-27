import express from "express";
import { registrarUsuario, obtenerRoles , loginUsuario, usuarioActual, enviarCodigoReset, verificarCodigo, cambiarPassword, obtenerUsuarios, actualizarUsuario, eliminarUsuario, verificarCorreo, obtenerPermisosUsuario, actualizarPermisosUsuario } from "../controllers/usuarioController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { PERMISOS } from "../utils/permisos.js";


const router = express.Router();

router.post("/registro", registrarUsuario);
router.post("/login", loginUsuario);
router.get("/", verifyToken, requirePermission(PERMISOS.ADMINISTRAR_USUARIOS), obtenerUsuarios);
router.get("/me", verifyToken, usuarioActual);
router.post("/enviar-codigo", enviarCodigoReset);
router.post("/verificar-codigo", verificarCodigo);
router.post("/cambiar-password", cambiarPassword);
router.put("/:id", verifyToken,requirePermission(PERMISOS.ADMINISTRAR_USUARIOS), actualizarUsuario);
router.delete("/:id", verifyToken, requirePermission(PERMISOS.ADMINISTRAR_USUARIOS), eliminarUsuario);
router.post('/verificar-correo', verificarCorreo);
router.put("/:id/permisos", verifyToken, requirePermission(PERMISOS.ADMINISTRAR_USUARIOS), actualizarPermisosUsuario);
router.get("/:id/permisos", verifyToken, requirePermission(PERMISOS.ADMINISTRAR_USUARIOS), obtenerPermisosUsuario);
router.get("/roles", verifyToken, requirePermission(PERMISOS.ADMINISTRAR_USUARIOS), obtenerRoles);
export default router;
