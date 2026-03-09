import { Router } from "express";
import { 
  registrarNotificacion, 
  obtenerNotificaciones, 
  eliminarNotificacion,
  obtenerMisNotificaciones,
  marcarLeida
} from "../controllers/notificacion.controller.js";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// --- RUTAS DE USUARIO (CLIENTE/PACIENTE) ---
router.get("/mis-notificaciones", authMiddleware, obtenerMisNotificaciones);
router.patch("/:id/leer", authMiddleware, marcarLeida);

// --- RUTAS DE ADMINISTRADOR ---
router.post("/", authMiddleware, isAdmin, registrarNotificacion);
router.get("/", authMiddleware, isAdmin, obtenerNotificaciones);
router.delete("/:id", authMiddleware, isAdmin, eliminarNotificacion);

export default router;
