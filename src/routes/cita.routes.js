import { Router } from "express";
import {
  getHorariosOcupados,
  getProximasCitas,
  getEstadisticasCitas,
  registrarCita,
  getMisCitas,
  tieneCitaActiva,
  getAllCitasAdmin,
  actualizarEstadoCita,
  reprogramarCita,
  crearCitaAdmin,
  registrarPagoCita,
} from "../controllers/cita.controller.js";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Público: consultar disponibilidad
router.get("/horarios-ocupados", getHorariosOcupados);

// Autenticados: dashboard admin
router.get("/proximas", authMiddleware, getProximasCitas);
router.get("/estadisticas", authMiddleware, getEstadisticasCitas);

// Autenticados: panel admin — gestión completa de citas
router.post("/admin", authMiddleware, isAdmin, crearCitaAdmin);
router.get("/admin/todas", authMiddleware, getAllCitasAdmin);
router.patch("/:id/estado", authMiddleware, actualizarEstadoCita);
router.patch("/:id/reprogramar", authMiddleware, reprogramarCita);
router.post("/:id/pago", authMiddleware, isAdmin, registrarPagoCita);

// Autenticados: panel del cliente
router.get("/mis-citas", authMiddleware, getMisCitas);
router.get("/tiene-activa", authMiddleware, tieneCitaActiva);

// Autenticados: agendar cita
router.post("/", authMiddleware, registrarCita);

export default router;
