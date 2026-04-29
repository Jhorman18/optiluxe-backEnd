/**
 * Template HTML para el email de notificación de cambio de contraseña.
 * @param {object} params
 * @param {string} params.nombreUsuario
 * @param {string} params.correo
 * @returns {string} HTML listo para enviar
 */
export function cambioContrasenaHtml({ nombreUsuario, correo }) {
    const fecha = new Date().toLocaleString("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
    });

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
      <p>Te informamos que la contraseña de tu cuenta <strong>${correo}</strong> fue cambiada exitosamente.</p>

      <div style="margin-top: 25px; padding: 20px; background-color: #FFF8F0; border-left: 4px solid #F59E0B; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400E;">
          <strong>⚠️ Fecha del cambio:</strong> ${fecha}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #92400E;">
          Si no realizaste este cambio, comunícate con nosotros inmediatamente.
        </p>
      </div>

      <!-- Contacto -->
      <div style="margin-top: 25px; padding: 20px; background-color: #F4F8FD; border-radius: 6px; border: 1px solid #E0E8F0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">¿Necesitas ayuda? Contáctanos</h3>
        <p style="margin: 5px 0;">📞 <strong>Teléfono:</strong> +57 310 234 5678</p>
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
