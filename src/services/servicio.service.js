import prisma from "../config/prisma.js";

export const getAllServicios = async () => {
    return await prisma.servicio.findMany({
        orderBy: { serNombre: "asc" }
    });
};

export const getServicioById = async (id) => {
    return await prisma.servicio.findUnique({
        where: { idServicio: parseInt(id) }
    });
};

export const createServicio = async (data) => {
    return await prisma.servicio.create({
        data: {
            ...data,
            serPrecio: parseFloat(data.serPrecio),
            serDuracion: parseInt(data.serDuracion)
        }
    });
};

export const updateServicio = async (id, data) => {
    const updateData = { ...data };
    if (data.serPrecio !== undefined) updateData.serPrecio = parseFloat(data.serPrecio);
    if (data.serDuracion !== undefined) updateData.serDuracion = parseInt(data.serDuracion);

    return await prisma.servicio.update({
        where: { idServicio: parseInt(id) },
        data: updateData
    });
};
