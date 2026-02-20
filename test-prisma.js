import prisma from "./src/config/prisma.js";

async function test() {
  await prisma.$connect();
  console.log("Prisma conectado correctamente");
  await prisma.$disconnect();
}

test();