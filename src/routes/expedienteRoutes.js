import express from "express";
import multer from "multer";
import {
  crearExpediente,
  obtenerExpedientes,
  editarExpediente,
  eliminarExpediente,
  descargarArchivo,
  obtenerPorClave,
  buscarExpedientes,
  archivarExpediente,
  restaurarExpediente,
  buscarExpedientesAdmin
} from "../controllers/expedienteController.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { PERMISOS } from "../utils/permisos.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });
router.get("/buscar", verifyToken, requirePermission(PERMISOS.BUSCAR_ARCHIVO), buscarExpedientes);
router.post("/", verifyToken, requirePermission(PERMISOS.CREAR_EXPEDIENTE), upload.single("archivo"), crearExpediente);
router.get("/clave/:clave", verifyToken,requirePermission(PERMISOS.BUSCAR_ARCHIVO), obtenerPorClave);
router.get("/",verifyToken, requirePermission(PERMISOS.BUSCAR_ARCHIVO), obtenerExpedientes);
router.put("/clave/:clave",verifyToken,requirePermission(PERMISOS.ACTUALIZAR_ARCHIVO), upload.single("archivo"),editarExpediente);
router.delete("/clave/:clave", verifyToken,requirePermission(PERMISOS.ELIMINAR_ARCHIVO), eliminarExpediente);
router.get("/descargar/:id", verifyToken, requirePermission(PERMISOS.BUSCAR_ARCHIVO), descargarArchivo);
router.put("/archivar/:id", verifyToken, requirePermission(PERMISOS.ARCHIVAR_DOCUMENTO), archivarExpediente);
router.put("/restaurar/:id", verifyToken, requirePermission(PERMISOS.RESTAURAR_DOCUMENTO),restaurarExpediente);
router.get("/buscar-todos", verifyToken, requirePermission(PERMISOS.BUSCAR_ARCHIVO),buscarExpedientesAdmin);

export default router;
