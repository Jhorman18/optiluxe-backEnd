import nodemailer from "nodemailer";
import path from "path";

console.log("📨 Configurando servicio de correo...");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "CARGADO ✅" : "NO CARGADO ❌");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error de conexión SMTP:", error);
  } else {
    console.log("✅ Servidor SMTP listo para enviar correos");
  }
});

const logoPath = path.join(process.cwd(), "public", "Logo.png");

const logoAttachment = {
  filename: "Logo.png",
  path: logoPath,
  cid: "logoOptiLuxe",
};

const contactoHTML = `
  <div style="margin-top: 30px; padding: 20px; background-color: #F4F8FD; border-radius: 6px; border: 1px solid #E0E8F0;">
    <h3 style="margin: 0 0 15px 0; color: #333;">¿Necesitas ayuda? Contáctanos</h3>

    <p style="margin: 5px 0;">📞 <strong>Teléfono:</strong> +57 1 234 5678</p>
    <p style="margin: 5px 0;">📱 <strong>WhatsApp:</strong> +57 310 123 4567</p>

    <p style="margin: 10px 0 5px 0;">✉️ <strong>Email:</strong></p>
    <p style="margin: 2px 0 2px 15px;">contacto@optiluxe.com</p>
    <p style="margin: 2px 0 2px 15px;">citas@optiluxe.com</p>

    <p style="margin: 10px 0 5px 0;">🕐 <strong>Horario de Atención:</strong></p>
    <p style="margin: 2px 0 2px 15px;">Lunes a Viernes: 9:00 AM - 7:00 PM</p>
    <p style="margin: 2px 0 2px 15px;">Sábados: 9:00 AM - 3:00 PM</p>
    <p style="margin: 2px 0 2px 15px;">Domingos y festivos: Cerrado</p>
  </div>
`;

export const enviarFacturaEmail = async (factura) => {
  try {
    console.log("📧 Entrando a enviarFacturaEmail...");

    // Fallback de usuario: Priorizar el del carrito (si existe) o el de la factura
    const usuario = factura.carrito?.usuario || factura.usuario;
    if (!usuario) throw new Error("No se encontró información de usuario para enviar el correo.");

    // Generar HTML de items: Si hay carrito usa productos, si no, usa el concepto de la factura
    let productosHTML = "";
    if (factura.carrito && factura.carrito.carrito_producto?.length > 0) {
      productosHTML = factura.carrito.carrito_producto
        .map((item) => {
          const subtotal = Number(item.producto.proPrecio) * item.cantidad;
          return `
            <tr>
              <td style="padding: 10px; border: 1px solid #eee;">${item.producto.proNombre}</td>
              <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${item.cantidad}</td>
              <td style="padding: 10px; border: 1px solid #eee;">$${Number(item.producto.proPrecio).toLocaleString("es-CO")}</td>
              <td style="padding: 10px; border: 1px solid #eee;">$${subtotal.toLocaleString("es-CO")}</td>
            </tr>
          `;
        })
        .join("");
    } else {
      // Caso de servicio manual o catálogo sin carrito
      productosHTML = `
        <tr>
          <td style="padding: 10px; border: 1px solid #eee;">${factura.facConcepto}</td>
          <td style="padding: 10px; border: 1px solid #eee; text-align: center;">1</td>
          <td style="padding: 10px; border: 1px solid #eee;">$${Number(factura.facSubtotal).toLocaleString("es-CO")}</td>
          <td style="padding: 10px; border: 1px solid #eee;">$${Number(factura.facSubtotal).toLocaleString("es-CO")}</td>
        </tr>
      `;
    }

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 3px solid #3b82f6;">
          <img src="cid:logoOptiLuxe" alt="OptiLuxe" style="max-width: 150px;">
          <h2 style="margin: 20px 0 0 0; color: #1e293b;">Comprobante de Venta</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Factura No. ${factura.facNumero}</p>
        </div>

        <div style="padding: 30px;">
          <div style="margin-bottom: 25px;">
            <h3 style="color: #3b82f6; margin-bottom: 15px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Detalles del Cliente</h3>
            <p style="margin: 5px 0;"><strong>Nombre:</strong> ${usuario.usuNombre} ${usuario.usuApellido}</p>
            <p style="margin: 5px 0;"><strong>Documento:</strong> ${usuario.usuDocumento}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${usuario.usuCorreo}</p>
            ${usuario.usuDireccion ? `<p style="margin: 5px 0;"><strong>Dirección:</strong> ${usuario.usuDireccion}</p>` : ""}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 12px; border: 1px solid #eee; text-align: left; font-size: 12px; text-transform: uppercase;">Descripción</th>
                <th style="padding: 12px; border: 1px solid #eee; text-align: center; font-size: 12px; text-transform: uppercase;">Cant.</th>
                <th style="padding: 12px; border: 1px solid #eee; text-align: left; font-size: 12px; text-transform: uppercase;">Precio</th>
                <th style="padding: 12px; border: 1px solid #eee; text-align: left; font-size: 12px; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${productosHTML}
            </tbody>
          </table>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin-left: auto; width: 60%;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #64748b;">Subtotal:</td>
                <td style="padding: 5px 0; text-align: right; font-weight: bold;">$${Number(factura.facSubtotal).toLocaleString("es-CO")}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b;">IVA (19%):</td>
                <td style="padding: 5px 0; text-align: right; font-weight: bold;">$${Number(factura.facIva).toLocaleString("es-CO")}</td>
              </tr>
              <tr style="border-top: 2px solid #3b82f6;">
                <td style="padding: 15px 0 5px 0; font-size: 18px; color: #1e293b; font-weight: 800;">TOTAL:</td>
                <td style="padding: 15px 0 5px 0; text-align: right; font-size: 18px; color: #3b82f6; font-weight: 800;">$${Number(factura.facTotal).toLocaleString("es-CO")}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>Gracias por confiar en <strong>OptiLuxe</strong>. Tu visión es nuestra prioridad.</p>
          </div>

          ${contactoHTML}
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: usuario.usuCorreo,
      subject: `Comprobante de Venta ${factura.facNumero} - OptiLuxe`,
      html,
      attachments: [logoAttachment],
    });

    console.log("✅ Correo enviado correctamente:", info.response);

  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
};

export const enviarConfirmacionCitaEmail = async (cita, usuario, factura = null) => {
  try {
    const fechaCita = new Date(cita.citFecha).toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    const horaCita = new Date(cita.citFecha).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });

    const pagoHTML = factura
      ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #2E7D32;">Pago registrado</h3>
          <p><strong>Factura:</strong> #${factura.facNumero}</p>
          <p><strong>Concepto:</strong> ${factura.facConcepto}</p>
          <p><strong>Método:</strong> ${factura.facCondiciones}</p>
          <p style="font-size: 18px;"><strong>Total:</strong> $${Number(factura.facTotal).toLocaleString("es-CO")}</p>
        </div>
      `
      : "";

    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

        <div style="background-color: #ffffff; padding: 30px; text-align: center;">
          <img src="cid:logoOptiLuxe" alt="OptiLuxe Logo" style="max-width:160px;">
        </div>

        <div style="height: 4px; background-color: #D5E0F4;"></div>

        <div style="padding: 30px; color: #333;">

          <h2>Hola ${usuario.usuNombre},</h2>

          <p>
            ¡Tu cita ha sido registrada con éxito! A continuación encontrarás
            los detalles de tu próxima visita a OptiLuxe.
          </p>

          <div style="margin-top: 25px; padding: 20px; background-color: #F4F8FD; border-left: 4px solid #D5E0F4; border-radius: 4px;">
            <h3 style="margin: 0 0 15px 0;">Detalles de la cita</h3>

            <p><strong>Fecha:</strong> ${fechaCita}</p>
            <p><strong>Hora:</strong> ${horaCita}</p>
            <p><strong>Motivo:</strong> ${cita.citMotivo}</p>
            <p><strong>Estado:</strong> ${cita.citEstado}</p>
            ${cita.citObservaciones ? `<p><strong>Observaciones:</strong> ${cita.citObservaciones}</p>` : ""}
          </div>

          ${pagoHTML}

          ${contactoHTML}

          <p style="margin-top: 40px; font-size: 14px; color: #777;">
            © ${new Date().getFullYear()} OptiLuxe - Visión Clara
          </p>

        </div>
      </div>
    </div>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: usuario.usuCorreo,
      subject: `Confirmación de Cita - OptiLuxe`,
      html,
      attachments: [logoAttachment],
    });

    console.log("✅ Correo de confirmación de cita enviado:", info.response);

  } catch (error) {
    console.error("❌ Error enviando correo de confirmación de cita:", error);
  }
};

export const enviarRecuperacionPasswordEmail = async (correo, nombre, token) => {
  try {
    const urlRestablecer = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

        <div style="background-color: #ffffff; padding: 30px; text-align: center;">
          <img src="cid:logoOptiLuxe" alt="OptiLuxe Logo" style="max-width:160px;">
        </div>

        <div style="height: 4px; background-color: #D5E0F4;"></div>

        <div style="padding: 30px; color: #333;">

          <h2>Hola ${nombre},</h2>

          <p>Hemos recibido una solicitud para restablecer tu contraseña en OptiLuxe.</p>
          <p>Para continuar, haz clic en el siguiente botón:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${urlRestablecer}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${urlRestablecer}" style="word-break: break-all; color: #2563eb;">${urlRestablecer}</a>
          </p>

          <div style="margin-top: 30px; padding: 15px; background-color: #FFF3E0; border-left: 4px solid #FF9800; border-radius: 4px; font-size: 14px;">
            Este enlace es seguro y expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo; tu contraseña actual seguirá siendo válida.
          </div>

          ${contactoHTML}

          <p style="margin-top: 40px; font-size: 14px; color: #777;">
            © ${new Date().getFullYear()} OptiLuxe - Visión Clara
          </p>

        </div>
      </div>
    </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: correo,
      subject: "Restablecer tu contraseña - OptiLuxe",
      html,
      attachments: [logoAttachment],
    });

  } catch (error) {
    console.error("❌ Error enviando correo de recuperación:", error);
  }
};

export const enviarNotificacionGeneralEmail = async (correo, titulo, mensaje, nombreUsuario) => {
  try {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

        <div style="background-color: #ffffff; padding: 30px; text-align: center;">
          <img src="cid:logoOptiLuxe" alt="OptiLuxe Logo" style="max-width:160px;">
        </div>

        <div style="height: 4px; background-color: #D5E0F4;"></div>

        <div style="padding: 30px; color: #333;">

          <h2>Hola ${nombreUsuario},</h2>

          <div style="margin-top: 25px; padding: 20px; background-color: #F4F8FD; border-left: 4px solid #D5E0F4; border-radius: 4px;">
            <h3 style="margin: 0 0 15px 0;">${titulo}</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${mensaje}</p>
          </div>

          ${contactoHTML}

          <p style="margin-top: 40px; font-size: 14px; color: #777;">
            © ${new Date().getFullYear()} OptiLuxe - Visión Clara
          </p>

        </div>
      </div>
    </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: correo,
      subject: titulo,
      html,
      attachments: [logoAttachment],
    });

  } catch (error) {
    console.error("❌ Error enviando correo de notificación general:", error);
  }
};

/**
 * Envía una respuesta a un mensaje de contacto
 * @param {string} correo - Email del cliente
 * @param {string} nombre - Nombre del cliente
 * @param {string} mensajeOriginal - El mensaje que envió el cliente
 * @param {string} respuestaAdmin - La respuesta redactada por el administrador
 */
export const enviarRespuestaContactoEmail = async (correo, nombre, mensajeOriginal, respuestaAdmin) => {
  try {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

        <div style="background-color: #ffffff; padding: 30px; text-align: center;">
          <img src="cid:logoOptiLuxe" alt="OptiLuxe Logo" style="max-width:160px;">
        </div>

        <div style="height: 4px; background-color: #2563eb;"></div>

        <div style="padding: 30px; color: #333;">

          <h2 style="color: #1e40af;">Hola ${nombre},</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
            Gracias por contactar con <strong>OptiLuxe</strong>. Hemos revisado tu consulta y aquí tienes nuestra respuesta:
          </p>

          <div style="margin: 25px 0; padding: 25px; background-color: #eff6ff; border-radius: 12px; border: 1px solid #dbeafe;">
            <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #1e3a8a; white-space: pre-wrap;">${respuestaAdmin}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #9ca3af; uppercase; tracking-wider;">Tu mensaje original:</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">"${mensajeOriginal}"</p>
          </div>

          <p style="margin-top: 30px; font-size: 15px; color: #4b5563;">
            Si tienes más preguntas, no dudes en responder a este correo o contactarnos por WhatsApp.
          </p>

          ${contactoHTML}

          <p style="margin-top: 40px; font-size: 14px; color: #9ca3af; text-align: center;">
            © ${new Date().getFullYear()} OptiLuxe - Visión Clara
          </p>

        </div>
      </div>
    </div>
    `;

    await transporter.sendMail({
      from: `OptiLuxe <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: "Respuesta a tu consulta - OptiLuxe",
      html,
      attachments: [logoAttachment],
    });

    console.log(`✅ Respuesta de contacto enviada a ${correo}`);

  } catch (error) {
    console.error("❌ Error enviando respuesta de contacto:", error);
    throw error;
  }
};