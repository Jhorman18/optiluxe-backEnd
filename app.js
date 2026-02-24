import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { corsMiddleware } from "./src/middlewares/cors.middleware.js";
import authRoutes from "./src/routes/auth.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(corsMiddleware);
app.use(morgan("dev"));


app.use("/api/auth", authRoutes);


app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});


app.use((err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;

  const message =
    status >= 500
      ? "Error interno del servidor"
      : err.message;

  res.status(status).json({ message });
});

export default app;