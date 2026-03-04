import { Router } from "express";
import {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    toggleEstadoProducto
} from "../controllers/producto.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", listarProductos);
router.get("/:id", obtenerProducto);

// Rutas administrativas protegidas
router.post("/", authMiddleware, crearProducto);
router.put("/:id", authMiddleware, actualizarProducto);
router.patch("/:id/estado", authMiddleware, toggleEstadoProducto);

export default router;
