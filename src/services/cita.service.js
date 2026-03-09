import prisma from "../config/prisma.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte un objeto Date UTC a minutos desde medianoche (UTC) */
const dateToUTCMinutes = (date) =>
  date.getUTCHours() * 60 + date.getUTCMinutes();

/** Convierte minutos desde medianoche a string "HH:MM" */
const minutesToHHMM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// ─── Obtener citas del día (uso interno) ────────────────────────────────────

async function getCitasDelDia(fechaStr) {
  const diaInicio = new Date(`${fechaStr}T00:00:00.000Z`);
  const diaFin = new Date(`${fechaStr}T23:59:59.999Z`);

  return prisma.cita.findMany({
    where: {
      citFecha: { gte: diaInicio, lte: diaFin },
      citEstado: { not: "CANCELADA" },
    },
    select: { citFecha: true, citDuracion: true },
  });
}

// ─── Servicios públicos ──────────────────────────────────────────────────────

export async function getHorariosOcupadosService(fechaStr) {
  const citas = await getCitasDelDia(fechaStr);

  return citas.map(({ citFecha, citDuracion }) => {
    const inicioMin = dateToUTCMinutes(citFecha);
    const finMin = inicioMin + citDuracion;
    return { inicio: minutesToHHMM(inicioMin), fin: minutesToHHMM(finMin) };
  });
}

export async function registrarCitaService({
  citMotivo,
  citFecha,
  citEstado = "Pendiente",
  citObservaciones,
  citDuracion,
  fkIdUsuario,
}) {
  const citaFechaDate = new Date(citFecha);
  const fechaStr = citFecha.substring(0, 10);

  const nuevoInicio = dateToUTCMinutes(citaFechaDate);
  const nuevoFin = nuevoInicio + citDuracion;

  if (nuevoInicio < 8 * 60) {
    const err = new Error("El horario de inicio no puede ser antes de las 8:00am.");
    err.status = 400;
    throw err;
  }
  if (nuevoFin > 17 * 60) {
    const err = new Error("La cita excede el horario de atencion (8:00am - 5:00pm).");
    err.status = 400;
    throw err;
  }

  const citasDelDia = await getCitasDelDia(fechaStr);

  const hayConflicto = citasDelDia.some(({ citFecha: exFecha, citDuracion: exDur }) => {
    const exInicio = dateToUTCMinutes(exFecha);
    const exFin = exInicio + exDur;
    return exInicio < nuevoFin && exFin > nuevoInicio;
  });

  if (hayConflicto) {
    const err = new Error("El horario seleccionado ya no esta disponible. Por favor elige otro.");
    err.status = 409;
    throw err;
  }

  return prisma.cita.create({
    data: {
      citMotivo,
      citFecha: citaFechaDate,
      citEstado,
      citObservaciones,
      citDuracion,
      fkIdUsuario,
    },
  });
}

// ─── Servicios del dashboard ─────────────────────────────────────────────────

export async function obtenerProximasCitasService(limit = 4) {
  const citasRaw = await prisma.cita.findMany({
    where: {
      citFecha: { gte: new Date() },
      citEstado: { not: "CANCELADA" },
    },
    orderBy: { citFecha: "asc" },
    take: limit,
    include: { usuario: true },
  });

  return citasRaw.map((cita) => ({
    id: cita.idCita,
    paciente: `${cita.usuario.usuNombre} ${cita.usuario.usuApellido}`,
    tipo: cita.citMotivo,
    hora: new Date(cita.citFecha).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    estado: cita.citEstado,
    color:
      cita.citEstado.toUpperCase() === "CONFIRMADA"
        ? "bg-green-100 text-green-700"
        : "bg-yellow-100 text-yellow-700",
  }));
}

export async function contarCitasPendientesService() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return prisma.cita.count({
    where: {
      citFecha: { gte: hoy },
      citEstado: { not: "CANCELADA" },
    },
  });
}

// ─── Citas del usuario (mis citas) ───────────────────────────────────────────

export async function getMisCitasService(idUsuario) {
  return prisma.cita.findMany({
    where: { fkIdUsuario: idUsuario },
    orderBy: { citFecha: "desc" },
    select: {
      idCita: true,
      citFecha: true,
      citMotivo: true,
      citEstado: true,
      citObservaciones: true,
      citDuracion: true,
    },
  });
}

export async function tieneCitaActivaService(idUsuario) {
  const ahora = new Date();
  const cita = await prisma.cita.findFirst({
    where: {
      fkIdUsuario: idUsuario,
      citFecha: { gte: ahora },
      citEstado: { notIn: ["CANCELADA", "COMPLETADA", "Cancelada", "Completada"] },
    },
    orderBy: { citFecha: "asc" },
    select: {
      idCita: true,
      citFecha: true,
      citMotivo: true,
      citEstado: true,
      citDuracion: true,
    },
  });
  return { tieneActiva: !!cita, cita };
}
