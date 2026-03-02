import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

export async function crearFacturaService(data) {
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


  const carritoExistente = await prisma.carrito.findUnique({
    where: { idCarrito: Number(fkIdCarrito) },
  });

  if (!carritoExistente) {
    throw new HttpError("El carrito asociado no existe", 404);
  }


  const facturaExistente = await prisma.factura.findFirst({
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


  const nuevaFactura = await prisma.factura.create({
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