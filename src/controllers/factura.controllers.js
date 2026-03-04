import { crearFacturaService, obtenerVentasMesService } from "../services/factura.service.js";

export async function crearFactura(req, res, next) {
  try {
    const result = await crearFacturaService(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getEstadisticasVentas(req, res, next) {
  try {
    const total = await obtenerVentasMesService();
    res.json({ total });
  } catch (error) {
    next(error);
  }
}
