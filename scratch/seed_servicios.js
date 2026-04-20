import { PrismaClient } from "../src/generated/prisma/index.js";
const prisma = new PrismaClient();

const iniciales = [
  { serNombre: "Examen Visual Completo", serDescripcion: "Evaluación exhaustiva de tu salud visual con tecnología de punta", serPrecio: 80000, serDuracion: 45 },
  { serNombre: "Renovación de Fórmula", serDescripcion: "Actualización de tu prescripción óptica actual", serPrecio: 60000, serDuracion: 30 },
  { serNombre: "Adaptación de Lentes de Contacto", serDescripcion: "Encuentra los lentes de contacto perfectos para tu estilo de vida", serPrecio: 100000, serDuracion: 60 },
  { serNombre: "Selección y Ajuste de Monturas", serDescripcion: "Asesoría personalizada para encontrar el estilo perfecto", serPrecio: 0, serDuracion: 30 },
];

async function seed() {
  console.log("Iniciando migración de servicios...");
  for (const s of iniciales) {
    const existe = await prisma.servicio.findFirst({ where: { serNombre: s.serNombre } });
    if (!existe) {
      await prisma.servicio.create({ data: s });
      console.log(`- Creado: ${s.serNombre}`);
    } else {
      console.log(`- Ya existe: ${s.serNombre}`);
    }
  }
  console.log("Migración finalizada.");
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
