import { Router } from "express";
import { 
  registrarNotificacion, 
  obtenerNotificaciones, 
  eliminarNotificacion,
  obtenerMisNotificaciones,
  marcarLeida
} from "../controllers/notificacion.controller.js";
import { authMiddleware, isAdmin, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

// --- RUTAS DE USUARIO (CLIENTE/PACIENTE) ---
router.get("/mis-notificaciones", authMiddleware, obtenerMisNotificaciones);
router.patch("/:id/leer", authMiddleware, marcarLeida);

// --- RUTAS DE PERSONAL AUTORIZADO ---
router.post("/", authMiddleware, isStaff, registrarNotificacion);
router.get("/", authMiddleware, isStaff, obtenerNotificaciones);
router.delete("/:id", authMiddleware, isStaff, eliminarNotificacion);

export default router;
