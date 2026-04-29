import { Router } from "express";
import * as facturaCtrl from "../controllers/factura.controller.js";
import { authMiddleware, isAdmin, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

// Ruta cliente: ver sus propios pedidos
router.get("/mis", authMiddleware, facturaCtrl.getMisFacturas);

// Rutas staff
router.get("/", authMiddleware, isStaff, facturaCtrl.getFacturas);
router.get("/estadisticas", authMiddleware, isStaff, facturaCtrl.getEstadisticasVentas); // Mantener para dashboard
router.get("/:id", authMiddleware, isStaff, facturaCtrl.getFactura);
router.post("/", authMiddleware, isStaff, facturaCtrl.postFactura);
router.put("/:id", authMiddleware, isAdmin, facturaCtrl.putFactura);
router.patch("/:id/anular", authMiddleware, isAdmin, facturaCtrl.patchAnularFactura);

export default router;