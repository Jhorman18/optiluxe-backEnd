import app from "./app.js";
import "dotenv/config";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

server.on('error', (error) => {
  console.error('Error al iniciar el servidor:', error.message);
  process.exit(1);
});