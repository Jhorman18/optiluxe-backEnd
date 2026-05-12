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
    items, // Si se pasan [{ idProducto, cantidad }], calculamos totales y creamos carrito
    ...rest 
  } = data;

  const nuevo = await prisma.$transaction(async (tx) => {
    let finalSubtotal = parseFloat(sopSubtotal) || 0;
    let finalTotal = parseFloat(sopTotal) || 0;
    let targetCarritoId = fkIdCarrito ? parseInt(fkIdCarrito) : null;

    // Si se proporcionan items, creamos un carrito y calculamos totales automáticamente
    if (items && Array.isArray(items) && items.length > 0) {
      if (!fkIdUsuario) throw new Error("Para crear un soporte de pago con productos se requiere un cliente (fkIdUsuario).");

      const nuevoCarrito = await tx.carrito.create({
        data: {
          usuario: { connect: { idUsuario: parseInt(fkIdUsuario) } },
          carEstado: "COMPLETADO",
          carFechaCreacion: new Date()
        }
      });
      targetCarritoId = nuevoCarrito.idCarrito;

      // Consolidamos items por producto para evitar errores de constraint único (fkIdCarrito, fkIdProducto)
      const groupedItemsMap = new Map();
      for (const item of items) {
        const id = parseInt(item.idProducto);
        const qty = parseInt(item.cantidad);
        if (groupedItemsMap.has(id)) {
          groupedItemsMap.get(id).cantidad += qty;
        } else {
          groupedItemsMap.set(id, { idProducto: id, cantidad: qty });
        }
      }
      const consolidatedItems = Array.from(groupedItemsMap.values());

      // Optimizamos: Obtenemos todos los productos involucrados en una sola consulta
      const productIds = consolidatedItems.map(item => item.idProducto);
      const dbProductsList = await tx.producto.findMany({
        where: { idProducto: { in: productIds } }
      });

      const dbProductsMap = new Map(dbProductsList.map(p => [p.idProducto, p]));
      let subtotalAcumulado = 0;

      for (const item of consolidatedItems) {
        const prodId = item.idProducto;
        const prod = dbProductsMap.get(prodId);

        if (!prod) throw new Error(`Producto ID ${prodId} no encontrado`);
        if (prod.proStock < item.cantidad) {
          throw new Error(`Stock insuficiente para: ${prod.proNombre}. Stock disponible: ${prod.proStock}`);
        }

        const price = Number(prod.proPrecio);
        subtotalAcumulado += price * item.cantidad;

        await tx.carrito_producto.create({
          data: {
            carrito: { connect: { idCarrito: targetCarritoId } },
            producto: { connect: { idProducto: prodId } },
            cantidad: item.cantidad
          }
        });

        await tx.producto.update({
          where: { idProducto: prodId },
          data: { proStock: { decrement: item.cantidad } }
        });
      }

      finalSubtotal = subtotalAcumulado;
      finalTotal = finalSubtotal; // Sin IVA
    }

    // Determinamos si es un soporte de cita/servicio o de productos para el prefijo
    const isServiceInvoice = !items || !Array.isArray(items) || items.length === 0;
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
    timeout: 20000 // Aumentamos el timeout a 20 segundos para evitar errores en servidores lentos
  });

  return await getSoportePagoById(nuevo.idSoporte);
};

export const updateSoportePago = async (id, data) => {
  const { sopSubtotal, sopTotal, fkIdUsuario, fkIdCarrito, ...rest } = data;
  
  const updateData = { ...rest };
  if (sopSubtotal !== undefined) updateData.sopSubtotal = parseFloat(sopSubtotal);
  if (sopTotal !== undefined) updateData.sopTotal = parseFloat(sopTotal);
  if (fkIdUsuario !== undefined) updateData.usuario = fkIdUsuario ? { connect: { idUsuario: parseInt(fkIdUsuario) } } : { disconnect: true };
  if (fkIdCarrito !== undefined) updateData.carrito = fkIdCarrito ? { connect: { idCarrito: parseInt(fkIdCarrito) } } : { disconnect: true };

  const actualizado = await prisma.soporte_pago.update({
    where: { idSoporte: parseInt(id) },
    data: updateData
  });

  return await getSoportePagoById(actualizado.idSoporte);
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
