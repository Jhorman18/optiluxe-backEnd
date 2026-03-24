import * as encuestaService from "../services/encuesta.service.js";
import prisma from "../config/prisma.js";

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
