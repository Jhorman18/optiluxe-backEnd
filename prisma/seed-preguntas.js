import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const preguntas = [

  { preTexto: "¿Cómo calificarías tu experiencia agendando la cita?", preTipo: "estrellas", preCategoria: "cita", preActiva: true },
  { preTexto: "¿Habías agendado una cita con OptiLuxe anteriormente?", preTipo: "si_no", preCategoria: "cita", preActiva: true },
  { preTexto: "¿Qué tan fácil fue el proceso de agendamiento?", preTipo: "seleccion", preCategoria: "cita", preActiva: true },
  { preTexto: "¿Recomendarías nuestros servicios a familiares o amigos?", preTipo: "si_no", preCategoria: "cita", preActiva: true },
  { preTexto: "¿Tienes algún comentario para mejorar nuestro servicio?", preTipo: "texto", preCategoria: "cita", preActiva: true },


  { preTexto: "¿Cómo calificarías tu experiencia de compra en OptiLuxe?", preTipo: "estrellas", preCategoria: "compra", preActiva: true },
  { preTexto: "¿Habías comprado productos en OptiLuxe anteriormente?", preTipo: "si_no", preCategoria: "compra", preActiva: true },
  { preTexto: "¿Cómo conociste a OptiLuxe?", preTipo: "seleccion", preCategoria: "compra", preActiva: true },
  { preTexto: "¿Recomendarías nuestros productos a familiares o amigos?", preTipo: "si_no", preCategoria: "compra", preActiva: true },
  { preTexto: "¿Tienes algún comentario para mejorar tu experiencia de compra?", preTipo: "texto", preCategoria: "compra", preActiva: true },
];

async function main() {
  console.log("Iniciando seed de preguntas...");
  await prisma.pregunta.createMany({ data: preguntas });
  console.log("Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
