import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { HttpError } from "../utils/httpErrors.js";
import { sendEmail } from "../utils/sendEmail.js";
import { cambioContrasenaHtml } from "../templates/emails/cambioContrasena.template.js";

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
    if (estado === "INACTIVO") {
        const usuario = await prisma.usuario.findUnique({
            where: { idUsuario: id },
            include: { rol: true },
        });
        if (usuario?.rol?.rolNombre === "ADMINISTRADOR") {
            const totalAdmins = await prisma.usuario.count({
                where: { rol: { rolNombre: "ADMINISTRADOR" }, usuEstado: "ACTIVO" },
            });
            if (totalAdmins <= 1) {
                throw new HttpError("No puedes desactivar el único administrador activo del sistema.", 400);
            }
        }
    }
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

    if (correoExistente) throw new HttpError("El correo ya está registrado", 409);
    if (documentoExistente) throw new HttpError("El documento ya está registrado", 409);

    const rol = await prisma.rol.findUnique({ where: { rolNombre: rolNombre ?? "CLIENTE" } });
    if (!rol) throw new HttpError("Rol no válido", 400);

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

export async function editarPerfilPropioService(id, { usuTelefono, usuCorreo, usuDireccion, usuPassword }) {
    const data = {};
    if (usuTelefono  !== undefined) data.usuTelefono  = usuTelefono;
    if (usuCorreo    !== undefined) data.usuCorreo    = usuCorreo;
    if (usuDireccion !== undefined) data.usuDireccion = usuDireccion;

    const cambiaPassword = !!usuPassword;
    if (cambiaPassword) data.usuPassword = await bcrypt.hash(usuPassword, 10);

    const usuarioActualizado = await prisma.usuario.update({
        where: { idUsuario: id },
        data,
        include: { rol: true },
    });

    if (cambiaPassword) {
        const nombre = usuarioActualizado.usuNombre ?? "Usuario";
        const correo = usuarioActualizado.usuCorreo;
        sendEmail({
            to: correo,
            subject: "Tu contraseña de OptiLuxe fue cambiada",
            html: cambioContrasenaHtml({ nombreUsuario: nombre, correo }),
        }).catch(err => console.error("Error enviando email de cambio de contraseña:", err));
    }

    return usuarioActualizado;
}

export async function editarUsuarioService(id, { usuNombre, usuApellido, usuDocumento, usuTelefono, usuCorreo, usuDireccion, rolNombre, usuPassword }) {
    const data = { usuNombre, usuApellido, usuDocumento, usuTelefono, usuCorreo, usuDireccion };

    if (rolNombre) {
        const rol = await prisma.rol.findUnique({ where: { rolNombre } });
        if (rol) {
            if (rolNombre !== "ADMINISTRADOR") {
                const usuarioActual = await prisma.usuario.findUnique({
                    where: { idUsuario: id },
                    include: { rol: true },
                });
                if (usuarioActual?.rol?.rolNombre === "ADMINISTRADOR") {
                    const totalAdmins = await prisma.usuario.count({
                        where: { rol: { rolNombre: "ADMINISTRADOR" }, usuEstado: "ACTIVO" },
                    });
                    if (totalAdmins <= 1) {
                        throw new HttpError("Debe existir al menos un administrador activo en el sistema.", 400);
                    }
                }
            }
            data.fkIdRol = rol.idRol;
        }
    }

    const cambiaPassword = !!usuPassword;
    if (cambiaPassword) {
        data.usuPassword = await bcrypt.hash(usuPassword, 10);
    }

    const usuarioActualizado = await prisma.usuario.update({
        where: { idUsuario: id },
        data,
        include: { rol: true },
    });

    if (cambiaPassword) {
        const nombre = usuarioActualizado.usuNombre ?? "Usuario";
        const correo = usuarioActualizado.usuCorreo;
        sendEmail({
            to: correo,
            subject: "Tu contraseña de OptiLuxe fue cambiada",
            html: cambioContrasenaHtml({ nombreUsuario: nombre, correo }),
        }).catch(err => console.error("Error enviando email de cambio de contraseña:", err));
    }

    return usuarioActualizado;
}
