import { loginUsuarioService } from "../services/auth.service.js";

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