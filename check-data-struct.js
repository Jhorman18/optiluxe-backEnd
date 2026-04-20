
import prisma from "./src/config/prisma.js";

async function check() {
  console.log("Factura fields:", Object.keys(prisma.factura));
  // This won't give us the data structure for create, but we can try something else
  try {
    const fields = await prisma.factura.findFirst();
    console.log("Sample factura:", fields);
  } catch (e) {
    console.error("Error fetching factura:", e.message);
  }
}

check().then(() => process.exit());
