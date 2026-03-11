import * as usuarioService from "../services/usuario.service.js";

export const getEstadisticasPacientes = async (req, res, next) => {
    try {
        const activos = await usuarioService.contarPacientesActivosService();
        res.json({ activos });
    } catch (error) {
        next(error);
    }
};

export const getUsuarios = async (req, res, next) => {
    try {
        const { busqueda, rol } = req.query;
        const usuarios = await usuarioService.listarUsuariosService({ busqueda, rol });
        res.json(usuarios);
    } catch (error) {
        next(error);
    }
};

export const toggleEstadoUsuario = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { estado } = req.body;
        const usuario = await usuarioService.toggleEstadoUsuarioService(id, estado);
        res.json(usuario);
    } catch (error) {
        next(error);
    }
};
