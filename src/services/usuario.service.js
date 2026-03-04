import prisma from "../config/prisma.js";

export async function contarPacientesActivosService() {
    return await prisma.usuario.count({
        where: {
            usuEstado: "ACTIVO",
            rol: { rolNombre: "CLIENTE" }
        }
    });
}

export async function listarPacientesService() {
    return await prisma.usuario.findMany({
        where: {
            rol: { rolNombre: "CLIENTE" }
        },
        include: {
            rol: true
        }
    });
}
