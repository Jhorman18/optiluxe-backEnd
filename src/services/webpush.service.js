import webpush from "web-push";
import prisma from "../config/prisma.js";

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export async function guardarSuscripcion(idUsuario, suscripcion) {
    const { endpoint, keys } = suscripcion;

    await prisma.webpush_suscripcion.upsert({
        where: { webEndpoint: endpoint },
        create: {
            webEndpoint: endpoint,
            webP256dh: keys.p256dh,
            webAuth: keys.auth,
            webFechaRegistro: new Date(),
            fkIdUsuario: idUsuario,
        },
        update: {
            webP256dh: keys.p256dh,
            webAuth: keys.auth,
            fkIdUsuario: idUsuario,
        },
    });
}

export async function eliminarSuscripcion(endpoint) {
    await prisma.webpush_suscripcion.deleteMany({ where: { webEndpoint: endpoint } });
}

export async function enviarPushAlUsuario(idUsuario, titulo, mensaje) {
    const suscripciones = await prisma.webpush_suscripcion.findMany({
        where: { fkIdUsuario: idUsuario },
    });

    const payload = JSON.stringify({ title: titulo, body: mensaje });

    await Promise.allSettled(
        suscripciones.map(async (s) => {
            try {
                await webpush.sendNotification(
                    { endpoint: s.webEndpoint, keys: { p256dh: s.webP256dh, auth: s.webAuth } },
                    payload
                );
            } catch (err) {
                // Suscripción expirada o inválida — la eliminamos
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await prisma.webpush_suscripcion.deleteMany({
                        where: { webEndpoint: s.webEndpoint },
                    });
                }
            }
        })
    );
}
