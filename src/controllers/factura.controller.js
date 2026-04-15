import * as facturaService from "../services/factura.service.js";

export const getMisFacturas = async (req, res) => {
  try {
    const facturas = await facturaService.getFacturasPorUsuario(req.usuario.idUsuario);
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener tus pedidos", error: error.message });
  }
};

export const getFacturas = async (req, res) => {
  try {
    const facturas = await facturaService.getAllFacturas(req.query);
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener facturas", error: error.message });
  }
};

export const getFactura = async (req, res) => {
  try {
    const factura = await facturaService.getFacturaById(req.params.id);
    if (!factura) return res.status(404).json({ message: "Factura no encontrada" });
    res.json(factura);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la factura", error: error.message });
  }
};

export const postFactura = async (req, res) => {
  try {
    const nueva = await facturaService.createFactura(req.body);
    res.status(201).json(nueva);
  } catch (error) {
    res.status(400).json({ message: "Error al crear factura", error: error.message });
  }
};

export const putFactura = async (req, res) => {
  try {
    const actualizada = await facturaService.updateFactura(req.params.id, req.body);
    res.json(actualizada);
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar factura", error: error.message });
  }
};

export const patchAnularFactura = async (req, res) => {
  try {
    const { motivo } = req.body;
    if (!motivo || motivo.length < 10) {
      return res.status(400).json({ 
        message: "El motivo de anulación es obligatorio (mín. 10 caracteres)" 
      });
    }
    const anulada = await facturaService.anularFactura(req.params.id, motivo);
    res.json(anulada);
  } catch (error) {
    res.status(400).json({ message: "Error al anular factura", error: error.message });
  }
};

export const getEstadisticasVentas = async (req, res) => {
  try {
    const total = await facturaService.obtenerVentasMesService();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas", error: error.message });
  }
};
