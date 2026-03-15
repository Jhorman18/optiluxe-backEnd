import * as categoriaService from "../services/categoria.service.js";

export const listarCategorias = async (_req, res, next) => {
  try {
    const categorias = await categoriaService.listarCategoriasService();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
};

export const listarTodasCategorias = async (_req, res, next) => {
  try {
    const categorias = await categoriaService.listarTodasCategoriasService();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
};

export const crearCategoria = async (req, res, next) => {
  try {
    const { catNombre } = req.body;
    if (!catNombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }
    const categoria = await categoriaService.crearCategoriaService(catNombre);
    res.status(201).json(categoria);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ya existe una categoría con ese nombre" });
    }
    next(error);
  }
};

export const actualizarCategoria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { catNombre, catEstado } = req.body;
    const categoria = await categoriaService.actualizarCategoriaService(id, catNombre, catEstado);
    res.json(categoria);
  } catch (error) {
    next(error);
  }
};
