import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";


export async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new HttpError("Token requerido", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: decoded.idUsuario },
      include: {
        rol: true,
      },
    });

    if (!usuario) {
      return next(new HttpError("Usuario no encontrado", 401));
    }

    if (usuario.usuEstado !== "ACTIVO") {
      return next(new HttpError("Usuario inactivo", 403));
    }


    req.usuario = usuario;

    next();
  } catch (error) {
    return next(new HttpError("Token inválido o expirado", 401));
  }
}

export function isAdmin(req, res, next) {
  if (req.usuario && req.usuario.rol && req.usuario.rol.rolNombre === "ADMINISTRADOR") {
    return next();
  }
  return next(new HttpError("No tienes permisos de administrador", 403));
}

export function isStaff(req, res, next) {
  const rolesPermitidos = ["ADMINISTRADOR", "EMPLEADO"];
  if (req.usuario && req.usuario.rol && rolesPermitidos.includes(req.usuario.rol.rolNombre)) {
    return next();
  }
  return next(new HttpError("No tienes permisos de personal autorizado", 403));
}