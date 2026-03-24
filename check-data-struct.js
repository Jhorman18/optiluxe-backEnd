import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function checkData() {
    const categories = await prisma.categoria.findMany();
    console.log("📂 TABLA CATEGORIA:", JSON.stringify(categories, null, 2));

    const productSample = await prisma.producto.findMany({ take: 5, include: { categoria: true } });
    console.log("📦 MUESTRA PRODUCTOS:", JSON.stringify(productSample, null, 2));
}

checkData()
    .finally(() => prisma.$disconnect());
