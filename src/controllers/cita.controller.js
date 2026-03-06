import prisma from "../config/prisma.js";
import { enviarConfirmacionCitaEmail } from "../services/email.service.js";

export const registrarCita = async (req, res) => {
  try {
    const { 
      citFecha, 
      citMotivo, 
      citEstado, 
      citObservaciones,
      pago 
    } = req.body;
    
    const fkIdUsuario = req.usuario.idUsuario; 

    if (!citFecha || !citMotivo) {
      return res.status(400).json({ message: "La fecha y el motivo son obligatorios." });
    }

    const resultado = await prisma.$transaction(async (tx) => {
        
        const nuevaCita = await tx.cita.create({
          data: {
            citFecha: new Date(citFecha),
            citMotivo,
            citEstado: (pago && pago.metodo !== 'EFECTIVO' && pago.estado === 'Aprobado') ? "Confirmada" : (citEstado || "Pendiente"),
            citObservaciones,
            fkIdUsuario,
          },
        });

        let nuevaFactura = null;
        let nuevaEncuesta = null;

        if (pago && pago.totalAPagar && pago.totalAPagar > 0) {
            
            const nuevoCarrito = await tx.carrito.create({
                data: {
                    fkIdUsuario,
                    carEstado: "Completado",
                    carFechaCreacion: new Date()
                }
            });

            const countFacturas = await tx.factura.count();
            const facNumero = `FAC-CIT-${new Date().getFullYear()}-${(countFacturas + 1).toString().padStart(5, '0')}`;
            
            const total = parseFloat(pago.totalAPagar);
            const subtotal = total / 1.19;
            const iva = total - subtotal;

            nuevaFactura = await tx.factura.create({
               data: {
                 facNumero,
                 facConcepto: `Pago de servicio: ${citMotivo}`,
                 facCondiciones: `Método: ${pago.metodo}`,
                 facSubtotal: subtotal.toFixed(2),
                 facIva: iva.toFixed(2),
                 facTotal: total,
                 fkIdCarrito: nuevoCarrito.idCarrito
               }
            });

            nuevaEncuesta = await tx.encuesta.create({
                data: {
                    enFecha: new Date(),
                    enTipo: "Servicio Cita",
                    fkIdCita: nuevaCita.idCita,
                    fkIdFactura: nuevaFactura.idFactura
                }
            });
        }

        return { cita: nuevaCita, factura: nuevaFactura, encuesta: nuevaEncuesta };
    });

    // Enviar correo de confirmación (fire-and-forget, no bloquea la respuesta)
    enviarConfirmacionCitaEmail(resultado.cita, req.usuario, resultado.factura);

    return res.status(201).json({ 
      message: "Cita y pago registrados con éxito", 
      data: resultado 
    });

  } catch (error) {
    console.error("Error al registrar cita:", error);
    return res.status(500).json({ message: "Error interno.", error: error.message });
  }
};

export const obtenerMisCitas = async (req, res) => {
  try {
    const fkIdUsuario = req.usuario.idUsuario;

    const citas = await prisma.cita.findMany({
      where: { fkIdUsuario },
      orderBy: { citFecha: 'asc' }
    });

    return res.status(200).json(citas);
  } catch (error) {
    console.error("Error al obtener citas:", error);
    return res.status(500).json({ message: "Error interno al recuperar las citas." });
  }
};
