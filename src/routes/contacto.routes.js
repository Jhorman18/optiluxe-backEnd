import { Router } from "express";
import {
    crearMensaje,
    obtenerMensajes,
    actualizarEstadoMensaje,
    responderMensaje
} from "../controllers/contacto.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Ruta pública para enviar mensajes
router.post("/", crearMensaje);

// Rutas protegidas para administración
router.get("/", authMiddleware, obtenerMensajes);
router.patch("/:id/estado", authMiddleware, actualizarEstadoMensaje);
router.post("/:id/responder", authMiddleware, responderMensaje);

export default router;
