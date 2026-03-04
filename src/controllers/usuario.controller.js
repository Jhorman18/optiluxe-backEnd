import * as usuarioService from "../services/usuario.service.js";

export const getEstadisticasPacientes = async (req, res, next) => {
    try {
        const activos = await usuarioService.contarPacientesActivosService();
        res.json({ activos });
    } catch (error) {
        next(error);
    }
};
