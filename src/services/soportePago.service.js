import prisma from "../config/prisma.js";

/**
 * Genera el siguiente número de soporte de pago secuencial: SOP-[CIT]-YYYY-XXXXX
 * @param {Object} tx - Instancia de Prisma (para transacciones)
 * @param {Boolean} isCita - Si es un soporte de cita para aplicar prefijo SOP-CIT
 */
async function _generarSiguienteNumero(tx = prisma, isCita = false) {
  const currentYear = new Date().getFullYear();
  const basePrefix = isCita ? `SOP-CIT-${currentYear}-` : `SOP-${currentYear}-`;

  const lastSoporte = await tx.soporte_pago.findFirst({
    where: { sopNumero: { startsWith: basePrefix } },
    orderBy: { sopNumero: "desc" },
  });

  let nextSequence = 1;
  if (lastSoporte) {
    const parts = lastSoporte.sopNumero.split("-");
    const lastSequence = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
  }

  return `${basePrefix}${nextSequence.toString().padStart(5, "0")}`;
}

export const getAllSoportesPago = async (filtros) => {
  const { busqueda, fechaInicio, fechaFin } = filtros;
  
  const soportes = await prisma.soporte_pago.findMany({
    where: {
      AND: [
        busqueda ? {
          OR: [
            { sopNumero: { contains: busqueda, mode: 'insensitive' } },
            { usuario: { usuNombre: { contains: busqueda, mode: 'insensitive' } } },
            { usuario: { usuApellido: { contains: busqueda, mode: 'insensitive' } } },
            { usuario: { usuDocumento: { contains: busqueda, mode: 'insensitive' } } },
          ]
        } : {},
        fechaInicio ? { sopFecha: { gte: new Date(fechaInicio) } } : {},
        fechaFin ? { sopFecha: { lte: new Date(fechaFin) } } : {},
      ]
    },
    include: {
      usuario: {
        select: { 
          idUsuario: true, 
          usuNombre: true, 
          usuApellido: true, 
          usuDocumento: true, 
          usuCorreo: true 
        }
      }
    },
    orderBy: { sopFecha: 'desc' }
  });

  return soportes.map(f => {
    const subtotal = Number(f.sopSubtotal);
    const total = Number(f.sopTotal);

    const cliente = f.usuario ? {
      nombreCompleto: `${f.usuario.usuNombre} ${f.usuario.usuApellido}`,
      documento: f.usuario.usuDocumento,
      correo: f.usuario.usuCorreo
    } : {
      nombreCompleto: "Consumidor Final",
      documento: "N/A",
      correo: "N/A"
    };

    return {
      ...f,
      cliente,
      sopSubtotal: subtotal,
      sopTotal: total
    };
  });
};

export const getSoportePagoById = async (id) => {
  const soporte = await prisma.soporte_pago.findUnique({
    where: { idSoporte: parseInt(id) },
    include: {
      usuario: {
        select: {
          idUsuario: true,
          usuNombre: true,
          usuApellido: true,
          usuDocumento: true,
          usuCorreo: true,
          usuTelefono: true,
          usuDireccion: true
        }
      },
      carrito: {
        include: {
          carrito_producto: {
            include: { producto: true }
          },
          carrito_servicio: {
            include: { servicio: true }
          },
          usuario: true
        }
      },
      cita: true
    }
  });

  if (!soporte) return null;

  // Formatear datos del cliente para el frontend
  const cliente = soporte.usuario ? {
    nombreCompleto: `${soporte.usuario.usuNombre} ${soporte.usuario.usuApellido}`,
    documento: soporte.usuario.usuDocumento,
    correo: soporte.usuario.usuCorreo,
    telefono: soporte.usuario.usuTelefono,
    direccion: soporte.usuario.usuDireccion
  } : {
    nombreCompleto: "Consumidor Final",
    documento: "N/A",
    correo: "N/A"
  };

  return {
    ...soporte,
    cliente,
    sopSubtotal: Number(soporte.sopSubtotal),
    sopTotal: Number(soporte.sopTotal)
  };
};

export const createSoportePago = async (data) => {
  const {
    sopSubtotal,
    sopTotal,
    fkIdUsuario,
    fkIdCarrito,
    fkIdCita,
    sopNumero,
    items,     // [{ idProducto, cantidad }] → crea carrito_producto y descuenta stock
    servicios, // [{ idServicio, nombre, precio, fecha, hora }] → crea carrito_servicio
    ...rest
  } = data;

  const nuevo = await prisma.$transaction(async (tx) => {
    const tieneItems = Array.isArray(items) && items.length > 0;
    const tieneServicios = Array.isArray(servicios) && servicios.length > 0;

    let finalSubtotal = 0;
    let finalTotal = 0;
    let targetCarritoId = fkIdCarrito ? parseInt(fkIdCarrito) : null;

    if (tieneItems || tieneServicios) {
      if (!fkIdUsuario) throw new Error("Se requiere un cliente para registrar una venta.");

      const nuevoCarrito = await tx.carrito.create({
        data: {
          usuario: { connect: { idUsuario: parseInt(fkIdUsuario) } },
          carEstado: "COMPLETADO",
          carFechaCreacion: new Date()
        }
      });
      targetCarritoId = nuevoCarrito.idCarrito;

      // ── Productos ───────────────────────────────────────────────────────────
      if (tieneItems) {
        // Consolidar duplicados para respetar el unique (fkIdCarrito, fkIdProducto)
        const groupedMap = new Map();
        for (const item of items) {
          const id = parseInt(item.idProducto);
          const qty = parseInt(item.cantidad);
          groupedMap.has(id)
            ? (groupedMap.get(id).cantidad += qty)
            : groupedMap.set(id, { idProducto: id, cantidad: qty });
        }
        const consolidatedItems = Array.from(groupedMap.values());

        const dbProducts = await tx.producto.findMany({
          where: { idProducto: { in: consolidatedItems.map(i => i.idProducto) } }
        });
        const dbMap = new Map(dbProducts.map(p => [p.idProducto, p]));

        for (const item of consolidatedItems) {
          const prod = dbMap.get(item.idProducto);
          if (!prod) throw new Error(`Producto ID ${item.idProducto} no encontrado`);
          if (prod.proStock < item.cantidad)
            throw new Error(`Stock insuficiente para: ${prod.proNombre}. Disponible: ${prod.proStock}`);

          finalSubtotal += Number(prod.proPrecio) * item.cantidad;

          await tx.carrito_producto.create({
            data: {
              carrito: { connect: { idCarrito: targetCarritoId } },
              producto: { connect: { idProducto: item.idProducto } },
              cantidad: item.cantidad
            }
          });
          await tx.producto.update({
            where: { idProducto: item.idProducto },
            data: { proStock: { decrement: item.cantidad } }
          });
        }
      }

      // ── Servicios ───────────────────────────────────────────────────────────
      if (tieneServicios) {
        for (const s of servicios) {
          finalSubtotal += parseFloat(s.precio) || 0;
          await tx.carrito_servicio.create({
            data: {
              carrito: { connect: { idCarrito: targetCarritoId } },
              ...(s.idServicio ? { servicio: { connect: { idServicio: parseInt(s.idServicio) } } } : {}),
              csNombre: s.nombre,
              csPrecio: parseFloat(s.precio) || 0,
              csFecha: s.fecha,
              csHora: s.hora
            }
          });
        }
      }

      finalTotal = finalSubtotal;
    } else {
      // Soporte manual sin carrito (cita externa, pago libre)
      finalSubtotal = parseFloat(sopSubtotal) || 0;
      finalTotal = parseFloat(sopTotal) || 0;
    }

    const isServiceInvoice = !tieneItems;
    const nSoporte = sopNumero || await _generarSiguienteNumero(tx, isServiceInvoice);

    return tx.soporte_pago.create({
      data: {
        ...rest,
        sopNumero: nSoporte,
        sopSubtotal: finalSubtotal,
        sopTotal: finalTotal,
        usuario: fkIdUsuario ? { connect: { idUsuario: parseInt(fkIdUsuario) } } : undefined,
        carrito: targetCarritoId ? { connect: { idCarrito: targetCarritoId } } : undefined,
        cita: fkIdCita ? { connect: { idCita: parseInt(fkIdCita) } } : undefined,
      },
    });
  }, {
    timeout: 20000
  });

  return await getSoportePagoById(nuevo.idSoporte);
};

export const updateSoportePago = async (id, data) => {
  const { sopCondiciones, removedProductos = [], removedServicios = [], itemsActualizados = [] } = data;

  await prisma.$transaction(async (tx) => {
    const soporte = await tx.soporte_pago.findUnique({
      where: { idSoporte: parseInt(id) },
      include: {
        carrito: {
          include: {
            carrito_producto: { include: { producto: true } },
            carrito_servicio: true,
          },
        },
      },
    });
    if (!soporte) throw new Error("Soporte no encontrado");

    // ── Eliminar productos y restaurar stock ─────────────────────────────────
    if (removedProductos.length > 0 && soporte.carrito) {
      for (const cpId of removedProductos) {
        const cp = soporte.carrito.carrito_producto.find(cp => cp.idCarritoProducto === cpId);
        if (!cp) continue;
        await tx.producto.update({
          where: { idProducto: cp.fkIdProducto },
          data: { proStock: { increment: cp.cantidad } },
        });
        await tx.carrito_producto.delete({ where: { idCarritoProducto: cpId } });
      }
    }

    // ── Ajustar cantidades (y stock si cambia) ───────────────────────────────
    if (itemsActualizados.length > 0 && soporte.carrito) {
      for (const item of itemsActualizados) {
        const cp = soporte.carrito.carrito_producto.find(cp => cp.idCarritoProducto === item.idCarritoProducto);
        if (!cp) continue;
        const diff = item.cantidad - cp.cantidad; // positivo = necesita más stock
        if (diff === 0) continue;
        if (diff > 0) {
          const prod = await tx.producto.findUnique({ where: { idProducto: cp.fkIdProducto } });
          if (prod.proStock < diff)
            throw new Error(`Stock insuficiente para "${prod.proNombre}". Disponible: ${prod.proStock}`);
        }
        await tx.producto.update({
          where: { idProducto: cp.fkIdProducto },
          data: { proStock: { decrement: diff } },
        });
        await tx.carrito_producto.update({
          where: { idCarritoProducto: item.idCarritoProducto },
          data: { cantidad: item.cantidad },
        });
      }
    }

    // ── Eliminar servicios ───────────────────────────────────────────────────
    if (removedServicios.length > 0) {
      await tx.carrito_servicio.deleteMany({
        where: { idCarritoServicio: { in: removedServicios } },
      });
    }

    // ── Recalcular total desde el carrito actualizado ────────────────────────
    let nuevoTotal = Number(soporte.sopTotal);
    if (soporte.carrito) {
      const carritoFresh = await tx.carrito.findUnique({
        where: { idCarrito: soporte.fkIdCarrito },
        include: {
          carrito_producto: { include: { producto: true } },
          carrito_servicio: true,
        },
      });
      nuevoTotal = 0;
      for (const cp of carritoFresh.carrito_producto)
        nuevoTotal += Number(cp.producto.proPrecio) * cp.cantidad;
      for (const cs of carritoFresh.carrito_servicio)
        nuevoTotal += Number(cs.csPrecio);
    }

    await tx.soporte_pago.update({
      where: { idSoporte: parseInt(id) },
      data: {
        ...(sopCondiciones !== undefined && { sopCondiciones }),
        sopTotal: nuevoTotal,
        sopSubtotal: nuevoTotal,
      },
    });
  }, { timeout: 20000 });

  return getSoportePagoById(parseInt(id));
};

export const anularSoportePago = async (id, motivo, idUsuarioQueAnula = null) => {
  const anulado = await prisma.soporte_pago.update({
    where: { idSoporte: parseInt(id) },
    data: {
      sopEstado: "ANULADA",
      sopMotivoAnulacion: motivo,
      // Nota: Si se requieren sopAnuladoPor y sopFechaAnulacion, deben agregarse al schema.prisma
    },
  });

  return await getSoportePagoById(anulado.idSoporte);
};

export async function getSoportesPagoPorUsuario(idUsuario) {
  const soportes = await prisma.soporte_pago.findMany({
    where: { fkIdUsuario: parseInt(idUsuario) },
    orderBy: { sopFecha: "desc" },
    include: {
      carrito: {
        include: {
          carrito_producto: {
            include: { producto: true }
          }
        }
      }
    }
  });
  return soportes.map(f => ({
    ...f,
    sopSubtotal: Number(f.sopSubtotal),
    sopTotal:    Number(f.sopTotal),
  }));
}

export async function obtenerVentasMesService() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const aggregateSoportes = await prisma.soporte_pago.aggregate({
    _sum: {
      sopTotal: true
    },
    where: {
      sopFecha: { gte: primerDiaMes },
      sopEstado: "PAGADA"
    }
  });

  return aggregateSoportes._sum.sopTotal ? Number(aggregateSoportes._sum.sopTotal) : 0;
}
