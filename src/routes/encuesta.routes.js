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
import { authMiddleware, isAdmin, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas/usuario
router.get("/preguntas", obtenerPreguntas);
router.post("/", authMiddleware, crearEncuesta);

// Rutas administrativas — Preguntas
router.get("/preguntas/admin", authMiddleware, isStaff, obtenerPreguntasAdmin);
router.post("/preguntas", authMiddleware, isAdmin, crearPregunta);
router.put("/preguntas/:id", authMiddleware, isAdmin, actualizarPregunta);
router.patch("/preguntas/:id/toggle", authMiddleware, isAdmin, togglePregunta);

// Rutas administrativas — Encuestas (Registros)
router.get("/", authMiddleware, isStaff, getEncuestas);
router.get("/:id", authMiddleware, isStaff, getEncuesta);
router.delete("/:id", authMiddleware, isAdmin, deleteEncuesta);

export default router;
