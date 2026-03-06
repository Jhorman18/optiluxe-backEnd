import prisma from "../config/prisma.js";


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
          fkIdCita: fkIdCita || null,
          fkIdFactura: fkIdFactura || null,
        },
      });


      const respuestasCreadas = await Promise.all(
        respuestas.map((r) =>
          tx.respuesta_encuesta.create({
            data: {
              resValor: r.resValor.toString(),
              fkIdPregunta: r.fkIdPregunta,
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
