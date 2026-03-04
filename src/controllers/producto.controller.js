import {
  listarProductosService,
  obtenerProductoPorIdService,
  crearProductoService,
  actualizarProductoService,
  cambiarEstadoProductoService,
  buscarProductoPorNombreYCategoriaService
} from "../services/producto.service.js";

export const listarProductos = async (req, res, next) => {
  try {
    const { categoria, busqueda, admin } = req.query;
    const productos = await listarProductosService({
      categoria,
      busqueda,
      admin: admin === 'true'
    });
    return res.status(200).json({ productos });
  } catch (error) {
    next(error);
  }
};

export const obtenerProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await obtenerProductoPorIdService(id);

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json({ producto });
  } catch (error) {
    next(error);
  }
};

export const crearProducto = async (req, res, next) => {
  try {
    const { nombre, categoria } = req.body;

    // Verificar si ya existe un producto con el mismo nombre y categoría
    const existente = await buscarProductoPorNombreYCategoriaService(nombre, categoria);

    if (existente) {
      return res.status(409).json({
        message: "Producto ya existe",
        producto: existente
      });
    }

    const producto = await crearProductoService(req.body);
    res.status(201).json({ message: "Producto creado", producto });
  } catch (error) {
    next(error);
  }
};

export const actualizarProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await actualizarProductoService(id, req.body);
    res.json({ message: "Producto actualizado", producto });
  } catch (error) {
    next(error);
  }
};

export const toggleEstadoProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const producto = await cambiarEstadoProductoService(id, estado);
    res.json({ message: `Producto ${estado.toLowerCase()} correctamente`, producto });
  } catch (error) {
    next(error);
  }
};
