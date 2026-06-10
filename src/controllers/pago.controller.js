import prisma from "../config/prisma.js";
import { createSoportePago } from "../services/soportePago.service.js";
import { enviarSoportePagoEmail } from "../services/email.service.js";

function generarNumeroFactura() {
  return "SOP-" + Date.now();
}

export async function procesarPago(req, res, next) {
  try {
    const { carritoId } = req.body;

    // 1. Traer carrito con productos y usuario
    const carrito = await prisma.carrito.findUnique({
      where: { idCarrito: Number(carritoId) },
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

    if (carrito.carrito_producto.length === 0) {
      return res.status(400).json({ message: "El carrito está vacío" });
    }

    // 2. Validar stock antes de procesar
    for (const item of carrito.carrito_producto) {
      if (item.producto.proStock < item.cantidad) {
        return res.status(400).json({
          message: `Stock insuficiente para "${item.producto.proNombre}". Disponible: ${item.producto.proStock}`
        });
      }
    }

    // 3. Calcular montos
    const subtotal = carrito.carrito_producto.reduce((acc, item) => {
      return acc + Number(item.producto.proPrecio) * item.cantidad;
    }, 0);

    const factData = {
      facNumero: generarNumeroFactura(),
      facFecha: new Date(),
      facConcepto: "Compra online óptica",
      facCondiciones: "Pago online",
      facSubtotal: subtotal,
      facIva: 0,
      facTotal: subtotal,
      fkIdCarrito: Number(carritoId),
    };

    // 4. Transacción: Descontar stock y Crear factura
    const resultado = await prisma.$transaction(async (tx) => {
      // Descontar stock de cada producto
      for (const item of carrito.carrito_producto) {
        await tx.producto.update({
          where: { idProducto: item.producto.idProducto },
          data: {
            proStock: { decrement: item.cantidad }
          }
        });
      }

      // Crear factura
      const soporteResult = await createSoportePago(factData, tx);
      return soporteResult;
    });

    // 5. Traer factura completa con relaciones para el email
    const soporteCompleto = await prisma.soporte_pago.findUnique({
      where: { idFactura: resultado.idFactura },
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

    // 6. Enviar correo (fuera de la transacción por rendimiento)
    try {
      await enviarSoportePagoEmail(soporteCompleto);
    } catch (emailError) {
      console.error("⚠️ Error enviando email de soporte de pago:", emailError);
      // No bloqueamos el éxito del pago si falla el email
    }

    res.json({
      message: "Pago exitoso, stock actualizado y soporte de pago enviado",
      soporteId: resultado.idFactura
    });

  } catch (error) {
    console.error("❌ Error en procesarPago:", error);
    next(error);
  }
}
