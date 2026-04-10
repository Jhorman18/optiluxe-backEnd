import { Router } from "express";
import * as usuarioController from "../controllers/usuario.controller.js";
import { authMiddleware, isAdmin, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, isStaff, usuarioController.getUsuarios);
router.get("/estadisticas", authMiddleware, isStaff, usuarioController.getEstadisticasPacientes);
router.post("/", authMiddleware, isStaff, usuarioController.crearUsuario);
router.patch("/:id/estado", authMiddleware, isAdmin, usuarioController.toggleEstadoUsuario);
router.put("/:id", authMiddleware, isAdmin, usuarioController.editarUsuario);

export default router;
