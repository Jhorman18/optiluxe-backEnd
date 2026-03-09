import * as citaService from "../services/cita.service.js";

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

/**
 * POST /api/cita
 * Requiere autenticacion.
 * Body: { citMotivo, citFecha, citEstado?, citObservaciones?, citDuracion, fkIdUsuario }
 */
export const registrarCita = async (req, res, next) => {
  try {
    const {
      citMotivo,
      citFecha,
      citEstado,
      citObservaciones,
      citDuracion,
      fkIdUsuario,
    } = req.body;

    if (!citMotivo || !citFecha || !citDuracion || !fkIdUsuario) {
      return res.status(400).json({
        message: "Faltan campos requeridos: citMotivo, citFecha, citDuracion, fkIdUsuario.",
      });
    }

    const cita = await citaService.registrarCitaService({
      citMotivo,
      citFecha,
      citEstado,
      citObservaciones,
      citDuracion: parseInt(citDuracion, 10),
      fkIdUsuario: parseInt(fkIdUsuario, 10),
    });

    res.status(201).json({ message: "Cita agendada exitosamente.", cita });
  } catch (error) {
    next(error);
  }
};

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
