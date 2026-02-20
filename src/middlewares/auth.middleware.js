import jwt from "jsonwebtoken";
import { HttpError } from "../utils/httpErrors.js";

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new HttpError("Token requerido", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    next(new HttpError("Token inválido o expirado", 401));
  }
}