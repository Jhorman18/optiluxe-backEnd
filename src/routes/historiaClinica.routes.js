import { Router } from "express";
import { authMiddleware, isStaff, isAdmin } from "../middlewares/auth.middleware.js";
import {
  crearHistoriaClinica,
  listarHistoriasClinicas,
  obtenerHistoriaPorCita,
  obtenerHistoria,
  listarMisHistorias,
  actualizarHistoria,
  eliminarHistoria,
} from "../controllers/historiaClinica.controller.js";

const router = Router();

// Ruta cliente: ver sus propias historias
router.get("/mis", authMiddleware, listarMisHistorias);

// Rutas staff
router.get("/", authMiddleware, isStaff, listarHistoriasClinicas);
router.get("/cita/:idCita", authMiddleware, isStaff, obtenerHistoriaPorCita);
router.post("/cita/:idCita", authMiddleware, isStaff, crearHistoriaClinica);
router.get("/:id", authMiddleware, isStaff, obtenerHistoria);

// Rutas admin: editar y eliminar
router.put("/:id", authMiddleware, isAdmin, actualizarHistoria);
router.delete("/:id", authMiddleware, isAdmin, eliminarHistoria);

export default router;
