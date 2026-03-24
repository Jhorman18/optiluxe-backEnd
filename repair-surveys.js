import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  // Repair Survey 10 -> Factura 16
  await prisma.encuesta.update({
    where: { idEncuesta: 10 },
    data: { fkIdFactura: 16 }
  });
  console.log('Encuesta 10 vinculada a Factura 16');

  // Repair Survey 9 -> Factura 15
  await prisma.encuesta.update({
    where: { idEncuesta: 9 },
    data: { fkIdFactura: 15 }
  });
  console.log('Encuesta 9 vinculada a Factura 15');

  // Find Factura for Survey 6 (15:26:52)
  const f6 = await prisma.factura.findFirst({
    where: {
      facFecha: {
        gte: new Date('2026-03-24T15:20:00-05:00'),
        lte: new Date('2026-03-24T15:30:00-05:00')
      }
    }
  });

  if (f6) {
    await prisma.encuesta.update({
      where: { idEncuesta: 6 },
      data: { fkIdFactura: f6.idFactura }
    });
    console.log(`Encuesta 6 vinculada a Factura ${f6.idFactura}`);
  } else {
    console.log('No se encontró factura para Encuesta 6');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
