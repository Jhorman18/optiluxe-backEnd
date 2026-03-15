import { Router } from "express";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";
import {
  crearHistoriaClinica,
  listarHistoriasClinicas,
  obtenerHistoriaPorCita,
  obtenerHistoria,
} from "../controllers/historiaClinica.controller.js";

const router = Router();

router.use(authMiddleware, isAdmin);

router.get("/", listarHistoriasClinicas);
router.get("/:id", obtenerHistoria);
router.get("/cita/:idCita", obtenerHistoriaPorCita);
router.post("/cita/:idCita", crearHistoriaClinica);

export default router;
