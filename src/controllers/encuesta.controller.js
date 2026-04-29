import * as encuestaService from "../services/encuesta.service.js";
import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

/**
 * Obtiene el catálogo de preguntas activas
 */
export const obtenerPreguntas = async (req, res, next) => {
  try {
    const { categoria } = req.query;

    const preguntas = await prisma.pregunta.findMany({
      where: {
        preActiva: true,
        ...(categoria ? { preCategoria: categoria } : {}),
      },
      orderBy: { idPregunta: "asc" },
    });

    return res.status(200).json(preguntas);
  } catch (error) {
    next(error);
  }
};

/**
 * Lista todas las encuestas registradas (Admin)
 */
export const getEncuestas = async (req, res, next) => {
  try {
    const encuestas = await encuestaService.getAllEncuestasService(req.query);
    res.json(encuestas);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el detalle de una encuesta (Admin)
 */
export const getEncuesta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const encuesta = await encuestaService.getEncuestaByIdService(id);
    if (!encuesta) return res.status(404).json({ message: "Encuesta no encontrada" });
    res.json(encuesta);
  } catch (error) {
    next(error);
  }
};

/**
 * Registra una nueva encuesta (Cliente/Venta)
 */
export const crearEncuesta = async (req, res, next) => {
  try {
    const { enTipo, fkIdCita, fkIdFactura, respuestas } = req.body;

    if (!enTipo || !respuestas || respuestas.length === 0) {
      return res.status(400).json({ message: "Tipo y respuestas son obligatorios." });
    }

    // Verificar que no exista ya una encuesta para la misma cita o factura
    const whereExistente = {};
    if (fkIdCita)    whereExistente.fkIdCita    = parseInt(fkIdCita);
    if (fkIdFactura) whereExistente.fkIdFactura = parseInt(fkIdFactura);
    if (Object.keys(whereExistente).length > 0) {
      const yaExiste = await prisma.encuesta.findFirst({ where: whereExistente });
      if (yaExiste) {
        return res.status(409).json({ message: "Ya enviaste una encuesta para esta cita o compra." });
      }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaEncuesta = await tx.encuesta.create({
        data: {
          enFecha: new Date(),
          enTipo,
          fkIdCita: fkIdCita ? parseInt(fkIdCita) : null,
          fkIdFactura: fkIdFactura ? parseInt(fkIdFactura) : null,
        },
      });

      const respuestasCreadas = await Promise.all(
        respuestas.map((r) =>
          tx.respuesta_encuesta.create({
            data: {
              resValor: r.resValor.toString(),
              fkIdPregunta: parseInt(r.fkIdPregunta),
              fkIdEncuesta: nuevaEncuesta.idEncuesta,
            },
          })
        )
      );

      return { encuesta: nuevaEncuesta, respuestas: respuestasCreadas };
    });

    return res.status(201).json({
      message: "Encuesta registrada con éxito",
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina una encuesta (Admin)
 */
export const deleteEncuesta = async (req, res, next) => {
  try {
    const { id } = req.params;
    await encuestaService.eliminarEncuestaService(id);
    res.json({ message: "Encuesta eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

// ==================== PREGUNTAS ADMIN ====================

/**
 * Lista TODAS las preguntas (activas e inactivas) — Admin
 */
export const obtenerPreguntasAdmin = async (req, res, next) => {
  try {
    const preguntas = await prisma.pregunta.findMany({
      orderBy: [{ preCategoria: "asc" }, { idPregunta: "asc" }],
    });
    return res.json(preguntas);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una nueva pregunta — Admin
 */
export const crearPregunta = async (req, res, next) => {
  try {
    const { preTexto, preTipo, preCategoria } = req.body;

    if (!preTexto || !preTipo || !preCategoria) {
      throw new HttpError(400, "Texto, tipo y categoría son obligatorios.");
    }

    const nueva = await prisma.pregunta.create({
      data: { preTexto, preTipo, preCategoria, preActiva: true },
    });

    return res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza una pregunta existente — Admin
 */
export const actualizarPregunta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { preTexto, preTipo, preCategoria } = req.body;

    const pregunta = await prisma.pregunta.update({
      where: { idPregunta: parseInt(id) },
      data: {
        ...(preTexto && { preTexto }),
        ...(preTipo && { preTipo }),
        ...(preCategoria && { preCategoria }),
      },
    });

    return res.json(pregunta);
  } catch (error) {
    next(error);
  }
};

/**
 * Alterna el estado activo/inactivo de una pregunta — Admin
 */
export const togglePregunta = async (req, res, next) => {
  try {
    const { id } = req.params;

    const actual = await prisma.pregunta.findUnique({
      where: { idPregunta: parseInt(id) },
    });

    if (!actual) throw new HttpError(404, "Pregunta no encontrada.");

    const actualizada = await prisma.pregunta.update({
      where: { idPregunta: parseInt(id) },
      data: { preActiva: !actual.preActiva },
    });

    return res.json(actualizada);
  } catch (error) {
    next(error);
  }
};
