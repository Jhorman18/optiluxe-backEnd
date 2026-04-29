import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";
import { enviarRespuestaContactoEmail } from "./email.service.js";

/**
 * Crea un nuevo mensaje de contacto
 * @param {Object} data - Datos del mensaje
 * @returns {Promise<Object>} El mensaje creado
 */
export async function crearMensajeService(data) {
    const { nombre, correo, telefono, mensaje } = data;

    if (!nombre || !correo || !mensaje) {
        throw new HttpError("Nombre, correo y mensaje son obligatorios", 400);
    }

    return await prisma.contacto.create({
        data: {
            conNombre: nombre,
            conCorreo: correo,
            conTelefono: telefono || null,
            conMensaje: mensaje,
            conEstado: "PENDIENTE"
        }
    });
}

/**
 * Obtiene todos los mensajes de contacto
 * @returns {Promise<Array>} Lista de mensajes
 */
export async function obtenerMensajesService() {
    return await prisma.contacto.findMany({
        orderBy: {
            conFechaEnvio: "desc"
        }
    });
}

/**
 * Actualiza el estado de un mensaje
 * @param {number} id - ID del mensaje
 * @param {string} estado - Nuevo estado
 * @returns {Promise<Object>} El mensaje actualizado
 */
export async function actualizarEstadoMensajeService(id, estado) {
    if (!id || !estado) {
        throw new HttpError("ID y estado son obligatorios", 400);
    }

    const estadosValidos = ["PENDIENTE", "LEIDO", "RESPONDIDO", "ARCHIVADO"];
    if (!estadosValidos.includes(estado)) {
        throw new HttpError("Estado no válido", 400);
    }

    try {
        return await prisma.contacto.update({
            where: { idContacto: parseInt(id) },
            data: { conEstado: estado }
        });
    } catch (error) {
        if (error.code === "P2025") {
            throw new HttpError("Mensaje no encontrado", 404);
        }
        throw error;
    }
}

/**
 * Responde a un mensaje de contacto enviando un correo y actualizando el estado
 * @param {number} id - ID del mensaje
 * @param {string} respuesta - Texto de la respuesta
 * @returns {Promise<Object>} El mensaje actualizado
 */
export async function responderMensajeService(id, respuesta) {
    if (!id || !respuesta) {
        throw new HttpError("ID y respuesta son obligatorios", 400);
    }

    // 1. Buscar el mensaje original
    const mensajeOriginal = await prisma.contacto.findUnique({
        where: { idContacto: parseInt(id) }
    });

    if (!mensajeOriginal) {
        throw new HttpError("Mensaje no encontrado", 404);
    }

    // 2. Enviar el correo
    await enviarRespuestaContactoEmail(
        mensajeOriginal.conCorreo,
        mensajeOriginal.conNombre,
        mensajeOriginal.conMensaje,
        respuesta
    );

    // 3. Actualizar el estado en la DB
    return await prisma.contacto.update({
        where: { idContacto: parseInt(id) },
        data: { conEstado: "RESPONDIDO" }
    });
}
