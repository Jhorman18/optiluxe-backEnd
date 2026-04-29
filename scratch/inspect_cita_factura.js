import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
    const citas = await prisma.cita.findMany({
        take: 10,
        orderBy: { idCita: 'desc' },
        include: {
            factura: true,
            encuesta: { include: { factura: true } }
        }
    });

    console.log(JSON.stringify(citas, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
