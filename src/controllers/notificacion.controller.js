import prisma from "../config/prisma.js";
import cron from "node-cron";
import { enviarNotificacionGeneralEmail } from "../services/email.service.js";
import { enviarPushAlUsuario } from "../services/webpush.service.js";
import { crearNotificacionAutomatica } from "../services/notificacion.service.js";

// Registrar notificación (ADMIN)
export const registrarNotificacion = async (req, res, next) => {
  try {
    const { notTitulo, notMensaje, notCanal, notFechaProgramada, fkIdUsuario } = req.body;

    const canalValido = ["EMAIL", "INTERNA"].includes(notCanal?.toUpperCase()) ? notCanal.toUpperCase() : "EMAIL";

    const nuevaNotif = await prisma.notificacion.create({
      data: {
        notTitulo,
        notMensaje,
        notCanal: canalValido,
        notEstado: "Pendiente",
        notFechaProgramada: new Date(notFechaProgramada),
        fkIdUsuario: parseInt(fkIdUsuario)
      }
    });

    res.status(201).json(nuevaNotif);
  } catch (error) {
    next(error);
  }
};

// Obtener todas para el admin (Historial Completo)
export const obtenerNotificaciones = async (req, res, next) => {
  try {
    const data = await prisma.notificacion.findMany({
      include: {
        usuario: {
          select: { usuNombre: true, usuApellido: true, usuCorreo: true }
        }
      },
      orderBy: { notFechaProgramada: 'desc' }
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Obtener notificaciones del usuario autenticado
export const obtenerMisNotificaciones = async (req, res, next) => {
  try {
    const idUsuario = req.usuario.idUsuario;

    const data = await prisma.notificacion.findMany({
      where: { fkIdUsuario: idUsuario, notEstado: "Enviada" },
      orderBy: { notFechaProgramada: 'desc' },
      take: 10
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Marcar como leída
export const marcarLeida = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.notificacion.update({
      where: { idNotificacion: parseInt(id) },
      data: { notLeida: true }
    });
    res.json({ message: "Notificación leída" });
  } catch (error) {
    next(error);
  }
};

// Eliminar notificación pendiente
export const eliminarNotificacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.notificacion.delete({
      where: { idNotificacion: parseInt(id), notEstado: "Pendiente" }
    });
    res.json({ message: "Notificación eliminada" });
  } catch (error) {
    next(error);
  }
};

// --- CRON: Envío de notificaciones programadas por admin (cada minuto) ---
cron.schedule("* * * * *", async () => {
  const ahora = new Date();

  const pendientes = await prisma.notificacion.findMany({
    where: {
      notEstado: "Pendiente",
      notFechaProgramada: { lte: ahora }
    },
    include: { usuario: true }
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

      // Web push adicional al email
      enviarPushAlUsuario(notif.fkIdUsuario, notif.notTitulo, notif.notMensaje).catch(() => {});

      await prisma.notificacion.update({
        where: { idNotificacion: notif.idNotificacion },
        data: { notEstado: "Enviada" }
      });
    } catch (err) {
      console.error(`Error procesando notificación ${notif.idNotificacion}:`, err);
      await prisma.notificacion.update({
        where: { idNotificacion: notif.idNotificacion },
        data: { notEstado: "Fallida" }
      });
    }
  }
});

// --- CRON: Recordatorio de cita 24h antes (cada hora) ---
cron.schedule("0 * * * *", async () => {
  const ahora = new Date();
  const en23h = new Date(ahora.getTime() + 23 * 60 * 60 * 1000);
  const en25h = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

  const citas = await prisma.cita.findMany({
    where: {
      citFecha: { gte: en23h, lte: en25h },
      citEstado: { not: "Cancelada" },
    },
    include: { usuario: true },
  });

  for (const cita of citas) {
    // No enviar si ya hay un recordatorio reciente para esta cita
    const yaEnviado = await prisma.notificacion.findFirst({
      where: {
        fkIdUsuario: cita.fkIdUsuario,
        notTitulo: { startsWith: "Recordatorio" },
        notFechaProgramada: { gte: new Date(ahora.getTime() - 26 * 60 * 60 * 1000) },
      },
    });

    if (!yaEnviado) {
      const fecha = new Date(cita.citFecha).toLocaleString("es-CO", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Bogota",
      });
      await crearNotificacionAutomatica(
        cita.fkIdUsuario,
        "Recordatorio de cita",
        `Tienes una cita programada para mañana ${fecha}. Motivo: ${cita.citMotivo}. ¡Te esperamos!`
      );
    }
  }
});
