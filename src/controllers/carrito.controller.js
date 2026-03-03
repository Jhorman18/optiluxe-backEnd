import {
  getCarritoService,
  agregarAlCarritoService,
  actualizarCantidadService,
  eliminarItemService,
  pagarCarritoService,
} from "../services/carrito.service.js";

export const getCarrito = async (req, res, next) => {
  try {
    const carrito = await getCarritoService(req.usuario.idUsuario);
    return res.status(200).json(carrito);
  } catch (error) {
    next(error);
  }
};

export const agregarAlCarrito = async (req, res, next) => {
  try {
    const { idProducto, cantidad = 1 } = req.body;
    const carrito = await agregarAlCarritoService(req.usuario.idUsuario, idProducto, cantidad);
    return res.status(200).json(carrito);
  } catch (error) {
    next(error);
  }
};

export const actualizarCantidad = async (req, res, next) => {
  try {
    const idCarritoProducto = Number(req.params.id);
    const { cantidad } = req.body;
    const carrito = await actualizarCantidadService(idCarritoProducto, req.usuario.idUsuario, cantidad);
    return res.status(200).json(carrito);
  } catch (error) {
    next(error);
  }
};

export const eliminarItem = async (req, res, next) => {
  try {
    const idCarritoProducto = Number(req.params.id);
    const carrito = await eliminarItemService(idCarritoProducto, req.usuario.idUsuario);
    return res.status(200).json(carrito);
  } catch (error) {
    next(error);
  }
};

export const pagarCarrito = async (req, res, next) => {
  try {
    const { metodoPago } = req.body;
    if (!metodoPago || !["PSE", "EFECTIVO"].includes(metodoPago)) {
      return res.status(400).json({ message: "Método de pago inválido" });
    }
    const resultado = await pagarCarritoService(req.usuario.idUsuario, metodoPago);
    return res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};
