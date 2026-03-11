import prisma from "../config/prisma.js";
import { enviarNotificacionGeneralEmail } from "./email.service.js";
import { enviarPushAlUsuario } from "./webpush.service.js";

/**
 * Crea una notificación en BD y la envía inmediatamente (email + push).
 * Uso exclusivo para notificaciones automáticas del sistema.
 */
export async function crearNotificacionAutomatica(idUsuario, titulo, mensaje, enviarCorreo = true) {
    const notif = await prisma.notificacion.create({
        data: {
            notTitulo: titulo,
            notMensaje: mensaje,
            notCanal: enviarCorreo ? "EMAIL_Y_PUSH" : "SOLO_PUSH",
            notEstado: "Pendiente",
            notFechaProgramada: new Date(),
            fkIdUsuario: idUsuario,
        },
        include: { usuario: true },
    });

    if (enviarCorreo) {
        try {
            await enviarNotificacionGeneralEmail(
                notif.usuario.usuCorreo,
                titulo,
                mensaje,
                notif.usuario.usuNombre
            );
            await prisma.notificacion.update({
                where: { idNotificacion: notif.idNotificacion },
                data: { notEstado: "Enviada" },
            });
        } catch {
            await prisma.notificacion.update({
                where: { idNotificacion: notif.idNotificacion },
                data: { notEstado: "Fallida" },
            });
        }
    } else {
        await prisma.notificacion.update({
            where: { idNotificacion: notif.idNotificacion },
            data: { notEstado: "Enviada" },
        });
    }

    // Push independiente del email (no bloquea ni falla si no hay suscripción)
    enviarPushAlUsuario(idUsuario, titulo, mensaje).catch(() => { });
}
