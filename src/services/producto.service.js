import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

export async function listarProductosService({ categoria, busqueda, admin = false } = {}) {
  const where = {};

  if (!admin) {
    where.proEstado = "ACTIVO";
  }

  if (categoria) {
    where.categoria = { catNombre: categoria };
  }

  if (busqueda) {
    where.proNombre = { contains: busqueda, mode: "insensitive" };
  }

  const productos = await prisma.producto.findMany({
    where,
    include: { categoria: true },
    orderBy: { proNombre: "asc" },
  });

  return productos.map((p) => ({
    id: p.idProducto,
    nombre: p.proNombre,
    descripcion: p.proDescripcion,
    categoria: p.categoria.catNombre,
    idCategoria: p.fkIdCategoria,
    precio: Number(p.proPrecio),
    stock: p.proStock,
    estado: p.proEstado,
    imagen: p.proImagen,
  }));
}

export async function obtenerProductoPorIdService(id) {
  const producto = await prisma.producto.findUnique({
    where: { idProducto: parseInt(id) },
    include: { categoria: true },
  });

  if (!producto) return null;

  return {
    id: producto.idProducto,
    nombre: producto.proNombre,
    descripcion: producto.proDescripcion,
    categoria: producto.categoria.catNombre,
    idCategoria: producto.fkIdCategoria,
    precio: Number(producto.proPrecio),
    stock: producto.proStock,
    estado: producto.proEstado,
    imagen: producto.proImagen,
  };
}

export async function buscarProductoPorNombreYCategoriaService(nombre, idCategoria) {
  const producto = await prisma.producto.findFirst({
    where: {
      proNombre: { equals: nombre, mode: "insensitive" },
      fkIdCategoria: parseInt(idCategoria),
    },
    include: { categoria: true },
  });

  if (!producto) return null;

  return {
    id: producto.idProducto,
    nombre: producto.proNombre,
    stock: producto.proStock,
    precio: Number(producto.proPrecio),
    categoria: producto.categoria.catNombre,
    idCategoria: producto.fkIdCategoria,
  };
}

export async function crearProductoService(data) {
  const existente = await prisma.producto.findFirst({
    where: {
      proNombre: { equals: data.nombre, mode: "insensitive" },
      fkIdCategoria: parseInt(data.idCategoria),
    },
  });
  if (existente) {
    throw new HttpError("Ya existe un producto con ese nombre en esta categoría.", 409);
  }

  return await prisma.producto.create({
    data: {
      proNombre: data.nombre,
      proDescripcion: data.descripcion,
      categoria: { connect: { idCategoria: parseInt(data.idCategoria) } },
      proPrecio: parseFloat(data.precio),
      proStock: parseInt(data.stock),
      proEstado: "ACTIVO",
      proImagen: data.imagen,
    },
    include: { categoria: true },
  });
}

export async function actualizarProductoService(id, data) {
  return await prisma.producto.update({
    where: { idProducto: parseInt(id) },
    data: {
      proNombre: data.nombre,
      proDescripcion: data.descripcion,
      categoria: data.idCategoria ? { connect: { idCategoria: parseInt(data.idCategoria) } } : undefined,
      proPrecio: data.precio ? parseFloat(data.precio) : undefined,
      proStock: data.stock !== undefined ? parseInt(data.stock) : undefined,
      proImagen: data.imagen,
    },
    include: { categoria: true },
  });
}

export async function cambiarEstadoProductoService(id, nuevoEstado) {
  return await prisma.producto.update({
    where: { idProducto: parseInt(id) },
    data: { proEstado: nuevoEstado },
  });
}
