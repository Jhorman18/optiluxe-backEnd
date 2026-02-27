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

  if (usuario.usuEstado !== "ACTIVO") {
    throw new HttpError("Usuario inactivo", 403);
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
      idUsuario: usuario.idUsuario,
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


export async function registerUsuarioService(data, solicitante = null) {
  const {
    usuNombre,
    usuApellido,
    usuDocumento,
    usuCorreo,
    usuPassword,
    usuTelefono,
    usuDireccion,
    rol,
  } = data;

  if (
    !usuNombre ||
    !usuApellido ||
    !usuDocumento ||
    !usuCorreo ||
    !usuPassword
  ) {
    throw new HttpError(
      "Todos los campos obligatorios deben completarse",
      400
    );
  }


  const [correoExistente, documentoExistente] = await Promise.all([
    prisma.usuario.findUnique({ where: { usuCorreo } }),
    prisma.usuario.findUnique({ where: { usuDocumento } }),
  ]);

  if (correoExistente) {
    throw new HttpError("El correo ya está registrado", 409);
  }

  if (documentoExistente) {
    throw new HttpError("El documento ya está registrado", 409);
  }



  let rolFinal = "CLIENTE";

  if (rol && rol !== "CLIENTE") {

    if (!solicitante || solicitante.rol?.rolNombre !== "ADMIN") {
      throw new HttpError(
        "No autorizado para crear este tipo de usuario",
        403
      );
    }

    rolFinal = rol;
  }

  const rolBD = await prisma.rol.findUnique({
    where: { rolNombre: rolFinal },
  });

  if (!rolBD) {
    throw new HttpError("Rol no configurado en el sistema", 500);
  }

  const passwordHash = await bcrypt.hash(usuPassword, 10);

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      usuNombre,
      usuApellido,
      usuDocumento,
      usuCorreo,
      usuPassword: passwordHash,
      usuTelefono: usuTelefono || null,
      usuDireccion: usuDireccion || null,
      usuEstado: "ACTIVO",
      fkIdRol: rolBD.idRol,
    },
    include: { rol: true },
  });


  let token = null;

  if (!solicitante) {
    token = jwt.sign(
      {
        idUsuario: nuevoUsuario.idUsuario,
        correo: nuevoUsuario.usuCorreo,
        rol: nuevoUsuario.rol?.rolNombre,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
  }

  return {
    token,
    usuario: {
      id: nuevoUsuario.idUsuario,
      nombre: nuevoUsuario.usuNombre,
      apellido: nuevoUsuario.usuApellido,
      correo: nuevoUsuario.usuCorreo,
      rol: nuevoUsuario.rol?.rolNombre,
    },
  };
}