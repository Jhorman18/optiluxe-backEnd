import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  const encuestas = await prisma.encuesta.findMany({
    where: { enTipo: 'VENTA', fkIdFactura: null },
    orderBy: { enFecha: 'desc' },
    take: 10
  });

  const facturas = await prisma.factura.findMany({
    orderBy: { facFecha: 'desc' },
    take: 10,
    include: { usuario: true }
  });

  console.log('--- ENCUESTAS ORFANAS (VENTA) ---');
  encuestas.forEach(e => {
    console.log(`ID: ${e.idEncuesta}, Fecha: ${e.enFecha}`);
  });

  console.log('\n--- ÚLTIMAS FACTURAS ---');
  facturas.forEach(f => {
    console.log(`ID: ${f.idFactura}, Numero: ${f.facNumero}, Fecha: ${f.facFecha}, Usuario: ${f.usuario?.usuNombre || 'N/A'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
