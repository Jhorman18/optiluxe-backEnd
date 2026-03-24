import { Router } from "express";
import {
  obtenerPreguntas,
  crearEncuesta,
  getEncuestas,
  getEncuesta,
  deleteEncuesta
} from "../controllers/encuesta.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas/usuario
router.get("/preguntas", obtenerPreguntas);
router.post("/", authMiddleware, crearEncuesta);

// Rutas administrativas
router.get("/", authMiddleware, getEncuestas);
router.get("/:id", authMiddleware, getEncuesta);
router.delete("/:id", authMiddleware, deleteEncuesta);

export default router;
