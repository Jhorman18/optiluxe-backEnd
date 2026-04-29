import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function repairInvoices() {
    console.log("🚀 Iniciando reparación de facturas huérfanas...");

    const orphanedByCita = await prisma.factura.findMany({
        where: {
            fkIdUsuario: null,
            fkIdCita: { not: null }
        },
        include: { cita: true }
    });

    console.log(`🔍 Encontradas ${orphanedByCita.length} facturas ligadas a citas sin usuario.`);

    for (const f of orphanedByCita) {
        if (f.cita && f.cita.fkIdUsuario) {
            await prisma.factura.update({
                where: { idFactura: f.idFactura },
                data: { fkIdUsuario: f.cita.fkIdUsuario }
            });
            console.log(`✅ Factura ${f.facNumero} vinculada al usuario ID: ${f.cita.fkIdUsuario} (vía Cita)`);
        }
    }

    const orphanedByCarrito = await prisma.factura.findMany({
        where: {
            fkIdUsuario: null,
            fkIdCarrito: { not: null }
        },
        include: { carrito: true }
    });

    console.log(`🔍 Encontradas ${orphanedByCarrito.length} facturas ligadas a carritos sin usuario.`);

    for (const f of orphanedByCarrito) {
        if (f.carrito && f.carrito.fkIdUsuario) {
            await prisma.factura.update({
                where: { idFactura: f.idFactura },
                data: { fkIdUsuario: f.carrito.fkIdUsuario }
            });
            console.log(`✅ Factura ${f.facNumero} vinculada al usuario ID: ${f.carrito.fkIdUsuario} (vía Carrito)`);
        }
    }

    console.log("✨ Reparación completada.");
}

repairInvoices()
    .catch(e => console.error("❌ Error en reparación:", e))
    .finally(() => prisma.$disconnect());
