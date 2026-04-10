import { Router } from "express";
import { listarCategorias, listarTodasCategorias, crearCategoria, actualizarCategoria } from "../controllers/categoria.controller.js";
import { authMiddleware, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, isStaff, listarCategorias);
router.get("/admin", authMiddleware, isStaff, listarTodasCategorias);
router.post("/", authMiddleware, isStaff, crearCategoria);
router.patch("/:id", authMiddleware, isStaff, actualizarCategoria);

export default router;
