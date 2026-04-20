import * as facturaService from "../services/factura.service.js";
import { enviarFacturaEmail, enviarConfirmacionCitaEmail } from "../services/email.service.js";
import { crearNotificacionAutomatica } from "../services/notificacion.service.js";

export const getMisFacturas = async (req, res) => {
  try {
    const facturas = await facturaService.getFacturasPorUsuario(req.usuario.idUsuario);
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener tus pedidos", error: error.message });
  }
};

export const getFacturas = async (req, res) => {
  try {
    const facturas = await facturaService.getAllFacturas(req.query);
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener facturas", error: error.message });
  }
};

export const getFactura = async (req, res) => {
  try {
    const factura = await facturaService.getFacturaById(req.params.id);
    if (!factura) return res.status(404).json({ message: "Factura no encontrada" });
    res.json(factura);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la factura", error: error.message });
  }
};
export const postFactura = async (req, res) => {
  try {
    const nueva = await facturaService.createFactura(req.body);

    // Enviar correos y notificaciones en segundo plano
    (async () => {
      try {
        // 1. Notificación en el sistema
        await crearNotificacionAutomatica(
          nueva.fkIdUsuario,
          "Nueva Factura Generada",
          `Se ha generado la factura ${nueva.facNumero} por un valor de $${Number(nueva.facTotal).toLocaleString("es-CO")}.`,
          false // El correo lo enviamos específicamente con el formato de factura abajo
        );

        // 2. Correo electrónico según tipo
        if (nueva.cita) {
          // Si es una cita agendada, enviamos confirmación de cita
          await enviarConfirmacionCitaEmail(nueva.cita, nueva.usuario, nueva);
        } else {
          // Si es producto o servicio manual, enviamos comprobante de venta
          await enviarFacturaEmail(nueva);
        }
      } catch (err) {
        console.error("Error en notificaciones post-factura:", err);
      }
    })();

    res.status(201).json(nueva);
  } catch (error) {
    res.status(400).json({ message: "Error al crear factura", error: error.message });
  }
};

export const putFactura = async (req, res) => {
  try {
    const actualizada = await facturaService.updateFactura(req.params.id, req.body);
    res.json(actualizada);
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar factura", error: error.message });
  }
};

export const patchAnularFactura = async (req, res) => {
  try {
    const { motivo } = req.body;
    if (!motivo || motivo.length < 10) {
      return res.status(400).json({ 
        message: "El motivo de anulación es obligatorio (mín. 10 caracteres)" 
      });
    }
    const anulada = await facturaService.anularFactura(req.params.id, motivo, req.usuario.idUsuario);
    res.json(anulada);
  } catch (error) {
    res.status(400).json({ message: "Error al anular factura", error: error.message });
  }
};

export const getEstadisticasVentas = async (req, res) => {
  try {
    const total = await facturaService.obtenerVentasMesService();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas", error: error.message });
  }
};
