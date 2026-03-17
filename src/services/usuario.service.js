import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

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

export async function crearUsuarioService({ usuNombre, usuApellido, usuDocumento, usuTelefono, usuCorreo, usuPassword, usuDireccion, rolNombre }) {
    const [correoExistente, documentoExistente] = await Promise.all([
        prisma.usuario.findUnique({ where: { usuCorreo } }),
        prisma.usuario.findUnique({ where: { usuDocumento } }),
    ]);

    if (correoExistente) throw { status: 409, message: "El correo ya está registrado" };
    if (documentoExistente) throw { status: 409, message: "El documento ya está registrado" };

    const rol = await prisma.rol.findUnique({ where: { rolNombre: rolNombre ?? "CLIENTE" } });
    if (!rol) throw { status: 400, message: "Rol no válido" };

    const passwordHash = await bcrypt.hash(usuPassword, 10);

    return prisma.usuario.create({
        data: {
            usuNombre,
            usuApellido,
            usuDocumento,
            usuTelefono: usuTelefono || null,
            usuCorreo,
            usuPassword: passwordHash,
            usuDireccion: usuDireccion || null,
            usuEstado: "ACTIVO",
            fkIdRol: rol.idRol,
        },
        include: { rol: true },
    });
}

export async function editarUsuarioService(id, { usuNombre, usuApellido, usuDocumento, usuTelefono, usuCorreo, usuDireccion, rolNombre, usuPassword }) {
    const data = { usuNombre, usuApellido, usuDocumento, usuTelefono, usuCorreo, usuDireccion };

    if (rolNombre) {
        const rol = await prisma.rol.findUnique({ where: { rolNombre } });
        if (rol) data.fkIdRol = rol.idRol;
    }

    if (usuPassword) {
        data.usuPassword = await bcrypt.hash(usuPassword, 10);
    }

    return prisma.usuario.update({
        where: { idUsuario: id },
        data,
        include: { rol: true },
    });
}
