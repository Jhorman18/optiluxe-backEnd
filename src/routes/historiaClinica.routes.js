import { Router } from "express";
import { authMiddleware, isStaff } from "../middlewares/auth.middleware.js";
import {
  crearHistoriaClinica,
  listarHistoriasClinicas,
  obtenerHistoriaPorCita,
  obtenerHistoria,
} from "../controllers/historiaClinica.controller.js";

const router = Router();

router.use(authMiddleware, isStaff);

router.get("/", listarHistoriasClinicas);
router.get("/:id", obtenerHistoria);
router.get("/cita/:idCita", obtenerHistoriaPorCita);
router.post("/cita/:idCita", crearHistoriaClinica);

export default router;
