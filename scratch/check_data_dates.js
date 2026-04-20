import { PrismaClient } from "./src/generated/prisma/index.js";
const prisma = new PrismaClient();

async function check() {
  const facturasCount = await prisma.factura.count();
  const facturasRecent = await prisma.factura.findMany({
    take: 5,
    orderBy: { facFecha: 'desc' },
    select: { idFactura: true, facNumero: true, facFecha: true, facEstado: true, facTotal: true }
  });

  const citasRecent = await prisma.cita.findMany({
    take: 5,
    orderBy: { citFecha: 'desc' },
  });

  console.log("Total Facturas:", facturasCount);
  console.log("Recent Facturas:", JSON.stringify(facturasRecent, null, 2));
  console.log("Recent Citas:", JSON.stringify(citasRecent, null, 2));
  
  process.exit(0);
}

check();
