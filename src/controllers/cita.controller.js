import prisma from "../config/prisma.js";
import { enviarConfirmacionCitaEmail } from "../services/email.service.js";
import * as citaService from "../services/cita.service.js";
import { crearNotificacionAutomatica } from "../services/notificacion.service.js";

// ─── Dashboard Admin ──────────────────────────────────────────────────────────

export const getProximasCitas = async (req, res, next) => {
  try {
    const citas = await citaService.obtenerProximasCitasService();
    res.json(citas);
  } catch (error) {
    next(error);
  }
};

export const getEstadisticasCitas = async (req, res, next) => {
  try {
    const pendientes = await citaService.contarCitasPendientesService();
    res.json({ pendientes });
  } catch (error) {
    next(error);
  }
};

// ─── Disponibilidad (público) ─────────────────────────────────────────────────

/**
 * GET /api/cita/horarios-ocupados?fecha=YYYY-MM-DD
 * Público — no requiere autenticación.
 * Responde: [{ inicio: "HH:MM", fin: "HH:MM" }, ...]
 */
export const getHorariosOcupados = async (req, res, next) => {
  try {
    const { fecha } = req.query;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res
        .status(400)
        .json({ message: "Parametro 'fecha' requerido en formato YYYY-MM-DD." });
    }

    const horarios = await citaService.getHorariosOcupadosService(fecha);
    res.json(horarios);
  } catch (error) {
    next(error);
  }
};

// ─── Registrar cita con pago ──────────────────────────────────────────────────

/**
 * POST /api/cita
 * Requiere autenticacion.
 * Body: { citFecha, citMotivo, citEstado?, citObservaciones?, pago? }
 */
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
      // Usar el servicio para validar y crear la cita respetando horarios y disponibilidad
      const nuevaCita = await citaService.registrarCitaService({
        citFecha,
        citMotivo,
        citEstado: (pago && pago.metodo !== 'EFECTIVO' && pago.estado === 'Aprobado') ? "CONFIRMADA" : (citEstado || "PENDIENTE"),
        citObservaciones,
        fkIdUsuario,
        citDuracion: 30 // Opcional: podrías recibirlo del body
      }, tx);

      let nuevaFactura = null;
      let nuevaEncuesta = null;

      if (pago && pago.totalAPagar && pago.totalAPagar > 0) {
        const nuevoCarrito = await tx.carrito.create({
          data: {
            usuario: { connect: { idUsuario: fkIdUsuario } },
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
            usuario: { connect: { idUsuario: fkIdUsuario } },
            carrito: { connect: { idCarrito: nuevoCarrito.idCarrito } },
            cita:    { connect: { idCita: nuevaCita.idCita } },
          }
        });

      }
      return { cita: nuevaCita, factura: nuevaFactura };
    });

    // Correo de confirmación
    enviarConfirmacionCitaEmail(resultado.cita, req.usuario, resultado.factura);

    // Notificación interna automática de confirmación
    const fechaCita = new Date(resultado.cita.citFecha).toLocaleString("es-CO", {
      dateStyle: "full", timeStyle: "short", timeZone: "UTC",
    });
    crearNotificacionAutomatica(
      fkIdUsuario,
      "Cita confirmada",
      `Tu cita para el ${fechaCita} ha sido registrada exitosamente. Motivo: ${citMotivo}.`,
      false // <-- false para NO enviar correo duplicado, solo DB (Campanita) y Push
    ).catch(() => { });

    return res.status(201).json({
      message: "Cita y pago registrados con éxito",
      data: resultado
    });

  } catch (error) {
    console.error("Error al registrar cita:", error);
    return res.status(500).json({ message: "Error interno.", error: error.message });
  }
};

// ─── Admin: crear cita para un paciente ───────────────────────────────────────

/**
 * POST /api/cita/admin
 * Requiere autenticación admin. Crea una cita asignada a cualquier usuario.
 * Body: { fkIdUsuario, citFecha, citMotivo, citDuracion, citEstado?, citObservaciones? }
 */
export const crearCitaAdmin = async (req, res, next) => {
  try {
    const { fkIdUsuario, citFecha, citMotivo, citDuracion, citEstado, citObservaciones } = req.body;

    if (!fkIdUsuario || !citFecha || !citMotivo || !citDuracion) {
      return res.status(400).json({ message: "Los campos fkIdUsuario, citFecha, citMotivo y citDuracion son obligatorios." });
    }

    const cita = await citaService.crearCitaAdminService({
      fkIdUsuario: parseInt(fkIdUsuario),
      citFecha,
      citMotivo,
      citDuracion: parseInt(citDuracion),
      citEstado,
      citObservaciones,
    });

    const fechaCita = new Date(cita.citFecha).toLocaleString("es-CO", {
      dateStyle: "full", timeStyle: "short", timeZone: "UTC",
    });
    const esPendiente = (cita.citEstado || "PENDIENTE").toUpperCase() === "PENDIENTE";
    crearNotificacionAutomatica(
      cita.fkIdUsuario,
      "Nueva cita agendada",
      esPendiente
        ? `Se te ha agendado una cita para el ${fechaCita}. Motivo: ${citMotivo}. Por favor confírmala y realiza el pago para asegurar tu turno.`
        : `El equipo de OptiLuxe ha agendado una cita confirmada para el ${fechaCita}. Motivo: ${citMotivo}.`
    ).catch(() => {});

    return res.status(201).json({ message: "Cita creada exitosamente.", data: cita });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// ─── Citas del usuario ────────────────────────────────────────────────────────

/**
 * GET /api/cita/mis-citas
 * Requiere autenticacion. Devuelve todas las citas del usuario autenticado.
 */
export const getMisCitas = async (req, res, next) => {
  try {
    const citas = await citaService.getMisCitasService(req.usuario.idUsuario);
    res.json(citas);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cita/tiene-activa
 * Requiere autenticacion. Indica si el usuario tiene una cita futura activa.
 * Responde: { tieneActiva: boolean, cita: object | null }
 */
export const tieneCitaActiva = async (req, res, next) => {
  try {
    const resultado = await citaService.tieneCitaActivaService(req.usuario.idUsuario);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

// ─── Panel Admin: gestión completa ────────────────────────────────────────────

/**
 * GET /api/cita/admin/todas?estado=PENDIENTE&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD&busqueda=texto
 * Requiere autenticación. Devuelve todas las citas con datos del paciente y factura.
 */
export const getAllCitasAdmin = async (req, res, next) => {
  try {
    const { estado, fechaDesde, fechaHasta, busqueda, fkIdUsuario } = req.query;
    const citas = await citaService.getAllCitasAdminService({ estado, fechaDesde, fechaHasta, busqueda, fkIdUsuario });
    res.json(citas);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/cita/:id/estado
 * Requiere autenticación. Cambia el estado de una cita.
 * Body: { estado: "CONFIRMADA" }
 */
export const actualizarEstadoCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: "El campo 'estado' es obligatorio." });
    }

    const citaActualizada = await citaService.actualizarEstadoCitaService(id, estado);

    // Notificación automática al usuario cuando el admin cancela la cita
    if (estado.toUpperCase() === "CANCELADA") {
      const fecha = new Date(citaActualizada.citFecha).toLocaleString("es-CO", {
        dateStyle: "full", timeStyle: "short", timeZone: "UTC",
      });
      crearNotificacionAutomatica(
        citaActualizada.fkIdUsuario,
        "Cita cancelada",
        `Tu cita del ${fecha} ha sido cancelada. Comunícate con nosotros para reprogramarla.`
      ).catch(() => { });
    }

    res.json({ message: "Estado actualizado correctamente.", data: citaActualizada });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/cita/:id/pago
 * Requiere autenticación admin. Registra el pago presencial y cambia estado a EN_ATENCION.
 * Body: { monto: number, metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" }
 */
export const registrarPagoCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { monto, metodoPago } = req.body;

    if (!monto || !metodoPago) {
      return res.status(400).json({ message: "Los campos monto y metodoPago son obligatorios." });
    }

    const { cita, factura } = await citaService.registrarPagoCitaService(id, { monto, metodoPago });

    // Enviar correo de confirmación con la factura
    enviarConfirmacionCitaEmail(cita, cita.usuario, factura);

    crearNotificacionAutomatica(
      cita.fkIdUsuario,
      "Pago registrado — Cita confirmada",
      `Tu pago ha sido registrado exitosamente por un valor de $${Number(monto).toLocaleString("es-CO")}. Tu cita de ${cita.citMotivo} está confirmada.`
    ).catch(() => {});

    return res.status(200).json({ message: "Pago registrado y cita confirmada.", data: cita });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

/**
 * PATCH /api/cita/:id/reprogramar
 * Requiere autenticación. Cambia la fecha/hora de una cita.
 * Body: { fecha: "2026-03-15T10:00:00.000Z" }
 */
export const reprogramarCita = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fecha } = req.body;

    if (!fecha) {
      return res.status(400).json({ message: "El campo 'fecha' es obligatorio." });
    }

    const citaActualizada = await citaService.reprogramarCitaService(id, fecha);

    // Notificación automática de reprogramación
    const nuevaFecha = new Date(citaActualizada.citFecha).toLocaleString("es-CO", {
      dateStyle: "full", timeStyle: "short", timeZone: "UTC",
    });
    crearNotificacionAutomatica(
      citaActualizada.fkIdUsuario,
      "Cita reprogramada",
      `Tu cita ha sido reprogramada para el ${nuevaFecha}. Motivo: ${citaActualizada.citMotivo}.`
    ).catch(() => { });

    res.json({ message: "Cita reprogramada correctamente.", data: citaActualizada });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};
