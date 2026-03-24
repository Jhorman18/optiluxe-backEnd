import prisma from "../config/prisma.js";

export const registrarNotificacion = async (req, res, next) => {
    try {
        const { notTitulo, notMensaje, notCanal, notFechaProgramada, fkIdUsuario } = req.body;

        const canalValido = ["EMAIL", "PUSH", "INTERNA", "EMAIL_Y_PUSH"].includes(notCanal?.toUpperCase())
            ? notCanal.toUpperCase()
            : "EMAIL";

        const nuevaNotif = await prisma.notificacion.create({
            data: {
                notTitulo,
                notMensaje,
                notCanal: canalValido,
                notEstado: "Pendiente",
                notFechaProgramada: new Date(notFechaProgramada),
                fkIdUsuario: parseInt(fkIdUsuario),
            },
        });

        res.status(201).json(nuevaNotif);
    } catch (error) {
        next(error);
    }
};

export const obtenerNotificaciones = async (_req, res, next) => {
    try {
        const data = await prisma.notificacion.findMany({
            include: {
                usuario: { select: { usuNombre: true, usuApellido: true, usuCorreo: true } },
            },
            orderBy: { notFechaProgramada: "desc" },
        });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const obtenerMisNotificaciones = async (req, res, next) => {
    try {
        const data = await prisma.notificacion.findMany({
            where: { fkIdUsuario: req.usuario.idUsuario, notEstado: { in: ["Enviada", "Fallida"] } },
            orderBy: { notFechaProgramada: "desc" },
            take: 10,
        });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const marcarLeida = async (req, res, next) => {
    try {
        await prisma.notificacion.update({
            where: { idNotificacion: parseInt(req.params.id) },
            data:  { notLeida: true },
        });
        res.json({ message: "Notificación leída" });
    } catch (error) {
        next(error);
    }
};

export const eliminarNotificacion = async (req, res, next) => {
    try {
        await prisma.notificacion.delete({
            where: { idNotificacion: parseInt(req.params.id), notEstado: "Pendiente" },
        });
        res.json({ message: "Notificación eliminada" });
    } catch (error) {
        next(error);
    }
};
