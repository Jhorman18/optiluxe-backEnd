import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

/* =========================
   🔐 AUTH
========================= */

router.post("/login", login);

// Registro público o controlado
router.post("/register", (req, res, next) => {
  if (req.body.rol && req.body.rol !== "CLIENTE") {
    return authMiddleware(req, res, () => register(req, res, next));
  }

  return register(req, res, next);
});

export default router;