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

export const editarUsuario = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const usuario = await usuarioService.editarUsuarioService(id, req.body);
        res.json(usuario);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ message: "El correo o documento ya está en uso por otro usuario." });
        }
        next(error);
    }
};
