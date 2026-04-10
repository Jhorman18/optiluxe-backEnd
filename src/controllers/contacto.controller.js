import {
    crearMensajeService,
    obtenerMensajesService,
    actualizarEstadoMensajeService,
    responderMensajeService
} from "../services/contacto.service.js";

/**
 * Controlador para crear un mensaje de contacto
 */
export const crearMensaje = async (req, res, next) => {
    try {
        const mensaje = await crearMensajeService(req.body);
        return res.status(201).json({
            message: "Mensaje enviado correctamente",
            mensaje
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controlador para obtener todos los mensajes
 */
export const obtenerMensajes = async (req, res, next) => {
    try {
        const mensajes = await obtenerMensajesService();
        return res.status(200).json(mensajes);
    } catch (error) {
        next(error);
    }
};

/**
 * Controlador para actualizar el estado de un mensaje
 */
export const actualizarEstadoMensaje = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const mensaje = await actualizarEstadoMensajeService(id, estado);
        return res.status(200).json({
            message: "Estado actualizado",
            mensaje
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controlador para responder a un mensaje de contacto
 */
export const responderMensaje = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { respuesta } = req.body;
        const mensaje = await responderMensajeService(id, respuesta);
        return res.status(200).json({
            message: "Respuesta enviada correctamente",
            mensaje
        });
    } catch (error) {
        next(error);
    }
};
