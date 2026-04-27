import {
  loginUsuarioService,
  registerUsuarioService,
  forgotPasswordService,
  resetPasswordService
} from "../services/auth.service.js";

import { enviarRecuperacionPasswordEmail } from "../services/email.service.js";


export const login = async (req, res, next) => {
  try {
    const data = await loginUsuarioService(req.body);

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", data.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
      maxAge: 2 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      usuario: data.usuario,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const solicitante = req.usuario || null;

    const data = await registerUsuarioService(req.body, solicitante);

    if (data.token) {
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("token", data.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "strict",
        maxAge: 2 * 60 * 60 * 1000,
      });
    }

    return res.status(201).json({
      message: "Usuario creado correctamente",
      usuario: data.usuario,
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const u = req.usuario;

    return res.status(200).json({
      usuario: {
        id: u.idUsuario,
        idUsuario: u.idUsuario,
        nombre: u.usuNombre,
        apellido: u.usuApellido,
        correo: u.usuCorreo,
        rol: u.rol?.rolNombre,
        usuNombre:    u.usuNombre,
        usuApellido:  u.usuApellido,
        usuDocumento: u.usuDocumento,
        usuTelefono:  u.usuTelefono,
        usuCorreo:    u.usuCorreo,
        usuDireccion: u.usuDireccion,
        usuEstado:    u.usuEstado,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
    });

    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { correo } = req.body;
    const result = await forgotPasswordService(correo);

    if (result.token) {
      await enviarRecuperacionPasswordEmail(result.correo, result.nombre, result.token);
    }

    return res.status(200).json({ message: "Si el correo está registrado, se ha enviado un enlace." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, nuevaPassword } = req.body;
    const result = await resetPasswordService(token, nuevaPassword);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};