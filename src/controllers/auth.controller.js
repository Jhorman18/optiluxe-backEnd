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

/* =========================
   📝 REGISTER
========================= */
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