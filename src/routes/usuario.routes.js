import { Router } from "express";
import * as usuarioController from "../controllers/usuario.controller.js";
import { authMiddleware, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authMiddleware, isAdmin, usuarioController.crearUsuario);
router.get("/", authMiddleware, usuarioController.getUsuarios);
router.get("/estadisticas", authMiddleware, usuarioController.getEstadisticasPacientes);
router.patch("/:id/estado", authMiddleware, usuarioController.toggleEstadoUsuario);
router.put("/:id", authMiddleware, usuarioController.editarUsuario);

export default router;
