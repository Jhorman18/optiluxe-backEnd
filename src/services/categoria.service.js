import prisma from "../config/prisma.js";

export async function listarCategoriasService() {
  return prisma.categoria.findMany({
    where: { catEstado: "ACTIVO" },
    orderBy: { catNombre: "asc" },
  });
}

export async function listarTodasCategoriasService() {
  return prisma.categoria.findMany({ orderBy: { catNombre: "asc" } });
}

export async function crearCategoriaService(nombre) {
  return prisma.categoria.create({
    data: { catNombre: nombre.trim() },
  });
}

export async function actualizarCategoriaService(id, nombre, estado) {
  return prisma.categoria.update({
    where: { idCategoria: parseInt(id) },
    data: {
      ...(nombre !== undefined && { catNombre: nombre.trim() }),
      ...(estado !== undefined && { catEstado: estado }),
    },
  });
}
