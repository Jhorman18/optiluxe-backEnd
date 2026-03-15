import prisma from "../config/prisma.js";
import { HORA_APERTURA_MIN, HORA_CIERRE_MIN } from "../config/negocio.js";
import { dateToUTCMinutes, minutesToHHMM, hayConflictoHorario } from "../utils/fecha.utils.js";

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function getCitasDelDia(fechaStr) {
    const diaInicio = new Date(`${fechaStr}T00:00:00.000Z`);
    const diaFin    = new Date(`${fechaStr}T23:59:59.999Z`);

    return prisma.cita.findMany({
        where: {
            citFecha: { gte: diaInicio, lte: diaFin },
            citEstado: { not: "CANCELADA" },
        },
        select: { citFecha: true, citDuracion: true },
    });
}

function validarHorario(inicioMin, duracion) {
    const finMin = inicioMin + duracion;
    if (inicioMin < HORA_APERTURA_MIN) {
        const err = new Error("El horario de inicio no puede ser antes de las 8:00am.");
        err.status = 400;
        throw err;
    }
    if (finMin > HORA_CIERRE_MIN) {
        const err = new Error("La cita excede el horario de atención (8:00am - 5:00pm).");
        err.status = 400;
        throw err;
    }
}

async function validarDisponibilidad(fechaStr, nuevoInicio, duracion) {
    const citasDelDia = await getCitasDelDia(fechaStr);
    const nuevoFin = nuevoInicio + duracion;

    const hayConflicto = citasDelDia.some(({ citFecha, citDuracion }) => {
        const exInicio = dateToUTCMinutes(citFecha);
        return hayConflictoHorario(exInicio, exInicio + citDuracion, nuevoInicio, nuevoFin);
    });

    if (hayConflicto) {
        const err = new Error("El horario seleccionado ya no está disponible. Por favor elige otro.");
        err.status = 409;
        throw err;
    }
}

// ─── Servicios públicos ───────────────────────────────────────────────────────

export async function getHorariosOcupadosService(fechaStr) {
    const citas = await getCitasDelDia(fechaStr);
    return citas.map(({ citFecha, citDuracion }) => {
        const inicioMin = dateToUTCMinutes(citFecha);
        return { inicio: minutesToHHMM(inicioMin), fin: minutesToHHMM(inicioMin + citDuracion) };
    });
}

export async function registrarCitaService({ citMotivo, citFecha, citEstado = "Pendiente", citObservaciones, citDuracion, fkIdUsuario }) {
    const citaFechaDate = new Date(citFecha);

    if (citaFechaDate <= new Date()) {
        const err = new Error("No puedes agendar una cita en el pasado.");
        err.status = 400;
        throw err;
    }

    const inicioMin = dateToUTCMinutes(citaFechaDate);
    validarHorario(inicioMin, citDuracion);
    await validarDisponibilidad(citFecha.substring(0, 10), inicioMin, citDuracion);

    return prisma.cita.create({
        data: { citMotivo, citFecha: citaFechaDate, citEstado, citObservaciones, citDuracion, fkIdUsuario },
    });
}

// ─── Servicios del dashboard ──────────────────────────────────────────────────

export async function obtenerProximasCitasService(limit = 4) {
    const citas = await prisma.cita.findMany({
        where: { citFecha: { gte: new Date() }, citEstado: { not: "CANCELADA" } },
        orderBy: { citFecha: "asc" },
        take: limit,
        include: { usuario: true },
    });

    return citas.map((cita) => ({
        id: cita.idCita,
        paciente: `${cita.usuario.usuNombre} ${cita.usuario.usuApellido}`,
        tipo: cita.citMotivo,
        hora: new Date(cita.citFecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        estado: cita.citEstado,
        color: cita.citEstado.toUpperCase() === "CONFIRMADA"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700",
    }));
}

export async function contarCitasPendientesService() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return prisma.cita.count({
        where: { citFecha: { gte: hoy }, citEstado: { not: "CANCELADA" } },
    });
}

// ─── Citas del usuario ────────────────────────────────────────────────────────

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
            factura: {
                select: { idFactura: true, facNumero: true, facTotal: true, facFecha: true },
            },
        },
    });
}

export async function tieneCitaActivaService(idUsuario) {
    const cita = await prisma.cita.findFirst({
        where: {
            fkIdUsuario: idUsuario,
            citFecha: { gte: new Date() },
            citEstado: { notIn: ["CANCELADA", "COMPLETADA", "Cancelada", "Completada"] },
        },
        orderBy: { citFecha: "asc" },
        select: { idCita: true, citFecha: true, citMotivo: true, citEstado: true, citDuracion: true },
    });
    return { tieneActiva: !!cita, cita };
}

// ─── Panel Admin ──────────────────────────────────────────────────────────────

const ESTADOS_VALIDOS = ["PENDIENTE", "CONFIRMADA", "EN_ATENCION", "COMPLETADA", "CANCELADA", "NO_ASISTIO"];

const TRANSICIONES_VALIDAS = {
    PENDIENTE:   ["CONFIRMADA", "EN_ATENCION", "CANCELADA", "NO_ASISTIO"],
    CONFIRMADA:  ["EN_ATENCION", "CANCELADA", "NO_ASISTIO"],
    EN_ATENCION: ["COMPLETADA"],
    COMPLETADA:  [],
    CANCELADA:   [],
    NO_ASISTIO:  [],
};

export async function getAllCitasAdminService({ estado, fechaDesde, fechaHasta, busqueda } = {}) {
    const where = {};

    if (estado) where.citEstado = { equals: estado, mode: "insensitive" };

    if (fechaDesde || fechaHasta) {
        where.citFecha = {};
        if (fechaDesde) where.citFecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
        if (fechaHasta) where.citFecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }

    if (busqueda) {
        where.usuario = {
            OR: [
                { usuNombre:    { contains: busqueda, mode: "insensitive" } },
                { usuApellido:  { contains: busqueda, mode: "insensitive" } },
                { usuDocumento: { contains: busqueda, mode: "insensitive" } },
            ],
        };
    }

    return prisma.cita.findMany({
        where,
        orderBy: { citFecha: "desc" },
        include: {
            usuario: {
                select: { idUsuario: true, usuNombre: true, usuApellido: true, usuDocumento: true, usuTelefono: true, usuCorreo: true },
            },
            encuesta: { include: { factura: true } },
            historia_clinica: true,
        },
    });
}

export async function actualizarEstadoCitaService(idCita, nuevoEstado) {
    const estadoUpper = nuevoEstado.toUpperCase();

    if (!ESTADOS_VALIDOS.includes(estadoUpper)) {
        const err = new Error(`Estado '${nuevoEstado}' no válido. Permitidos: ${ESTADOS_VALIDOS.join(", ")}`);
        err.status = 400;
        throw err;
    }

    const cita = await prisma.cita.findUnique({ where: { idCita: parseInt(idCita) } });
    if (!cita) {
        const err = new Error("Cita no encontrada.");
        err.status = 404;
        throw err;
    }

    const estadoActual = cita.citEstado.toUpperCase();
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] || [];

    if (!transicionesPermitidas.includes(estadoUpper)) {
        const err = new Error(
            `No se puede cambiar de '${estadoActual}' a '${estadoUpper}'. Permitidas: ${transicionesPermitidas.join(", ") || "ninguna (estado final)"}`
        );
        err.status = 400;
        throw err;
    }

    return prisma.cita.update({
        where: { idCita: parseInt(idCita) },
        data: { citEstado: estadoUpper },
        include: { usuario: { select: { usuNombre: true, usuApellido: true } } },
    });
}

export async function crearCitaAdminService({ fkIdUsuario, citFecha, citMotivo, citDuracion, citEstado = "PENDIENTE", citObservaciones }) {
    const citaFechaDate = new Date(citFecha);

    if (citaFechaDate <= new Date()) {
        const err = new Error("No se puede agendar una cita en el pasado.");
        err.status = 400;
        throw err;
    }

    const inicioMin = dateToUTCMinutes(citaFechaDate);
    validarHorario(inicioMin, citDuracion);
    await validarDisponibilidad(citFecha.substring(0, 10), inicioMin, citDuracion);

    return prisma.cita.create({
        data: { citMotivo, citFecha: citaFechaDate, citEstado, citObservaciones, citDuracion, fkIdUsuario },
    });
}

export async function registrarPagoCitaService(idCita, { monto, metodoPago }) {
    const cita = await prisma.cita.findUnique({ where: { idCita: parseInt(idCita) } });
    if (!cita) {
        const err = new Error("Cita no encontrada.");
        err.status = 404;
        throw err;
    }

    const estadoActual = cita.citEstado.toUpperCase();
    if (estadoActual !== "PENDIENTE") {
        const err = new Error(`Solo se puede registrar pago para una cita en estado PENDIENTE. Estado actual: '${estadoActual}'.`);
        err.status = 400;
        throw err;
    }

    return prisma.$transaction(async (tx) => {
        const carrito = await tx.carrito.create({
            data: { fkIdUsuario: cita.fkIdUsuario, carEstado: "Completado", carFechaCreacion: new Date() },
        });

        const count = await tx.factura.count();
        const facNumero = `FAC-CIT-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;
        const total = parseFloat(monto);
        const subtotal = total / 1.19;
        const iva = total - subtotal;

        const factura = await tx.factura.create({
            data: {
                facNumero,
                facConcepto: `Pago de servicio: ${cita.citMotivo}`,
                facCondiciones: `Método: ${metodoPago}`,
                facSubtotal: subtotal.toFixed(2),
                facIva: iva.toFixed(2),
                facTotal: total,
                fkIdCarrito: carrito.idCarrito,
                fkIdCita: parseInt(idCita),
            },
        });

        await tx.encuesta.create({
            data: {
                enFecha: new Date(),
                enTipo: "Servicio Cita",
                fkIdCita: parseInt(idCita),
                fkIdFactura: factura.idFactura,
            },
        });

        return tx.cita.update({
            where: { idCita: parseInt(idCita) },
            data: { citEstado: "CONFIRMADA" },
            include: { usuario: { select: { usuNombre: true, usuApellido: true, usuCorreo: true } } },
        });
    });
}

export async function reprogramarCitaService(idCita, nuevaFecha) {
    const cita = await prisma.cita.findUnique({ where: { idCita: parseInt(idCita) } });
    if (!cita) {
        const err = new Error("Cita no encontrada.");
        err.status = 404;
        throw err;
    }

    const estadoActual = cita.citEstado.toUpperCase();
    if (["COMPLETADA", "CANCELADA", "NO_ASISTIO"].includes(estadoActual)) {
        const err = new Error(`No se puede reprogramar una cita con estado '${estadoActual}'.`);
        err.status = 400;
        throw err;
    }

    const citaFechaDate = new Date(nuevaFecha);
    const inicioMin = dateToUTCMinutes(citaFechaDate);
    validarHorario(inicioMin, cita.citDuracion);
    await validarDisponibilidad(nuevaFecha.substring(0, 10), inicioMin, cita.citDuracion);

    return prisma.cita.update({
        where: { idCita: parseInt(idCita) },
        data: { citFecha: citaFechaDate },
        include: { usuario: { select: { usuNombre: true, usuApellido: true } } },
    });
}
