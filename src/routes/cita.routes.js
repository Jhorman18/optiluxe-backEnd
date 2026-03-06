import { Router } from "express";
import { registrarCita, obtenerMisCitas } from "../controllers/cita.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas protegidas (Requieren authentication)
router.post("/", authMiddleware, registrarCita);
router.get("/mis-citas", authMiddleware, obtenerMisCitas);

export default router;
