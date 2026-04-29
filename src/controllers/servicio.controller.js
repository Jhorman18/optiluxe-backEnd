import * as servicioService from "../services/servicio.service.js";

export const getServicios = async (req, res, next) => {
    try {
        const servicios = await servicioService.getAllServicios();
        res.json(servicios);
    } catch (error) {
        next(error);
    }
};

export const postServicio = async (req, res, next) => {
    try {
        const nuevo = await servicioService.createServicio(req.body);
        res.status(201).json(nuevo);
    } catch (error) {
        next(error);
    }
};

export const putServicio = async (req, res, next) => {
    try {
        const actualizado = await servicioService.updateServicio(req.params.id, req.body);
        res.json(actualizado);
    } catch (error) {
        next(error);
    }
};
