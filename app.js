import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { corsMiddleware } from "./src/middlewares/cors.middleware.js";
import authRoutes from "./src/routes/auth.routes.js";
import facturaRoutes from "./src/routes/factura.routes.js";
import productoRoutes from "./src/routes/producto.routes.js";
import carritoRoutes from "./src/routes/carrito.routes.js";
import citaRoutes from "./src/routes/cita.routes.js";
import usuarioRoutes from "./src/routes/usuario.routes.js";
import encuestaRoutes from "./src/routes/encuesta.routes.js";
import notificacionRoutes from "./src/routes/notificacion.routes.js";
import webpushRoutes from "./src/routes/webpush.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(corsMiddleware);
app.use(morgan("dev"));



app.use("/api/auth", authRoutes);
app.use("/api/factura", facturaRoutes);
app.use("/api/producto", productoRoutes);
app.use("/api/carrito", carritoRoutes);
app.use("/api/cita", citaRoutes);
app.use("/api/usuario", usuarioRoutes);
app.use("/api/encuesta", encuestaRoutes);
app.use("/api/notificacion", notificacionRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/webpush", webpushRoutes);



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