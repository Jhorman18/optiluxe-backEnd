import {
  crearHistoriaClinicaService,
  listarHistoriasClinicasService,
  obtenerHistoriaPorCitaService,
  obtenerHistoriaPorIdService,
} from "../services/historiaClinica.service.js";

export const crearHistoriaClinica = async (req, res, next) => {
  try {
    const { idCita } = req.params;
    const historia = await crearHistoriaClinicaService(idCita, req.body);
    res.status(201).json({ message: "Historia clínica registrada", historia });
  } catch (error) {
    next(error);
  }
};

export const listarHistoriasClinicas = async (req, res, next) => {
  try {
    const { busqueda } = req.query;
    const historias = await listarHistoriasClinicasService({ busqueda });
    res.json({ historias });
  } catch (error) {
    next(error);
  }
};

export const obtenerHistoriaPorCita = async (req, res, next) => {
  try {
    const { idCita } = req.params;
    const historia = await obtenerHistoriaPorCitaService(idCita);
    if (!historia) return res.status(404).json({ message: "No hay historia para esta cita" });
    res.json({ historia });
  } catch (error) {
    next(error);
  }
};

export const obtenerHistoria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const historia = await obtenerHistoriaPorIdService(id);
    res.json({ historia });
  } catch (error) {
    next(error);
  }
};
