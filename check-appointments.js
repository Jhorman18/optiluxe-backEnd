import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  const citas = await prisma.cita.findMany({
    where: { 
      citFecha: { gte: new Date('2026-03-24T00:00:00.000Z') },
      citEstado: { not: 'CANCELADA' }
    },
    orderBy: { citFecha: 'asc' },
    include: { usuario: true }
  });

  console.log('--- CITAS REGISTRADAS (A PARTIR DE HOY) ---');
  citas.forEach(c => {
    console.log(`ID: ${c.idCita}, Fecha: ${c.citFecha.toISOString()}, Motivo: ${c.citMotivo}, Usuario: ${c.usuario.usuNombre}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
