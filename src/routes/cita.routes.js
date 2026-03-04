import { Router } from "express";
import * as citaController from "../controllers/cita.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/proximas", authMiddleware, citaController.getProximasCitas);
router.get("/estadisticas", authMiddleware, citaController.getEstadisticasCitas);

export default router;
