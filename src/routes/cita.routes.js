import { Router } from "express";
import * as citaController from "../controllers/cita.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Público: consultar disponibilidad
router.get("/horarios-ocupados", citaController.getHorariosOcupados);

// Autenticados: dashboard admin
router.get("/proximas", authMiddleware, citaController.getProximasCitas);
router.get("/estadisticas", authMiddleware, citaController.getEstadisticasCitas);

// Autenticados: panel del cliente
router.get("/mis-citas", authMiddleware, citaController.getMisCitas);
router.get("/tiene-activa", authMiddleware, citaController.tieneCitaActiva);

// Autenticados: agendar cita
router.post("/", authMiddleware, citaController.registrarCita);

export default router;
