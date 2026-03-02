import { crearFacturaService } from "../services/factura.service.js";

export async function crearFactura(req, res, next) {
  try {
    const result = await crearFacturaService(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}