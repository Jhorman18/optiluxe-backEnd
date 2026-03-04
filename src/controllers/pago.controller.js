import { prisma } from "../generated/prisma/index.js";
import { crearFacturaService } from "../services/factura.service.js";
import { enviarFacturaEmail } from "../services/email.service.js";

function generarNumeroFactura() {
  return "FAC-" + Date.now();
}

export async function procesarPago(req, res, next) {
  try {

    const usuario = req.user;
    const { carritoId } = req.body;

    // 1. Traer carrito con productos y usuario
    const carrito = await prisma.carrito.findUnique({
      where: { idCarrito: carritoId },
      include: {
        carrito_producto: {
          include: {
            producto: true,
          },
        },
        usuario: true,
      },
    });

    if (!carrito) {
      return res.status(404).json({ message: "Carrito no encontrado" });
    }



    // 2. Calcular subtotal
    const subtotal = carrito.carrito_producto.reduce((acc, item) => {
      return acc + Number(item.producto.proPrecio) * item.cantidad;
    }, 0);


    // 3. Crear factura
    const nuevaFactura = await crearFacturaService({
      facNumero: generarNumeroFactura(),
      facFecha: new Date(),
      facConcepto: "Compra online óptica",
      facCondiciones: "Pago online",
      facSubtotal: subtotal,
      facIva: subtotal * 0.19,
      facTotal: subtotal * 1.19,
      fkIdCarrito: carritoId,
    });


    // 4. Traer factura completa
    const facturaCompleta = await prisma.factura.findUnique({
      where: { idFactura: nuevaFactura.idFactura },
      include: {
        carrito: {
          include: {
            usuario: true,
            carrito_producto: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
    });


    // 5. Enviar correo
    await enviarFacturaEmail(facturaCompleta);


    res.json({ message: "Pago exitoso y factura enviada" });

  } catch (error) {
    console.error("❌ Error en procesarPago:", error);
    next(error);
  }
}