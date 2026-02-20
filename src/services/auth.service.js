import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { HttpError } from "../utils/httpErrors.js";
import prisma from "../config/prisma.js";

export async function loginUsuarioService(data) {
  const { correo, password } = data;

  if (!correo || !password) {
    throw new HttpError("Correo y contraseña son obligatorios", 400);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { usuCorreo: correo },
    include: { rol: true },
  });

  if (!usuario) {
    throw new HttpError("Credenciales inválidas", 401);
  }

  const passwordValido = await bcrypt.compare(
    password,
    usuario.usuPassword
  );

  if (!passwordValido) {
    throw new HttpError("Credenciales inválidas", 401);
  }

  const token = jwt.sign(
    {
      id: usuario.idUsuario,
      correo: usuario.usuCorreo,
      rol: usuario.rol?.rolNombre,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    token,
    usuario: {
      id: usuario.idUsuario,
      nombre: usuario.usuNombre,
      apellido: usuario.usuApellido,
      correo: usuario.usuCorreo,
      rol: usuario.rol?.rolNombre,
    },
  };
}