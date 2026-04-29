import { Router } from "express";
import {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    toggleEstadoProducto
} from "../controllers/producto.controller.js";
import { authMiddleware, isAdmin, isStaff, optionalAuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas de lectura (admin=true solo funciona si el token es de staff)
router.get("/", optionalAuthMiddleware, listarProductos);
router.get("/:id", optionalAuthMiddleware, obtenerProducto);

// Rutas administrativas protegidas
router.post("/", authMiddleware, isAdmin, crearProducto); // Solo Admin crea
router.put("/:id", authMiddleware, isStaff, actualizarProducto); // Staff puede editar
router.patch("/:id/estado", authMiddleware, isStaff, toggleEstadoProducto);

export default router;
