import { Router } from "express";
import * as soportePagoCtrl from "../controllers/soportePago.controller.js";
import { authMiddleware, isAdmin, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

// Ruta cliente: ver sus propios pedidos
router.get("/mis", authMiddleware, soportePagoCtrl.getMisSoportesPago);

// Rutas staff
router.get("/", authMiddleware, isStaff, soportePagoCtrl.getSoportesPago);
router.get("/estadisticas", authMiddleware, isStaff, soportePagoCtrl.getEstadisticasVentas); // Mantener para dashboard
router.get("/:id", authMiddleware, isStaff, soportePagoCtrl.getSoportePago);
router.post("/", authMiddleware, isStaff, soportePagoCtrl.postSoportePago);
router.put("/:id", authMiddleware, isAdmin, soportePagoCtrl.putSoportePago);
router.patch("/:id/anular", authMiddleware, isAdmin, soportePagoCtrl.patchAnularSoportePago);

export default router;
