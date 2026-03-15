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
            notEstado: "Enviada",
            notFechaProgramada: new Date(),
            fkIdUsuario: idUsuario,
        },
        include: { usuario: true },
    });

    // Email y push en segundo plano — no bloquean ni afectan el estado de la notificación
    if (enviarCorreo) {
        enviarNotificacionGeneralEmail(notif.usuario.usuCorreo, titulo, mensaje, notif.usuario.usuNombre)
            .catch(() => {});
    }
    enviarPushAlUsuario(idUsuario, titulo, mensaje).catch(() => {});
}
