import prisma from "../config/prisma.js";

/**
 * Obtiene todas las encuestas registradas, incluyendo datos del cliente relacionado
 */
export const getAllEncuestasService = async (filtros = {}) => {
  const { tipo, busqueda } = filtros;

  const encuestas = await prisma.encuesta.findMany({
    where: {
      AND: [
        tipo ? { 
          enTipo: {
            contains: tipo === "Compra" ? "VENTA" : tipo === "Cita" ? "CITA" : tipo,
            mode: 'insensitive'
          }
        } : {},
        busqueda ? {
          OR: [
            { factura: { usuario: { usuNombre: { contains: busqueda, mode: 'insensitive' } } } },
            { factura: { usuario: { usuApellido: { contains: busqueda, mode: 'insensitive' } } } },
            { factura: { usuario: { usuDocumento: { contains: busqueda, mode: 'insensitive' } } } },
            { cita: { usuario: { usuNombre: { contains: busqueda, mode: 'insensitive' } } } },
            { cita: { usuario: { usuApellido: { contains: busqueda, mode: 'insensitive' } } } },
            { cita: { usuario: { usuDocumento: { contains: busqueda, mode: 'insensitive' } } } },
          ]
        } : {}
      ]
    },
    include: {
      factura: {
        include: {
          usuario: {
            select: { usuNombre: true, usuApellido: true, usuDocumento: true }
          }
        }
      },
      cita: {
        include: {
          usuario: {
            select: { usuNombre: true, usuApellido: true, usuDocumento: true }
          }
        }
      },
      respuesta_encuesta: {
        include: {
          pregunta: true
        }
      }
    },
    orderBy: { enFecha: 'desc' }
  });

  // Mapear para unificar el nombre del cliente
  return encuestas.map(e => {
    let cliente = "Consumidor Final";
    let documento = "N/A";

    if (e.factura?.usuario) {
      cliente = `${e.factura.usuario.usuNombre} ${e.factura.usuario.usuApellido}`;
      documento = e.factura.usuario.usuDocumento;
    } else if (e.cita?.usuario) {
      cliente = `${e.cita.usuario.usuNombre} ${e.cita.usuario.usuApellido}`;
      documento = e.cita.usuario.usuDocumento;
    }

    return {
      ...e,
      cliente,
      documento,
      referencia: e.factura?.facNumero || (e.cita ? `CITA-${e.idEncuesta}` : "N/A")
    };
  });
};

/**
 * Obtiene el detalle de una encuesta con sus respuestas y preguntas
 */
export const getEncuestaByIdService = async (id) => {
  const encuesta = await prisma.encuesta.findUnique({
    where: { idEncuesta: parseInt(id) },
    include: {
      factura: {
        include: {
          usuario: {
            select: { usuNombre: true, usuApellido: true, usuDocumento: true, usuCorreo: true }
          }
        }
      },
      cita: {
        include: {
          usuario: {
            select: { usuNombre: true, usuApellido: true, usuDocumento: true, usuCorreo: true }
          }
        }
      },
      respuesta_encuesta: {
        include: {
          pregunta: true
        }
      }
    }
  });

  if (!encuesta) return null;

  // Unificar datos del cliente
  let cliente = {
    nombre: "Consumidor Final",
    documento: "N/A",
    correo: "N/A"
  };

  const userSource = encuesta.factura?.usuario || encuesta.cita?.usuario;
  if (userSource) {
    cliente = {
      nombre: `${userSource.usuNombre} ${userSource.usuApellido}`,
      documento: userSource.usuDocumento,
      correo: userSource.usuCorreo
    };
  }

  return {
    ...encuesta,
    cliente
  };
};

/**
 * Elimina una encuesta y sus respuestas asociadas
 */
export const eliminarEncuestaService = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // Eliminar primero las respuestas (dependencia)
    await tx.respuesta_encuesta.deleteMany({
      where: { fkIdEncuesta: parseInt(id) }
    });

    // Eliminar la encuesta
    return await tx.encuesta.delete({
      where: { idEncuesta: parseInt(id) }
    });
  });
};
