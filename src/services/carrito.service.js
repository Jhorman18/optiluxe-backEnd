import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

function formatCarrito(carrito) {
  const items = carrito.carrito_producto.map((cp) => ({
    idCarritoProducto: cp.idCarritoProducto,
    cantidad: cp.cantidad,
    producto: {
      id: cp.producto.idProducto,
      nombre: cp.producto.proNombre,
      categoria: cp.producto.proCategoria,
      precio: Number(cp.producto.proPrecio),
      imagen: cp.producto.proImagen,
      stock: cp.producto.proStock,
    },
    subtotal: Number(cp.producto.proPrecio) * cp.cantidad,
  }));

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const iva = subtotal * 0.19;

  return {
    idCarrito: carrito.idCarrito,
    items,
    subtotal,
    iva,
    total: subtotal + iva,
    totalItems: items.reduce((acc, i) => acc + i.cantidad, 0),
  };
}

async function getOrCreateCarrito(idUsuario) {
  let carrito = await prisma.carrito.findFirst({
    where: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    include: { carrito_producto: { include: { producto: true } } },
  });

  if (!carrito) {
    carrito = await prisma.carrito.create({
      data: { carEstado: "ACTIVO", fkIdUsuario: idUsuario },
      include: { carrito_producto: { include: { producto: true } } },
    });
  }

  return carrito;
}

export async function getCarritoService(idUsuario) {
  const carrito = await getOrCreateCarrito(idUsuario);
  return formatCarrito(carrito);
}

export async function agregarAlCarritoService(idUsuario, idProducto, cantidad = 1) {
  const producto = await prisma.producto.findUnique({ where: { idProducto } });

  if (!producto || producto.proEstado !== "ACTIVO") {
    throw new HttpError("Producto no disponible", 404);
  }

  const carrito = await getOrCreateCarrito(idUsuario);

  const itemExistente = await prisma.carrito_producto.findUnique({
    where: {
      fkIdCarrito_fkIdProducto: {
        fkIdCarrito: carrito.idCarrito,
        fkIdProducto: idProducto,
      },
    },
  });

  const cantidadFinal = (itemExistente?.cantidad ?? 0) + cantidad;

  if (cantidadFinal > producto.proStock) {
    throw new HttpError(`Solo hay ${producto.proStock} unidades disponibles`, 400);
  }

  await prisma.carrito_producto.upsert({
    where: {
      fkIdCarrito_fkIdProducto: {
        fkIdCarrito: carrito.idCarrito,
        fkIdProducto: idProducto,
      },
    },
    create: { fkIdCarrito: carrito.idCarrito, fkIdProducto: idProducto, cantidad },
    update: { cantidad: cantidadFinal },
  });

  return getCarritoService(idUsuario);
}

export async function actualizarCantidadService(idCarritoProducto, idUsuario, cantidad) {
  const item = await prisma.carrito_producto.findFirst({
    where: {
      idCarritoProducto,
      carrito: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    },
    include: { producto: true },
  });

  if (!item) throw new HttpError("Item no encontrado en tu carrito", 404);

  if (cantidad <= 0) {
    await prisma.carrito_producto.delete({ where: { idCarritoProducto } });
  } else {
    if (cantidad > item.producto.proStock) {
      throw new HttpError(`Solo hay ${item.producto.proStock} unidades disponibles`, 400);
    }
    await prisma.carrito_producto.update({
      where: { idCarritoProducto },
      data: { cantidad },
    });
  }

  return getCarritoService(idUsuario);
}

export async function eliminarItemService(idCarritoProducto, idUsuario) {
  const item = await prisma.carrito_producto.findFirst({
    where: {
      idCarritoProducto,
      carrito: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    },
  });

  if (!item) throw new HttpError("Item no encontrado en tu carrito", 404);

  await prisma.carrito_producto.delete({ where: { idCarritoProducto } });

  return getCarritoService(idUsuario);
}

export async function pagarCarritoService(idUsuario, metodoPago) {
  const carrito = await prisma.carrito.findFirst({
    where: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    include: { carrito_producto: { include: { producto: true } } },
  });

  if (!carrito) throw new HttpError("No tienes un carrito activo", 404);
  if (carrito.carrito_producto.length === 0) throw new HttpError("Tu carrito está vacío", 400);

  const formatted = formatCarrito(carrito);

  const factura = await prisma.factura.create({
    data: {
      facNumero: `FAC-${Date.now()}`,
      facFecha: new Date(),
      facConcepto: "Compra de productos ópticos - OptiLuxe",
      facCondiciones: metodoPago === "PSE" ? "Pago electrónico PSE" : "Pago en efectivo",
      facSubtotal: formatted.subtotal,
      facIva: formatted.iva,
      facTotal: formatted.total,
      fkIdCarrito: carrito.idCarrito,
    },
  });

  await prisma.carrito.update({
    where: { idCarrito: carrito.idCarrito },
    data: { carEstado: "COMPLETADO" },
  });

  return {
    facNumero: factura.facNumero,
    metodoPago,
    subtotal: formatted.subtotal,
    iva: formatted.iva,
    total: formatted.total,
  };
}
