import express from "express";
import { crearFactura } from "../controllers/factura.controllers.js";

const router = express.Router();

router.post("/", crearFactura);

export default router;