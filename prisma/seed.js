import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const productos = [
  {
    proNombre: "Montura Ray-Ban Aviator",
    proDescripcion: "Montura clásica de aviador, diseño atemporal y cómodo.",
    proCategoria: "Monturas",
    proPrecio: 450000,
    proStock: 15,
    proEstado: "ACTIVO",
    proImagen: "https://images.unsplash.com/photo-1511499767150-a48a237f0083",
  },
  {
    proNombre: "Lentes de Sol Oakley",
    proDescripcion: "Protección UV400 con lentes polarizados de alta resistencia.",
    proCategoria: "Lentes de Sol",
    proPrecio: 380000,
    proStock: 12,
    proEstado: "ACTIVO",
    proImagen: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
  },
  {
    proNombre: "Montura Gucci Premium",
    proDescripcion: "Montura de lujo con acabado en acetato italiano.",
    proCategoria: "Monturas",
    proPrecio: 890000,
    proStock: 8,
    proEstado: "ACTIVO",
    proImagen: "https://images.unsplash.com/photo-1583394838336-acd977736f90",
  },
  {
    proNombre: "Lentes de Contacto Acuvue",
    proDescripcion: "Lentes de contacto diarios con máxima comodidad y oxigenación.",
    proCategoria: "Lentes de Contacto",
    proPrecio: 120000,
    proStock: 25,
    proEstado: "ACTIVO",
    proImagen: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6",
  },
  {
    proNombre: "Montura Lacoste Classic",
    proDescripcion: "Montura deportiva con diseño elegante y materiales ligeros.",
    proCategoria: "Monturas",
    proPrecio: 520000,
    proStock: 10,
    proEstado: "ACTIVO",
    proImagen: "https://images.unsplash.com/photo-1517841905240-472988babdf9",
  },
  {
    proNombre: "Lentes Transitions",
    proDescripcion: "Lentes fotocromáticos que se adaptan a la luz del ambiente.",
    proCategoria: "Lentes Formulados",
    proPrecio: 250000,
    proStock: 20,
    proEstado: "ACTIVO",
    proImagen: "https://images.unsplash.com/photo-1491553895911-0055eca6402d",
  },
];

async function main() {
  console.log("Cargando categorías para referenciarlas...");
  const categoriasDB = await prisma.categoria.findMany();
  const catMap = Object.fromEntries(categoriasDB.map(c => [c.catNombre, c.idCategoria]));

  console.log("Insertando productos...");

  for (const p of productos) {
    const { proCategoria, ...rest } = p;
    const idCat = catMap[proCategoria];

    if (!idCat) {
      console.warn(`  ⚠ Categoría no encontrada: ${proCategoria}. Saltando producto ${p.proNombre}`);
      continue;
    }

    await prisma.producto.create({
      data: {
        ...rest,
        fkIdCategoria: idCat
      }
    });
  }

  console.log("Productos insertados correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
