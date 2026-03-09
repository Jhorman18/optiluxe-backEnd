import { Router } from "express";
import {
  getHorariosOcupados,
  getProximasCitas,
  getEstadisticasCitas,
  registrarCita,
  getMisCitas,
  tieneCitaActiva,
} from "../controllers/cita.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Público: consultar disponibilidad
router.get("/horarios-ocupados", getHorariosOcupados);

// Autenticados: dashboard admin
router.get("/proximas", authMiddleware, getProximasCitas);
router.get("/estadisticas", authMiddleware, getEstadisticasCitas);

// Autenticados: panel del cliente
router.get("/mis-citas", authMiddleware, getMisCitas);
router.get("/tiene-activa", authMiddleware, tieneCitaActiva);

// Autenticados: agendar cita
router.post("/", authMiddleware, registrarCita);

export default router;
