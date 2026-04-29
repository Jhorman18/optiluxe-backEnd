import prisma from "../config/prisma.js";
import { IVA } from "../config/negocio.js";
import { HttpError } from "../utils/httpErrors.js";
import { sendEmail } from "../utils/sendEmail.js";
import { crearNotificacionAutomatica } from "./notificacion.service.js";
import { confirmacionCompraHtml } from "../templates/emails/confirmacionCompra.template.js";

// ─── Helpers internos ─────────────────────────────────────────────────────────

function formatCarrito(carrito) {
    const items = carrito.carrito_producto.map((cp) => ({
        idCarritoProducto: cp.idCarritoProducto,
        cantidad: cp.cantidad,
        producto: {
            id:        cp.producto.idProducto,
            nombre:    cp.producto.proNombre,
            categoria: cp.producto.proCategoria,
            precio:    Number(cp.producto.proPrecio),
            imagen:    cp.producto.proImagen,
            stock:     cp.producto.proStock,
        },
        subtotal: Number(cp.producto.proPrecio) * cp.cantidad,
    }));

    const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
    const iva      = subtotal * IVA;

    return {
        idCarrito:  carrito.idCarrito,
        items,
        subtotal,
        iva,
        total:      subtotal + iva,
        totalItems: items.reduce((acc, i) => acc + i.cantidad, 0),
    };
}

async function getOrCreateCarrito(idUsuario) {
    let carrito = await prisma.carrito.findFirst({
        where: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
        include: { carrito_producto: { include: { producto: true } }, usuario: true },
    });

    if (!carrito) {
        carrito = await prisma.carrito.create({
            data: { carEstado: "ACTIVO", usuario: { connect: { idUsuario: idUsuario } } },
            include: { carrito_producto: { include: { producto: true } }, usuario: true },
        });
    }

    return carrito;
}

// ─── Servicios exportados ─────────────────────────────────────────────────────

export async function getCarritoService(idUsuario) {
    const carrito = await getOrCreateCarrito(idUsuario);
    return formatCarrito(carrito);
}

export async function agregarAlCarritoService(idUsuario, idProducto, cantidad = 1) {
    const producto = await prisma.producto.findUnique({ where: { idProducto } });

    if (!producto || producto.proEstado !== "ACTIVO") {
        throw new HttpError("Producto no disponible", 404);
    }

    const carrito = await getOrCreateCarrito(idUsuario);

    const itemExistente = await prisma.carrito_producto.findUnique({
        where: { fkIdCarrito_fkIdProducto: { fkIdCarrito: carrito.idCarrito, fkIdProducto: idProducto } },
    });

    const cantidadFinal = (itemExistente?.cantidad ?? 0) + cantidad;

    if (cantidadFinal > producto.proStock) {
        throw new HttpError(`Solo hay ${producto.proStock} unidades disponibles`, 400);
    }

    if (itemExistente) {
        await prisma.carrito_producto.update({
            where: { idCarritoProducto: itemExistente.idCarritoProducto },
            data: { cantidad: cantidadFinal },
        });
    } else {
        await prisma.carrito_producto.create({
            data: {
                carrito:  { connect: { idCarrito: carrito.idCarrito } },
                producto: { connect: { idProducto: idProducto } },
                cantidad,
            },
        });
    }

    return getCarritoService(idUsuario);
}

export async function actualizarCantidadService(idCarritoProducto, idUsuario, cantidad) {
    const item = await prisma.carrito_producto.findFirst({
        where: { idCarritoProducto, carrito: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" } },
        include: { producto: true },
    });

    if (!item) throw new HttpError("Item no encontrado en tu carrito", 404);

    if (cantidad <= 0) {
        await prisma.carrito_producto.delete({ where: { idCarritoProducto } });
    } else {
        if (cantidad > item.producto.proStock) {
            throw new HttpError(`Solo hay ${item.producto.proStock} unidades disponibles`, 400);
        }
        await prisma.carrito_producto.update({ where: { idCarritoProducto }, data: { cantidad } });
    }

    return getCarritoService(idUsuario);
}

export async function eliminarItemService(idCarritoProducto, idUsuario) {
    const item = await prisma.carrito_producto.findFirst({
        where: { idCarritoProducto, carrito: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" } },
    });

    if (!item) throw new HttpError("Item no encontrado en tu carrito", 404);

    await prisma.carrito_producto.delete({ where: { idCarritoProducto } });
    return getCarritoService(idUsuario);
}

export async function pagarCarritoService(idUsuario, metodoPago) {
    const carrito = await prisma.carrito.findFirst({
        where: { fkIdUsuario: idUsuario, carEstado: "ACTIVO" },
        include: { carrito_producto: { include: { producto: true } }, usuario: true },
    });

    if (!carrito)                            throw new HttpError("No tienes un carrito activo", 404);
    if (carrito.carrito_producto.length === 0) throw new HttpError("Tu carrito está vacío", 400);

    const formatted = formatCarrito(carrito);

    const factura = await prisma.$transaction(async (tx) => {
        for (const item of carrito.carrito_producto) {
            if (item.producto.proStock < item.cantidad) {
                throw new HttpError(
                    `Stock insuficiente para "${item.producto.proNombre}". Disponible: ${item.producto.proStock}`,
                    400
                );
            }
            await tx.producto.update({
                where: { idProducto: item.producto.idProducto },
                data:  { proStock: { decrement: item.cantidad } },
            });
        }

        const currentYear = new Date().getFullYear();
        const prefix = `FAC-${currentYear}-`;
        const lastFactura = await tx.factura.findFirst({
            where: { facNumero: { startsWith: prefix } },
            orderBy: { facNumero: "desc" },
        });
        let nextSeq = 1;
        if (lastFactura) {
            const parts = lastFactura.facNumero.split("-");
            const last = parseInt(parts[parts.length - 1]);
            if (!isNaN(last)) nextSeq = last + 1;
        }
        const facNumero = `${prefix}${String(nextSeq).padStart(5, "0")}`;


        const nuevaFactura = await tx.factura.create({
            data: {
                facNumero:     facNumero,
                facFecha:      new Date(),
                facConcepto:   "Compra de productos ópticos - OptiLuxe",
                facCondiciones: metodoPago === "PSE" ? "Pago electrónico PSE" : "Pago en efectivo",
                facSubtotal:   formatted.subtotal,
                facIva:        formatted.iva,
                facTotal:      formatted.total,
                usuario:     { connect: { idUsuario: idUsuario } },
                carrito:     { connect: { idCarrito: carrito.idCarrito } },
            },
        });

        await tx.carrito.update({
            where: { idCarrito: carrito.idCarrito },
            data:  { carEstado: "COMPLETADO" },
        });

        return nuevaFactura;
    });

    // Email de confirmación (fuera de la transacción)
    try {
        await sendEmail({
            to:      carrito.usuario.usuCorreo,
            subject: `Confirmación de compra - ${factura.facNumero}`,
            html:    confirmacionCompraHtml({
                nombreUsuario: carrito.usuario.usuNombre,
                facNumero:     factura.facNumero,
                items:         formatted.items.map((i) => ({
                    nombre:   i.producto.nombre,
                    cantidad: i.cantidad,
                    subtotal: i.subtotal,
                })),
                total: formatted.total,
            }),
        });
    } catch {
        // El pago ya fue procesado; el fallo de email no revierte la compra
    }

    crearNotificacionAutomatica(
        idUsuario,
        "Compra exitosa",
        `Tu pedido #${factura.facNumero} fue procesado por $${formatted.total.toLocaleString("es-CO")}. ¡Gracias por tu compra!`
    ).catch(() => {});

    return {
      idFactura: factura.idFactura,
      facNumero: factura.facNumero,
        metodoPago,
        subtotal:  formatted.subtotal,
        iva:       formatted.iva,
        total:     formatted.total,
    };
}
