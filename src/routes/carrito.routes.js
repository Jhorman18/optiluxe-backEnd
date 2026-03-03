import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  eliminarItem,
  pagarCarrito,
} from "../controllers/carrito.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getCarrito);
router.post("/agregar", agregarAlCarrito);
router.post("/pagar", pagarCarrito);
router.put("/item/:id", actualizarCantidad);
router.delete("/item/:id", eliminarItem);

export default router;
