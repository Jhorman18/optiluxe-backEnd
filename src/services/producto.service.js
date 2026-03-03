import prisma from "../config/prisma.js";

export async function listarProductosService({ categoria, busqueda } = {}) {
  const where = { proEstado: "ACTIVO" };

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
    imagen: p.proImagen,
  }));
}
