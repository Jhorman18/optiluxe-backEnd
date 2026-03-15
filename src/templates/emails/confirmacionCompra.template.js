/**
 * Template HTML para el email de confirmación de compra.
 * @param {object} params
 * @param {string} params.nombreUsuario
 * @param {string} params.facNumero
 * @param {Array}  params.items  - [{ nombre, cantidad, subtotal }]
 * @param {number} params.total
 * @returns {string} HTML listo para enviar
 */
export function confirmacionCompraHtml({ nombreUsuario, facNumero, items, total }) {
    const itemsHtml = items
        .map((item) => `<li>${item.nombre} (x${item.cantidad}) — $${item.subtotal.toLocaleString("es-CO")}</li>`)
        .join("");

    return `
<div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 30px;">
  <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background-color: #ffffff; padding: 30px; text-align: center;">
      <img src="cid:logoOptiLuxe" alt="OptiLuxe Logo" style="max-width:160px;">
    </div>
    <div style="height: 4px; background-color: #D5E0F4;"></div>

    <!-- Contenido -->
    <div style="padding: 30px; color: #333;">
      <h2>Hola ${nombreUsuario},</h2>
      <p>¡Muchas gracias por tu compra! Hemos recibido tu pedido con éxito y estamos trabajando en él para que puedas recoger tus productos.</p>

      <!-- Resumen -->
      <div style="margin-top: 25px; padding: 20px; background-color: #F4F8FD; border-left: 4px solid #D5E0F4;">
        <h3>Resumen de la orden</h3>
        <p><strong>Pedido:</strong> #${facNumero}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-CO")}</p>
        <ul>${itemsHtml}</ul>
        <p style="font-size: 18px;"><strong>Total:</strong> $${total.toLocaleString("es-CO")}</p>
      </div>

      <p style="margin-top: 30px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>

      <!-- Contacto -->
      <div style="margin-top: 20px; padding: 20px; background-color: #F4F8FD; border-radius: 6px; border: 1px solid #E0E8F0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">¿Necesitas ayuda? Contáctanos</h3>
        <p style="margin: 5px 0;">📞 <strong>Teléfono:</strong> +57 310 234 5678</p>
        <p style="margin: 5px 0;">📱 <strong>WhatsApp:</strong> +57 310 123 4567</p>
        <p style="margin: 10px 0 5px 0;">✉️ <strong>Email:</strong> contacto@optiluxe.com</p>
        <p style="margin: 10px 0 5px 0;">🕐 <strong>Horario:</strong> Lun–Vie 9am–7pm · Sáb 9am–3pm</p>
      </div>

      <p style="margin-top: 40px; font-size: 14px; color: #777;">
        © ${new Date().getFullYear()} OptiLuxe - Visión Clara
      </p>
    </div>

  </div>
</div>`;
}
