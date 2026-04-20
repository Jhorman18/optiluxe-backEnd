import { Router } from "express";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";
import { getServicios, postServicio, putServicio } from "../controllers/servicio.controller.js";

const router = Router();

// El listado es público (para agendamiento), pero edición es de admin
router.get("/", getServicios);
router.post("/", authMiddleware, isAdmin, postServicio);
router.put("/:id", authMiddleware, isAdmin, putServicio);

export default router;
