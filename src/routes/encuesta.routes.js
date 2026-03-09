import { Router } from "express";
import {
  obtenerPreguntas,
  crearEncuesta
} from "../controllers/encuesta.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/preguntas", obtenerPreguntas);
router.post("/", authMiddleware, crearEncuesta);

export default router;
