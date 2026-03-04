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
