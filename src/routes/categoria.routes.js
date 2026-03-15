import { Router } from "express";
import { listarCategorias, listarTodasCategorias, crearCategoria, actualizarCategoria } from "../controllers/categoria.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", listarCategorias);
router.get("/admin", authMiddleware, listarTodasCategorias);
router.post("/", authMiddleware, crearCategoria);
router.patch("/:id", authMiddleware, actualizarCategoria);

export default router;
