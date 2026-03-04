import prisma from "../config/prisma.js";

export async function obtenerProximasCitasService(limit = 4) {
    const citasRaw = await prisma.cita.findMany({
        where: {
            citFecha: { gte: new Date() },
            citEstado: { not: "CANCELADA" }
        },
        orderBy: {
            citFecha: 'asc'
        },
        take: limit,
        include: {
            usuario: true
        }
    });

    return citasRaw.map(cita => ({
        id: cita.idCita,
        paciente: `${cita.usuario.usuNombre} ${cita.usuario.usuApellido}`,
        tipo: cita.citMotivo,
        hora: new Date(cita.citFecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        estado: cita.citEstado,
        color: cita.citEstado.toUpperCase() === 'CONFIRMADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }));
}

export async function contarCitasPendientesService() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return await prisma.cita.count({
        where: {
            citFecha: { gte: hoy },
            citEstado: { not: "CANCELADA" }
        }
    });
}
