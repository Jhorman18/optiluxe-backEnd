import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpErrors.js";

export const getReporteVentas = async (req, res, next) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        const where = {};
        if (fechaInicio || fechaFin) {
            where.facFecha = {};
            if (fechaInicio) {
                // Forzamos interpretación local para que coincida con el calendario del usuario
                where.facFecha.gte = new Date(fechaInicio + "T00:00:00");
            }
            if (fechaFin) {
                // Forzamos fin de día local
                where.facFecha.lte = new Date(fechaFin + "T23:59:59");
            }
        }

        const facturas = await prisma.factura.findMany({
            where,
            include: {
                usuario: {
                    select: {
                        usuNombre: true,
                        usuApellido: true,
                        usuDocumento: true
                    }
                }
            },
            orderBy: { facFecha: "desc" }
        });

        // Separar efectivas de anuladas
        const efectivas = facturas.filter(f => f.facEstado === "PAGADA");
        const anuladas = facturas.filter(f => f.facEstado === "ANULADA");

        const resumen = {
            totalEfectivas: efectivas.length,
            totalAnuladas: anuladas.length,
            montoTotalEfectivas: efectivas.reduce((acc, f) => acc + Number(f.facTotal), 0),
            montoTotalAnuladas: anuladas.reduce((acc, f) => acc + Number(f.facTotal), 0),
        };

        res.json({ resumen, efectivas, anuladas });
    } catch (error) {
        next(error);
    }
};

export const getReporteInventario = async (req, res, next) => {
    try {
        const productos = await prisma.producto.findMany({
            include: {
                categoria: true
            },
            orderBy: { proNombre: "asc" }
        });

        const stockBajo = productos.filter(p => p.proStock < 5);
        
        const resumen = {
            totalProductos: productos.length,
            productosStockBajo: stockBajo.length,
            valorTotalInventario: productos.reduce((acc, p) => acc + (Number(p.proPrecio) * p.proStock), 0)
        };

        res.json({ resumen, productos, stockBajo });
    } catch (error) {
        next(error);
    }
};

export const getReporteCitas = async (req, res, next) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        const where = {};
        if (fechaInicio || fechaFin) {
            where.citFecha = {};
            if (fechaInicio) {
                where.citFecha.gte = new Date(fechaInicio + "T00:00:00");
            }
            if (fechaFin) {
                where.citFecha.lte = new Date(fechaFin + "T23:59:59");
            }
        }

        const citas = await prisma.cita.findMany({
            where,
            include: {
                usuario: {
                    select: {
                        usuNombre: true,
                        usuApellido: true
                    }
                }
            },
            orderBy: { citFecha: "desc" }
        });

        const porEstado = citas.reduce((acc, c) => {
            acc[c.citEstado] = (acc[c.citEstado] || 0) + 1;
            return acc;
        }, {});

        res.json({ 
            resumen: {
                totalCitas: citas.length,
                ...porEstado
            }, 
            citas 
        });
    } catch (error) {
        next(error);
    }
};
