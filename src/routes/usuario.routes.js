import { Router } from "express";
import * as usuarioController from "../controllers/usuario.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, usuarioController.getUsuarios);
router.get("/estadisticas", authMiddleware, usuarioController.getEstadisticasPacientes);
router.patch("/:id/estado", authMiddleware, usuarioController.toggleEstadoUsuario);
router.put("/:id", authMiddleware, usuarioController.editarUsuario);

export default router;
