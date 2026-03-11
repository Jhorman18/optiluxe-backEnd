import prisma from "../config/prisma.js";

export async function contarPacientesActivosService() {
    return await prisma.usuario.count({
        where: {
            usuEstado: "ACTIVO",
            rol: { rolNombre: "CLIENTE" }
        }
    });
}

export async function listarUsuariosService({ busqueda, rol } = {}) {
    return await prisma.usuario.findMany({
        where: {
            ...(busqueda && {
                OR: [
                    { usuNombre: { contains: busqueda, mode: "insensitive" } },
                    { usuApellido: { contains: busqueda, mode: "insensitive" } },
                    { usuCorreo: { contains: busqueda, mode: "insensitive" } },
                    { usuDocumento: { contains: busqueda, mode: "insensitive" } },
                ],
            }),
            ...(rol && { rol: { rolNombre: rol } }),
        },
        include: { rol: true },
        orderBy: { idUsuario: "desc" },
    });
}

export async function toggleEstadoUsuarioService(id, estado) {
    return await prisma.usuario.update({
        where: { idUsuario: id },
        data: { usuEstado: estado },
        include: { rol: true },
    });
}
