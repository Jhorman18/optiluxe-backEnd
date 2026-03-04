import express from "express";
import { crearFactura, getEstadisticasVentas } from "../controllers/factura.controllers.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, crearFactura);
router.get("/estadisticas", authMiddleware, getEstadisticasVentas);

export default router;