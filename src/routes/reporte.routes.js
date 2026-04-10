import { Router } from "express";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";
import { 
    getReporteVentas, 
    getReporteInventario, 
    getReporteCitas 
} from "../controllers/reporte.controller.js";

const router = Router();

// Todas las rutas de reportes requieren ser administrador
router.use(authMiddleware, isAdmin);

router.get("/ventas", getReporteVentas);
router.get("/inventario", getReporteInventario);
router.get("/citas", getReporteCitas);

export default router;
