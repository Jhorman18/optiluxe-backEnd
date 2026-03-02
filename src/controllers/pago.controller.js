export async function procesarPago(req, res, next) {
  try {
    const usuario = req.user;
    const { carritoId } = req.body;

    // 1. Validar carrito
    // 2. Calcular subtotal
    // 3. Simular pago exitoso

    // 4. Crear factura automáticamente
    const factura = await crearFacturaService({
      facNumero: generarNumeroFactura(),
      facFecha: new Date(),
      facConcepto: "Compra online óptica",
      facCondicionesPago: "Pago online",
      facSubtotal: subtotal,
      facIva: subtotal * 0.19,
      facTotal: subtotal * 1.19,
      fkIdCarrito: carritoId
    });

    // 5. Enviar correo
    await enviarFacturaCorreo(usuario.correo, factura);

    res.json({ message: "Pago exitoso y factura enviada" });

  } catch (error) {
    next(error);
  }
}