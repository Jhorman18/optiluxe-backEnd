import {
  loginUsuarioService,
  registerUsuarioService,
} from "../services/auth.service.js";

/* =========================
   🔐 LOGIN
========================= */
export const login = async (req, res, next) => {
  try {
    const data = await loginUsuarioService(req.body);

    res.cookie("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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
      res.cookie("token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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
        nombre: u.usuNombre,
        apellido: u.usuApellido,
        correo: u.usuCorreo,
        rol: u.rol?.rolNombre,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (error) {
    next(error);
  }
};