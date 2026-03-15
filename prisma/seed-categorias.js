import { PrismaClient } from "../src/generated/prisma/index.js";
import "dotenv/config";

const prisma = new PrismaClient();

// Categorías a crear
const CATEGORIAS = [
    "Monturas",
    "Gafas de Sol",
    "Lentes de Contacto",
    "Lentes Oftálmicos",
    "Accesorios",
];

// Asignación por ID de producto (inferida del nombre)
const ASIGNACIONES = {
    // Monturas
    52: "Monturas",  // Montura Óptica Classic Black
    54: "Monturas",  // Montura Ray-Ban Aviator
    55: "Monturas",  // Montura Gucci Premium
    56: "Monturas",  // Montura Lacoste Classic
    57: "Monturas",  // Montura Armani Elegance
    58: "Monturas",  // Montura Vogue Style
    59: "Monturas",  // Montura Titanium Pro
    60: "Monturas",  // Montura Kids Flex
    84: "Monturas",  // Montura Carrera Vision
    85: "Monturas",  // Montura Police Urban
    86: "Monturas",  // Montura Flex Titanium
    87: "Monturas",  // Montura Classic Silver

    // Gafas de Sol
    53: "Gafas de Sol",  // Lentes de Sol Polarizados Sport
    61: "Gafas de Sol",  // Lentes de Sol Oakley
    62: "Gafas de Sol",  // Lentes Ray-Ban Wayfarer
    63: "Gafas de Sol",  // Lentes Polarizados Sport
    64: "Gafas de Sol",  // Lentes Premium Gold
    65: "Gafas de Sol",  // Lentes Urban Black
    66: "Gafas de Sol",  // Lentes Luxury Edition
    88: "Gafas de Sol",  // Lentes de Sol Carrera Black
    89: "Gafas de Sol",  // Lentes de Sol Mirror Red
    90: "Gafas de Sol",  // Lentes de Sol Explorer

    // Lentes de Contacto
    67: "Lentes de Contacto",  // Lentes de Contacto Acuvue
    68: "Lentes de Contacto",  // Lentes Biofinity
    69: "Lentes de Contacto",  // Lentes Air Optix
    70: "Lentes de Contacto",  // Lentes Daily Comfort
    71: "Lentes de Contacto",  // Lentes Toricos Premium
    72: "Lentes de Contacto",  // Lentes Pro Max
    91: "Lentes de Contacto",  // Lentes de Contacto HydraVision
    92: "Lentes de Contacto",  // Lentes de Contacto ClearView
    93: "Lentes de Contacto",  // Lentes de Contacto Comfort Plus

    // Lentes Oftálmicos (tratamientos y lentes de prescripción)
    73: "Lentes Oftálmicos",  // Lentes Transitions
    74: "Lentes Oftálmicos",  // Lentes Antireflejo
    75: "Lentes Oftálmicos",  // Lentes Blue Light
    76: "Lentes Oftálmicos",  // Lentes Fotocromáticos Plus
    77: "Lentes Oftálmicos",  // Lentes Alta Definición
    78: "Lentes Oftálmicos",  // Lentes Digital Protection

    // Accesorios
    79: "Accesorios",  // Estuche Premium
    80: "Accesorios",  // Paño Microfibra
    81: "Accesorios",  // Spray Limpiador
    82: "Accesorios",  // Kit Limpieza Completo
    83: "Accesorios",  // Cordón para Gafas
};

async function main() {
    console.log("Creando categorías...");

    // 1. Crear categorías
    for (const nombre of CATEGORIAS) {
        await prisma.categoria.upsert({
            where: { catNombre: nombre },
            create: { catNombre: nombre },
            update: {},
        });
        console.log(`  ✓ ${nombre}`);
    }

    // 2. Cargar mapa nombre → id
    const categorias = await prisma.categoria.findMany();
    const catMap = Object.fromEntries(categorias.map(c => [c.catNombre, c.idCategoria]));

    console.log("\nAsignando categorías a productos...");

    // 3. Actualizar cada producto
    for (const [idProducto, catNombre] of Object.entries(ASIGNACIONES)) {
        const idCategoria = catMap[catNombre];
        if (!idCategoria) {
            console.warn(`  ⚠ Categoría no encontrada: ${catNombre}`);
            continue;
        }
        await prisma.$executeRaw`
            UPDATE "producto" SET "fkIdCategoria" = ${idCategoria}
            WHERE "idProducto" = ${parseInt(idProducto)}
        `;
        console.log(`  ✓ ID ${idProducto} → ${catNombre}`);
    }

    // 4. Verificar si quedaron productos sin categoría
    const sinCategoria = await prisma.$queryRaw`
        SELECT "idProducto", "proNombre" FROM "producto" WHERE "fkIdCategoria" IS NULL
    `;

    if (sinCategoria.length > 0) {
        console.warn(`\n⚠ ${sinCategoria.length} producto(s) sin categoría:`);
        sinCategoria.forEach(p => console.warn(`  - ID ${p.idProducto}: ${p.proNombre}`));
    } else {
        console.log("\n✅ Todos los productos tienen categoría asignada.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
