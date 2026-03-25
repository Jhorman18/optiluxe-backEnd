import { Router } from "express";
import {
  obtenerPreguntas,
  crearEncuesta,
  getEncuestas,
  getEncuesta,
  deleteEncuesta,
  obtenerPreguntasAdmin,
  crearPregunta,
  actualizarPregunta,
  togglePregunta
} from "../controllers/encuesta.controller.js";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas/usuario
router.get("/preguntas", obtenerPreguntas);
router.post("/", authMiddleware, crearEncuesta);

// Rutas admin — Preguntas
router.get("/preguntas/admin", authMiddleware, isAdmin, obtenerPreguntasAdmin);
router.post("/preguntas", authMiddleware, isAdmin, crearPregunta);
router.put("/preguntas/:id", authMiddleware, isAdmin, actualizarPregunta);
router.patch("/preguntas/:id/toggle", authMiddleware, isAdmin, togglePregunta);

// Rutas administrativas — Encuestas
router.get("/", authMiddleware, getEncuestas);
router.get("/:id", authMiddleware, getEncuesta);
router.delete("/:id", authMiddleware, deleteEncuesta);

export default router;
