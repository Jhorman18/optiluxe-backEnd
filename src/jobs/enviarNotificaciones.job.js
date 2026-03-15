import cron from "node-cron";
import prisma from "../config/prisma.js";
import { enviarNotificacionGeneralEmail } from "../services/email.service.js";
import { enviarPushAlUsuario } from "../services/webpush.service.js";

/**
 * Cada minuto revisa notificaciones programadas con fecha <= ahora
 * y las envía por email y/o web push.
 */
export function iniciarJobEnvioNotificaciones() {
    cron.schedule("* * * * *", async () => {
        const ahora = new Date();

        const pendientes = await prisma.notificacion.findMany({
            where: {
                notEstado: "Pendiente",
                notFechaProgramada: { lte: ahora },
            },
            include: { usuario: true },
        });

        for (const notif of pendientes) {
            try {
                if (notif.notCanal === "EMAIL") {
                    await enviarNotificacionGeneralEmail(
                        notif.usuario.usuCorreo,
                        notif.notTitulo,
                        notif.notMensaje,
                        notif.usuario.usuNombre
                    );
                }

                enviarPushAlUsuario(notif.fkIdUsuario, notif.notTitulo, notif.notMensaje).catch(() => {});

                await prisma.notificacion.update({
                    where: { idNotificacion: notif.idNotificacion },
                    data:  { notEstado: "Enviada" },
                });
            } catch {
                await prisma.notificacion.update({
                    where: { idNotificacion: notif.idNotificacion },
                    data:  { notEstado: "Fallida" },
                });
            }
        }
    });
}
