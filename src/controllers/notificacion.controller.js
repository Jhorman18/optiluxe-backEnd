import prisma from "../config/prisma.js";
import cron from "node-cron";
import { enviarNotificacionGeneralEmail } from "../services/email.service.js";

// Registrar notificación (ADMIN)
export const registrarNotificacion = async (req, res, next) => {
  try {
    const { notTitulo, notMensaje, notCanal, notFechaProgramada, fkIdUsuario } = req.body;

    // Solo permitimos EMAIL o INTERNA (Default: Email si no se especifica)
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
          select: { 
            usuNombre: true, 
            usuApellido: true, 
            usuCorreo: true 
          } 
        } 
      },
      orderBy: { notFechaProgramada: 'desc' }
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Obtener notificaciones del usuario autenticado (PACIENTE)
export const obtenerMisNotificaciones = async (req, res, next) => {
  try {
    const idUsuario = req.usuario.idUsuario;

    const data = await prisma.notificacion.findMany({
      where: {
        fkIdUsuario: idUsuario,
        notEstado: "Enviada" // Solo las ya procesadas se ven en la campana
      },
      orderBy: { notFechaProgramada: 'desc' },
      take: 10
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Marcar como leída (PACIENTE)
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
      where: { 
        idNotificacion: parseInt(id), 
        notEstado: "Pendiente" 
      }
    });
    res.json({ message: "Notificación eliminada" });
  } catch (error) {
    next(error);
  }
};

// --- CRON JOB (Envío masivo) ---
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
        console.log(`📧 Enviando notificación real por email a ${notif.usuario.usuCorreo}...`);
        await enviarNotificacionGeneralEmail(notif.usuario.usuCorreo, notif.notTitulo, notif.notMensaje, notif.usuario.usuNombre);
      }
      
      await prisma.notificacion.update({
        where: { idNotificacion: notif.idNotificacion },
        data: { notEstado: "Enviada" }
      });
    } catch (err) {
      console.error(`❌ Error procesando notificación ${notif.idNotificacion}:`, err);
      await prisma.notificacion.update({
        where: { idNotificacion: notif.idNotificacion },
        data: { notEstado: "Fallida" }
      });
    }
  }
});
