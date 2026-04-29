import prisma from "../config/prisma.js";

/**
 * Genera el siguiente número de factura secuencial: FAC-[CIT]-YYYY-XXXXX
 * @param {Object} tx - Instancia de Prisma (para transacciones)
 * @param {Boolean} isCita - Si es una factura de cita para aplicar prefijo FAC-CIT
 */
async function _generarSiguienteNumero(tx = prisma, isCita = false) {
  const currentYear = new Date().getFullYear();
  const basePrefix = isCita ? `FAC-CIT-${currentYear}-` : `FAC-${currentYear}-`;

  const lastFactura = await tx.factura.findFirst({
    where: { facNumero: { startsWith: basePrefix } },
    orderBy: { facNumero: "desc" },
  });

  let nextSequence = 1;
  if (lastFactura) {
    const parts = lastFactura.facNumero.split("-");
    const lastSequence = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
  }

  return `${basePrefix}${nextSequence.toString().padStart(5, "0")}`;
}

export const getAllFacturas = async (filtros) => {
  const { busqueda, fechaInicio, fechaFin } = filtros;
  
  const facturas = await prisma.factura.findMany({
    where: {
      AND: [
        busqueda ? {
          OR: [
            { facNumero: { contains: busqueda, mode: 'insensitive' } },
            { usuario: { usuNombre: { contains: busqueda, mode: 'insensitive' } } },
            { usuario: { usuApellido: { contains: busqueda, mode: 'insensitive' } } },
            { usuario: { usuDocumento: { contains: busqueda, mode: 'insensitive' } } },
          ]
        } : {},
        fechaInicio ? { facFecha: { gte: new Date(fechaInicio) } } : {},
        fechaFin ? { facFecha: { lte: new Date(fechaFin) } } : {},
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
    orderBy: { facFecha: 'desc' }
  });

  return facturas.map(f => {
    const subtotal = Number(f.facSubtotal);
    const iva = Number(f.facIva);
    const total = Number(f.facTotal);

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
      facSubtotal: subtotal,
      facIva: iva,
      facTotal: total
    };
  });
};

export const getFacturaById = async (id) => {
  const factura = await prisma.factura.findUnique({
    where: { idFactura: parseInt(id) },
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

  if (!factura) return null;

  // Formatear datos del cliente para el frontend
  const cliente = factura.usuario ? {
    nombreCompleto: `${factura.usuario.usuNombre} ${factura.usuario.usuApellido}`,
    documento: factura.usuario.usuDocumento,
    correo: factura.usuario.usuCorreo,
    telefono: factura.usuario.usuTelefono,
    direccion: factura.usuario.usuDireccion
  } : {
    nombreCompleto: "Consumidor Final",
    documento: "N/A",
    correo: "N/A"
  };

  return {
    ...factura,
    cliente,
    facSubtotal: Number(factura.facSubtotal),
    facIva: Number(factura.facIva),
    facTotal: Number(factura.facTotal)
  };
};

export const createFactura = async (data) => {
  const { 
    facSubtotal, 
    facIva, 
    facTotal, 
    fkIdUsuario, 
    fkIdCarrito, 
    fkIdCita, 
    facNumero, 
    items, // Si se pasan [{ idProducto, cantidad }], calculamos totales y creamos carrito
    ...rest 
  } = data;

  const nueva = await prisma.$transaction(async (tx) => {
    let finalSubtotal = parseFloat(facSubtotal) || 0;
    let finalIva = parseFloat(facIva) || 0;
    let finalTotal = parseFloat(facTotal) || 0;
    let targetCarritoId = fkIdCarrito ? parseInt(fkIdCarrito) : null;

    // Si se proporcionan items, creamos un carrito y calculamos totales automáticamente
    if (items && Array.isArray(items) && items.length > 0) {
      if (!fkIdUsuario) throw new Error("Para crear una factura con productos se requiere un cliente (fkIdUsuario).");

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
      finalIva = finalSubtotal * 0.19;
      finalTotal = finalSubtotal + finalIva;
    }

    // Determinamos si es una factura de cita/servicio o de productos para el prefijo
    const isServiceInvoice = !items || !Array.isArray(items) || items.length === 0;
    const nFactura = facNumero || await _generarSiguienteNumero(tx, isServiceInvoice);

    return tx.factura.create({
      data: {
        ...rest,
        facNumero: nFactura,
        facSubtotal: finalSubtotal,
        facIva: finalIva,
        facTotal: finalTotal,
        usuario: fkIdUsuario ? { connect: { idUsuario: parseInt(fkIdUsuario) } } : undefined,
        carrito: targetCarritoId ? { connect: { idCarrito: targetCarritoId } } : undefined,
        cita: fkIdCita ? { connect: { idCita: parseInt(fkIdCita) } } : undefined,
      },
    });
  }, {
    timeout: 20000 // Aumentamos el timeout a 20 segundos para evitar errores en servidores lentos
  });

  return await getFacturaById(nueva.idFactura);
};

export const updateFactura = async (id, data) => {
  const { facSubtotal, facIva, facTotal, fkIdUsuario, fkIdCarrito, ...rest } = data;
  
  const updateData = { ...rest };
  if (facSubtotal !== undefined) updateData.facSubtotal = parseFloat(facSubtotal);
  if (facIva !== undefined) updateData.facIva = parseFloat(facIva);
  if (facTotal !== undefined) updateData.facTotal = parseFloat(facTotal);
  if (fkIdUsuario !== undefined) updateData.usuario = fkIdUsuario ? { connect: { idUsuario: parseInt(fkIdUsuario) } } : { disconnect: true };
  if (fkIdCarrito !== undefined) updateData.carrito = fkIdCarrito ? { connect: { idCarrito: parseInt(fkIdCarrito) } } : { disconnect: true };

  const actualizada = await prisma.factura.update({
    where: { idFactura: parseInt(id) },
    data: updateData
  });

  return await getFacturaById(actualizada.idFactura);
};

export const anularFactura = async (id, motivo, idUsuarioQueAnula = null) => {
  const anulada = await prisma.factura.update({
    where: { idFactura: parseInt(id) },
    data: {
      facEstado: "ANULADA",
      facMotivoAnulacion: motivo,
      facAnuladoPor: idUsuarioQueAnula,
      facFechaAnulacion: new Date(),
    },
  });

  return await getFacturaById(anulada.idFactura);
};

export async function getFacturasPorUsuario(idUsuario) {
  const facturas = await prisma.factura.findMany({
    where: { fkIdUsuario: parseInt(idUsuario) },
    orderBy: { facFecha: "desc" },
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
  return facturas.map(f => ({
    ...f,
    facSubtotal: Number(f.facSubtotal),
    facIva:      Number(f.facIva),
    facTotal:    Number(f.facTotal),
  }));
}

export async function obtenerVentasMesService() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const aggregateFacturas = await prisma.factura.aggregate({
    _sum: {
      facTotal: true
    },
    where: {
      facFecha: { gte: primerDiaMes },
      facEstado: "PAGADA"
    }
  });

  return aggregateFacturas._sum.facTotal ? Number(aggregateFacturas._sum.facTotal) : 0;
}
