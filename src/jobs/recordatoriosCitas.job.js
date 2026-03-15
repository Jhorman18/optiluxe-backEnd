import cron from "node-cron";
import prisma from "../config/prisma.js";
import { crearNotificacionAutomatica } from "../services/notificacion.service.js";

/**
 * Cada hora busca citas que ocurran entre 23h y 25h desde ahora
 * y envía un recordatorio si aún no se ha enviado uno reciente.
 */
export function iniciarJobRecordatorioCitas() {
    cron.schedule("0 * * * *", async () => {
        const ahora  = new Date();
        const en23h  = new Date(ahora.getTime() + 23 * 60 * 60 * 1000);
        const en25h  = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

        const citas = await prisma.cita.findMany({
            where: {
                citFecha: { gte: en23h, lte: en25h },
                citEstado: { not: "Cancelada" },
            },
            include: { usuario: true },
        });

        for (const cita of citas) {
            const yaEnviado = await prisma.notificacion.findFirst({
                where: {
                    fkIdUsuario: cita.fkIdUsuario,
                    notTitulo:   { startsWith: "Recordatorio" },
                    notFechaProgramada: {
                        gte: new Date(ahora.getTime() - 26 * 60 * 60 * 1000),
                    },
                },
            });

            if (!yaEnviado) {
                const fecha = new Date(cita.citFecha).toLocaleString("es-CO", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: "UTC",
                });
                await crearNotificacionAutomatica(
                    cita.fkIdUsuario,
                    "Recordatorio de cita",
                    `Tienes una cita programada para mañana ${fecha}. Motivo: ${cita.citMotivo}. ¡Te esperamos!`
                );
            }
        }
    });
}
