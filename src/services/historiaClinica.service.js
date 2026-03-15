import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

const INCLUDE_CITA = {
  cita: {
    include: {
      usuario: {
        select: {
          idUsuario: true,
          usuNombre: true,
          usuApellido: true,
          usuDocumento: true,
          usuCorreo: true,
          usuTelefono: true,
        },
      },
    },
  },
};

export async function crearHistoriaClinicaService(idCita, data) {
  const { hisDiagnostico, hisFormulaOptica, hisObservaciones } = data;

  if (!hisDiagnostico || !hisFormulaOptica) {
    throw new HttpError("Diagnóstico y fórmula óptica son obligatorios", 400);
  }

  const cita = await prisma.cita.findUnique({ where: { idCita: parseInt(idCita) } });
  if (!cita) throw new HttpError("Cita no encontrada", 404);
  if (cita.citEstado !== "EN_ATENCION") {
    throw new HttpError("Solo se puede registrar historia de citas en atención", 409);
  }

  const yaExiste = await prisma.historia_clinica.findFirst({
    where: { fkIdCita: parseInt(idCita) },
  });
  if (yaExiste) throw new HttpError("Esta cita ya tiene historia clínica registrada", 409);

  const [historia] = await prisma.$transaction([
    prisma.historia_clinica.create({
      data: {
        hisDiagnostico,
        hisFormulaOptica,
        hisObservaciones: hisObservaciones || null,
        fkIdCita: parseInt(idCita),
      },
      include: INCLUDE_CITA,
    }),
    prisma.cita.update({
      where: { idCita: parseInt(idCita) },
      data: { citEstado: "COMPLETADA" },
    }),
  ]);

  return historia;
}

export async function listarHistoriasClinicasService({ busqueda } = {}) {
  const historias = await prisma.historia_clinica.findMany({
    include: INCLUDE_CITA,
    orderBy: { hisFecha: "desc" },
  });

  if (!busqueda) return historias;

  const term = busqueda.toLowerCase();
  return historias.filter((h) => {
    const u = h.cita?.usuario;
    return (
      u?.usuNombre?.toLowerCase().includes(term) ||
      u?.usuApellido?.toLowerCase().includes(term) ||
      u?.usuDocumento?.toLowerCase().includes(term) ||
      h.hisDiagnostico?.toLowerCase().includes(term)
    );
  });
}

export async function obtenerHistoriaPorCitaService(idCita) {
  return prisma.historia_clinica.findFirst({
    where: { fkIdCita: parseInt(idCita) },
    include: INCLUDE_CITA,
  });
}

export async function obtenerHistoriaPorIdService(id) {
  const historia = await prisma.historia_clinica.findUnique({
    where: { idHistoriaClinica: parseInt(id) },
    include: INCLUDE_CITA,
  });
  if (!historia) throw new HttpError("Historia clínica no encontrada", 404);
  return historia;
}
