import { PrismaClient } from "./src/generated/prisma/index.js";
const prisma = new PrismaClient();

async function main() {
  const encuestas = await prisma.encuesta.findMany({
    include: {
      factura: true,
      cita: true,
    },
    take: 10
  });
  console.log(JSON.stringify(encuestas, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
