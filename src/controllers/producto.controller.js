import { listarProductosService } from "../services/producto.service.js";

export const listarProductos = async (req, res, next) => {
  try {
    const { categoria, busqueda } = req.query;
    const productos = await listarProductosService({ categoria, busqueda });
    return res.status(200).json({ productos });
  } catch (error) {
    next(error);
  }
};
