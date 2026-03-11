import { Router } from "express";
import { login, register, me, logout, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", login);

router.post("/register", (req, res, next) => {
  if (req.body.rol && req.body.rol !== "CLIENTE") {
    return authMiddleware(req, res, () => register(req, res, next));
  }

  return register(req, res, next);
});

router.get("/me", authMiddleware, me);

router.post("/logout", authMiddleware, logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;