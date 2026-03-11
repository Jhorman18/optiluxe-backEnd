import { guardarSuscripcion, eliminarSuscripcion } from "../services/webpush.service.js";

export const suscribir = async (req, res, next) => {
    try {
        await guardarSuscripcion(req.usuario.idUsuario, req.body);
        res.status(201).json({ message: "Suscripción registrada" });
    } catch (error) {
        next(error);
    }
};

export const desuscribir = async (req, res, next) => {
    try {
        const { endpoint } = req.body;
        await eliminarSuscripcion(endpoint);
        res.json({ message: "Suscripción eliminada" });
    } catch (error) {
        next(error);
    }
};

export const getVapidPublicKey = (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};
