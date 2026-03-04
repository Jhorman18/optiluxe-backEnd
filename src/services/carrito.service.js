import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";
import { sendEmail } from "../utils/sendEmail.js";

function formatCarrito(carrito) {
  const items = carrito.carrito_producto.map((cp) => ({
    idCarritoProducto: cp.idCarritoProducto,
    cantidad: cp.cantidad,
    producto: {
      id: cp.producto.idProducto,
      nombre: cp.producto.proNombre,
      categoria: cp.producto.proCategoria,
      precio: Number(cp.producto.proPrecio),
      imagen: cp.producto.proImagen,
      stock: cp.producto.proStock,
    },
    subtotal: Number(cp.producto.proPrecio) * cp.cantidad,
  }));

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const iva = subtotal * 0.19;

  return {
    idCarrito: carrito.idCarrito,
    items,
    subtotal,
    iva,
    total: subtotal + iva,
    totalItems: items.reduce((acc, i) => acc + i.cantidad, 0),
  };
}

async function getOrCreateCarrito(idUsuario) {
  let carrito = await prisma.carrito.findFirst({
    where: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    include: {
      carrito_producto: { include: { producto: true } },
      usuario: true,
    },
  });

  if (!carrito) {
    carrito = await prisma.carrito.create({
      data: { carEstado: "ACTIVO", fkIdUsuario: idUsuario },
      include: {
        carrito_producto: { include: { producto: true } },
        usuario: true,
      },
    });
  }

  return carrito;
}

export async function getCarritoService(idUsuario) {
  const carrito = await getOrCreateCarrito(idUsuario);
  return formatCarrito(carrito);
}

export async function agregarAlCarritoService(idUsuario, idProducto, cantidad = 1) {
  const producto = await prisma.producto.findUnique({
    where: { idProducto },
  });

  if (!producto || producto.proEstado !== "ACTIVO") {
    throw new HttpError("Producto no disponible", 404);
  }

  const carrito = await getOrCreateCarrito(idUsuario);

  const itemExistente = await prisma.carrito_producto.findUnique({
    where: {
      fkIdCarrito_fkIdProducto: {
        fkIdCarrito: carrito.idCarrito,
        fkIdProducto: idProducto,
      },
    },
  });

  const cantidadFinal = (itemExistente?.cantidad ?? 0) + cantidad;

  if (cantidadFinal > producto.proStock) {
    throw new HttpError(`Solo hay ${producto.proStock} unidades disponibles`, 400);
  }

  await prisma.carrito_producto.upsert({
    where: {
      fkIdCarrito_fkIdProducto: {
        fkIdCarrito: carrito.idCarrito,
        fkIdProducto: idProducto,
      },
    },
    create: {
      fkIdCarrito: carrito.idCarrito,
      fkIdProducto: idProducto,
      cantidad,
    },
    update: { cantidad: cantidadFinal },
  });

  return getCarritoService(idUsuario);
}

export async function actualizarCantidadService(idCarritoProducto, idUsuario, cantidad) {
  const item = await prisma.carrito_producto.findFirst({
    where: {
      idCarritoProducto,
      carrito: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    },
    include: { producto: true },
  });

  if (!item) throw new HttpError("Item no encontrado en tu carrito", 404);

  if (cantidad <= 0) {
    await prisma.carrito_producto.delete({ where: { idCarritoProducto } });
  } else {
    if (cantidad > item.producto.proStock) {
      throw new HttpError(`Solo hay ${item.producto.proStock} unidades disponibles`, 400);
    }

    await prisma.carrito_producto.update({
      where: { idCarritoProducto },
      data: { cantidad },
    });
  }

  return getCarritoService(idUsuario);
}

export async function eliminarItemService(idCarritoProducto, idUsuario) {
  const item = await prisma.carrito_producto.findFirst({
    where: {
      idCarritoProducto,
      carrito: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    },
  });

  if (!item) throw new HttpError("Item no encontrado en tu carrito", 404);

  await prisma.carrito_producto.delete({
    where: { idCarritoProducto },
  });

  return getCarritoService(idUsuario);
}

export async function pagarCarritoService(idUsuario, metodoPago) {
  const carrito = await prisma.carrito.findFirst({
    where: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
    include: {
      carrito_producto: { include: { producto: true } },
      usuario: true,
    },
  });

  if (!carrito) throw new HttpError("No tienes un carrito activo", 404);
  if (carrito.carrito_producto.length === 0)
    throw new HttpError("Tu carrito está vacío", 400);

  const formatted = formatCarrito(carrito);

  // 2. Transacción: Validar stock, descontar y crear factura
  console.log(`🛒 Iniciando proceso de pago para carrito ${carrito.idCarrito}...`);
  const factura = await prisma.$transaction(async (tx) => {
    // Validar y descontar stock de cada producto
    for (const item of carrito.carrito_producto) {
      console.log(`📦 Descontando ${item.cantidad} de "${item.producto.proNombre}" (ID: ${item.producto.idProducto})`);
      if (item.producto.proStock < item.cantidad) {
        throw new HttpError(
          `Stock insuficiente para "${item.producto.proNombre}". Disponible: ${item.producto.proStock}`,
          400
        );
      }

      await tx.producto.update({
        where: { idProducto: item.producto.idProducto },
        data: {
          proStock: { decrement: item.cantidad }
        }
      });
    }

    // Crear factura
    const nuevaFactura = await tx.factura.create({
      data: {
        facNumero: `FAC-${Date.now()}`,
        facFecha: new Date(),
        facConcepto: "Compra de productos ópticos - OptiLuxe",
        facCondiciones:
          metodoPago === "PSE"
            ? "Pago electrónico PSE"
            : "Pago en efectivo",
        facSubtotal: formatted.subtotal,
        facIva: formatted.iva,
        facTotal: formatted.total,
        fkIdCarrito: carrito.idCarrito,
      },
    });

    // Marcar carrito como completado
    await tx.carrito.update({
      where: { idCarrito: carrito.idCarrito },
      data: { carEstado: "COMPLETADO" },
    });

    return nuevaFactura;
  });

  // 3. Envío de correo (fuera de la transacción por rendimiento)
  try {
    const itemsHtml = formatted.items
      .map(
        (item) => `
        <tr>
          <td>${item.producto.nombre}</td>
          <td>${item.cantidad}</td>
          <td>$${item.subtotal.toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const html = `
<div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 30px;">
  
  <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #ffffff; padding: 30px; text-align: center;">
      <img src="cid:logoOptiLuxe" alt="OptiLuxe Logo" style="max-width:160px;">
    </div>

    <!-- Línea decorativa -->
    <div style="height: 4px; background-color: #D5E0F4;"></div>

    <!-- CONTENIDO -->
    <div style="padding: 30px; color: #333;">
      
      <h2>Hola ${carrito.usuario.usuNombre},</h2>

      <p>
        ¡Muchas gracias por tu compra! Hemos recibido tu pedido con éxito 
        y estamos trabajando en él para que puedas recoger tus productos.
      </p>

      <!-- Resumen -->
      <div style="margin-top: 25px; padding: 20px; background-color: #F4F8FD; border-left: 4px solid #D5E0F4;">
        <h3>Resumen de la orden</h3>

        <p><strong>Pedido:</strong> #${factura.facNumero}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>

        <ul>
          ${formatted.items.map(
      (item) =>
        `<li>${item.producto.nombre} (x${item.cantidad})</li>`
    ).join("")}
        </ul>

        <p style="font-size: 18px;">
          <strong>Total:</strong> $${formatted.total.toLocaleString()}
        </p>
      </div>

      <p style="margin-top: 30px;">
        Si tienes alguna pregunta, no dudes en contactarnos.
      </p>

      <p style="margin-top: 40px; font-size: 14px; color: #777;">
        © ${new Date().getFullYear()} OptiLuxe - Visión Clara
      </p>

    </div>

  </div>

</div>
`;
    console.log("Enviando correo a:", carrito.usuario.usuCorreo);
    await sendEmail({
      to: carrito.usuario.usuCorreo,
      subject: `Confirmación de compra - ${factura.facNumero}`,
      html,
    });
  } catch (error) {
    console.error("Error enviando correo:", error);
  }

  return {
    facNumero: factura.facNumero,
    metodoPago,
    subtotal: formatted.subtotal,
    iva: formatted.iva,
    total: formatted.total,
  };
}