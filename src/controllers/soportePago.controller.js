import * as soportePagoService from "../services/soportePago.service.js";
import { enviarSoportePagoEmail, enviarConfirmacionCitaEmail } from "../services/email.service.js";
import { crearNotificacionAutomatica } from "../services/notificacion.service.js";

export const getMisSoportesPago = async (req, res) => {
  try {
    const soportes = await soportePagoService.getSoportesPagoPorUsuario(req.usuario.idUsuario);
    res.json(soportes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener tus pedidos", error: error.message });
  }
};

export const getSoportesPago = async (req, res) => {
  try {
    const soportes = await soportePagoService.getAllSoportesPago(req.query);
    res.json(soportes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener soportes de pago", error: error.message });
  }
};

export const getSoportePago = async (req, res) => {
  try {
    const soporte = await soportePagoService.getSoportePagoById(req.params.id);
    if (!soporte) return res.status(404).json({ message: "Soporte de pago no encontrado" });
    res.json(soporte);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el soporte de pago", error: error.message });
  }
};
export const postSoportePago = async (req, res) => {
  try {
    const nuevo = await soportePagoService.createSoportePago(req.body);

    // Enviar correos y notificaciones en segundo plano
    (async () => {
      try {
        // 1. Notificación en el sistema
        await crearNotificacionAutomatica(
          nuevo.fkIdUsuario,
          "Nuevo Soporte de Pago Generado",
          `Se ha generado el soporte de pago ${nuevo.sopNumero} por un valor de $${Number(nuevo.sopTotal).toLocaleString("es-CO")}.`,
          false // El correo lo enviamos específicamente con el formato de soporte abajo
        );

        // 2. Correo electrónico según tipo
        if (nuevo.cita) {
          // Si es una cita agendada, enviamos confirmación de cita
          await enviarConfirmacionCitaEmail(nuevo.cita, nuevo.usuario, nuevo);
        } else {
          // Si es producto o servicio manual, enviamos comprobante de venta
          await enviarSoportePagoEmail(nuevo);
        }
      } catch (err) {
        console.error("Error en notificaciones post-soporte-pago:", err);
      }
    })();

    res.status(201).json(nuevo);
  } catch (error) {
    res.status(400).json({ message: "Error al crear soporte de pago", error: error.message });
  }
};

export const putSoportePago = async (req, res) => {
  try {
    const actualizado = await soportePagoService.updateSoportePago(req.params.id, req.body);
    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar soporte de pago", error: error.message });
  }
};

export const patchAnularSoportePago = async (req, res) => {
  try {
    const { motivo } = req.body;
    if (!motivo || motivo.length < 10) {
      return res.status(400).json({ 
        message: "El motivo de anulación es obligatorio (mín. 10 caracteres)" 
      });
    }
    const anulado = await soportePagoService.anularSoportePago(req.params.id, motivo, req.usuario.idUsuario);
    res.json(anulado);
  } catch (error) {
    res.status(400).json({ message: "Error al anular soporte de pago", error: error.message });
  }
};

export const getEstadisticasVentas = async (req, res) => {
  try {
    const total = await soportePagoService.obtenerVentasMesService();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas", error: error.message });
  }
};
