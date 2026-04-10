import { Router } from "express";
import {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    toggleEstadoProducto
} from "../controllers/producto.controller.js";
import { authMiddleware, isAdmin, isStaff } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas lectura protegidas para Personal
router.get("/", authMiddleware, isStaff, listarProductos);
router.get("/:id", authMiddleware, isStaff, obtenerProducto);

// Rutas administrativas protegidas
router.post("/", authMiddleware, isAdmin, crearProducto); // Solo Admin crea
router.put("/:id", authMiddleware, isStaff, actualizarProducto); // Staff puede editar
router.patch("/:id/estado", authMiddleware, isStaff, toggleEstadoProducto);

export default router;
