import prisma from "../config/prisma.js";

export async function listarProductosService({ categoria, busqueda, admin = false } = {}) {
  const where = {};

  if (!admin) {
    where.proEstado = "ACTIVO";
  }

  if (categoria) {
    where.proCategoria = categoria;
  }

  if (busqueda) {
    where.proNombre = { contains: busqueda, mode: "insensitive" };
  }

  const productos = await prisma.producto.findMany({
    where,
    orderBy: { proNombre: "asc" },
  });

  return productos.map((p) => ({
    id: p.idProducto,
    nombre: p.proNombre,
    descripcion: p.proDescripcion,
    categoria: p.proCategoria,
    precio: Number(p.proPrecio),
    stock: p.proStock,
    estado: p.proEstado,
    imagen: p.proImagen,
  }));
}

export async function obtenerProductoPorIdService(id) {
  const producto = await prisma.producto.findUnique({
    where: { idProducto: parseInt(id) },
  });

  if (!producto) return null;

  return {
    id: producto.idProducto,
    nombre: producto.proNombre,
    descripcion: producto.proDescripcion,
    categoria: producto.proCategoria,
    precio: Number(producto.proPrecio),
    stock: producto.proStock,
    estado: producto.proEstado,
    imagen: producto.proImagen,
  };
}

export async function buscarProductoPorNombreYCategoriaService(nombre, categoria) {
  const producto = await prisma.producto.findFirst({
    where: {
      proNombre: { equals: nombre, mode: "insensitive" },
      proCategoria: categoria
    }
  });

  if (!producto) return null;

  return {
    id: producto.idProducto,
    nombre: producto.proNombre,
    stock: producto.proStock,
    precio: Number(producto.proPrecio),
    categoria: producto.proCategoria
  };
}

export async function crearProductoService(data) {
  return await prisma.producto.create({
    data: {
      proNombre: data.nombre,
      proDescripcion: data.descripcion,
      proCategoria: data.categoria,
      proPrecio: parseFloat(data.precio),
      proStock: parseInt(data.stock),
      proEstado: "ACTIVO",
      proImagen: data.imagen,
    },
  });
}

export async function actualizarProductoService(id, data) {
  return await prisma.producto.update({
    where: { idProducto: parseInt(id) },
    data: {
      proNombre: data.nombre,
      proDescripcion: data.descripcion,
      proCategoria: data.categoria,
      proPrecio: data.precio ? parseFloat(data.precio) : undefined,
      proStock: data.stock !== undefined ? parseInt(data.stock) : undefined,
      proImagen: data.imagen,
    },
  });
}

export async function cambiarEstadoProductoService(id, nuevoEstado) {
  return await prisma.producto.update({
    where: { idProducto: parseInt(id) },
    data: { proEstado: nuevoEstado },
  });
}
