import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

export async function crearFacturaService(data, tx = null) {
  const db = tx || prisma;
  const {
    facNumero,
    facFecha,
    facConcepto,
    facCondicionesPago,
    facSubtotal,
    facIva,
    facTotal,
    fkIdCarrito,
  } = data;

  if (
    !facNumero ||
    !facFecha ||
    !facConcepto ||
    !facCondicionesPago ||
    facSubtotal == null ||
    facIva == null ||
    facTotal == null ||
    !fkIdCarrito
  ) {
    throw new HttpError("Todos los campos son obligatorios", 400);
  }


  const carritoExistente = await db.carrito.findUnique({
    where: { idCarrito: Number(fkIdCarrito) },
  });

  if (!carritoExistente) {
    throw new HttpError("El carrito asociado no existe", 404);
  }


  const facturaExistente = await db.factura.findFirst({
    where: { facNumero },
  });

  if (facturaExistente) {
    throw new HttpError("El número de factura ya existe", 409);
  }


  const subtotal = Number(facSubtotal);
  const iva = Number(facIva);
  const total = Number(facTotal);

  if (subtotal + iva !== total) {
    throw new HttpError(
      "El total no coincide con subtotal + IVA",
      400
    );
  }


  const nuevaFactura = await db.factura.create({
    data: {
      facNumero,
      facFecha: new Date(facFecha),
      facConcepto,
      facCondicionesPago,
      facSubtotal: subtotal,
      facIva: iva,
      facTotal: total,
      fkIdCarrito: Number(fkIdCarrito),
    },
  });

  return {
    message: "Factura creada correctamente",
    factura: nuevaFactura,
  };
}

export async function obtenerVentasMesService() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const aggregateFacturas = await prisma.factura.aggregate({
    _sum: {
      facTotal: true
    },
    where: {
      facFecha: { gte: primerDiaMes }
    }
  });

  return aggregateFacturas._sum.facTotal ? Number(aggregateFacturas._sum.facTotal) : 0;
}
