
import prisma from "./src/config/prisma.js";
import { createFactura } from "./src/services/factura.service.js";

async function testMultiProductInvoice() {
  console.log("--- Starting Verification: Multi-Product Invoice ---");

  try {
    // 1. Get a test user (client)
    const user = await prisma.usuario.findFirst({
      where: { rol: { rolNombre: "CLIENTE" }, usuEstado: "ACTIVO" }
    });
    if (!user) throw new Error("No test client found");
    console.log(`Found client: ${user.idUsuario} (${user.usuNombre})`);

    // 2. Get two test products with stock
    const prods = await prisma.producto.findMany({
      where: { proEstado: "ACTIVO", proStock: { gt: 5 } },
      take: 2
    });
    if (prods.length < 2) throw new Error("Not enough test products with stock found");
    
    console.log(`Product 1: ${prods[0].idProducto} (Stock: ${prods[0].proStock}, Price: ${prods[0].proPrecio})`);
    console.log(`Product 2: ${prods[1].idProducto} (Stock: ${prods[1].proStock}, Price: ${prods[1].proPrecio})`);

    const items = [
      { idProducto: prods[0].idProducto, cantidad: 2 },
      { idProducto: prods[1].idProducto, cantidad: 1 }
    ];

    console.log("Attempting to create multi-product invoice...");
    const factura = await createFactura({
      fkIdUsuario: user.idUsuario,
      facConcepto: "Test Multi-product Invoice",
      facCondiciones: "Test Conditions",
      items: items
    });

    console.log(`Invoice Created: ${factura.facNumero}`);
    console.log(`Calculated Total: ${factura.facTotal}`);

    // Verify totals
    const expectedSubtotal = (Number(prods[0].proPrecio) * 2) + (Number(prods[1].proPrecio) * 1);
    const expectedTotal = expectedSubtotal * 1.19;
    
    console.log(`Expected Total: ${expectedTotal}`);
    
    if (Math.abs(Number(factura.facTotal) - expectedTotal) < 1) {
      console.log("✅ Total calculation is correct!");
    } else {
      console.log("❌ Total calculation is INCORRECT!");
    }

    // Check stock reduction
    const p1After = await prisma.producto.findUnique({ where: { idProducto: prods[0].idProducto } });
    const p2After = await prisma.producto.findUnique({ where: { idProducto: prods[1].idProducto } });

    if (p1After.proStock === prods[0].proStock - 2 && p2After.proStock === prods[1].proStock - 1) {
      console.log("✅ Stock reduction is correct!");
    } else {
      console.log("❌ Stock reduction FAILED!");
    }

    console.log("--- Verification Complete ---");
  } catch (error) {
    console.error("Verification FAILED:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiProductInvoice();
