import prisma from "../config/prisma.js";

/**
 * Genera el siguiente número de factura secuencial: FAC-YYYY-XXXXX
 */
export async function _generarSiguienteNumero() {
  const currentYear = new Date().getFullYear();
  const prefix = `FAC-${currentYear}-`;
  
  const lastFactura = await prisma.factura.findFirst({
    where: {
      facNumero: { startsWith: prefix }
    },
    orderBy: { facNumero: 'desc' },
  });

  let nextSequence = 1;
  if (lastFactura) {
    const parts = lastFactura.facNumero.split('-');
    const lastSequence = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
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
          }
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
  const { facSubtotal, facIva, facTotal, fkIdUsuario, fkIdCarrito, fkIdCita, fkIdProducto, facNumero, ...rest } = data;
  
  // Si no viene número de factura, lo generamos automáticamente
  const nFactura = facNumero || await _generarSiguienteNumero();

  const nueva = await prisma.factura.create({
    data: {
      ...rest,
      facNumero: nFactura,
      facSubtotal: parseFloat(facSubtotal),
      facIva: parseFloat(facIva),
      facTotal: parseFloat(facTotal),
      fkIdUsuario: fkIdUsuario ? parseInt(fkIdUsuario) : null,
      fkIdCarrito: fkIdCarrito ? parseInt(fkIdCarrito) : null,
      fkIdCita: fkIdCita ? parseInt(fkIdCita) : null,
      fkIdProducto: fkIdProducto ? parseInt(fkIdProducto) : null,
    }
  });

  return await getFacturaById(nueva.idFactura);
};

export const updateFactura = async (id, data) => {
  const { facSubtotal, facIva, facTotal, fkIdUsuario, fkIdCarrito, ...rest } = data;
  
  const updateData = { ...rest };
  if (facSubtotal !== undefined) updateData.facSubtotal = parseFloat(facSubtotal);
  if (facIva !== undefined) updateData.facIva = parseFloat(facIva);
  if (facTotal !== undefined) updateData.facTotal = parseFloat(facTotal);
  if (fkIdUsuario !== undefined) updateData.fkIdUsuario = fkIdUsuario ? parseInt(fkIdUsuario) : null;
  if (fkIdCarrito !== undefined) updateData.fkIdCarrito = fkIdCarrito ? parseInt(fkIdCarrito) : null;

  const actualizada = await prisma.factura.update({
    where: { idFactura: parseInt(id) },
    data: updateData
  });

  return await getFacturaById(actualizada.idFactura);
};

export const anularFactura = async (id, motivo) => {
  const anulada = await prisma.factura.update({
    where: { idFactura: parseInt(id) },
    data: {
      facEstado: "ANULADA",
      facMotivoAnulacion: motivo
    }
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
