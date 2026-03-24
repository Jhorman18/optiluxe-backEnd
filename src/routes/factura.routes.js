import { Router } from "express";
import * as facturaCtrl from "../controllers/factura.controller.js";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas protegidas para Administrador
router.get("/", authMiddleware, isAdmin, facturaCtrl.getFacturas);
router.get("/estadisticas", authMiddleware, facturaCtrl.getEstadisticasVentas); // Mantener para dashboard
router.get("/:id", authMiddleware, isAdmin, facturaCtrl.getFactura);
router.post("/", authMiddleware, isAdmin, facturaCtrl.postFactura);
router.put("/:id", authMiddleware, isAdmin, facturaCtrl.putFactura);
router.patch("/:id/anular", authMiddleware, isAdmin, facturaCtrl.patchAnularFactura);

export default router;