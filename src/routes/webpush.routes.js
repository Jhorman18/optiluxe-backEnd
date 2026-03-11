import { Router } from "express";
import { suscribir, desuscribir, getVapidPublicKey } from "../controllers/webpush.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/suscribir", authMiddleware, suscribir);
router.post("/desuscribir", authMiddleware, desuscribir);

export default router;
