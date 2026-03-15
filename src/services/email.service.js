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

    const usuario = factura.carrito.usuario;
    const productos = factura.carrito.carrito_producto;

    const productosHTML = productos
      .map((item) => {
        const subtotal = Number(item.producto.proPrecio) * item.cantidad;

        return `
          <tr>
            <td>${item.producto.proNombre}</td>
            <td>${item.cantidad}</td>
            <td>$${item.producto.proPrecio}</td>
            <td>$${subtotal}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <h2>Factura de Compra - Optiluxe 👓</h2>

      <p><strong>Cliente:</strong> ${usuario.usuNombre} ${usuario.usuApellido}</p>
      <p><strong>Documento:</strong> ${usuario.usuDocumento}</p>
      <p><strong>Correo:</strong> ${usuario.usuCorreo}</p>
      <p><strong>Dirección:</strong> ${usuario.usuDireccion}</p>

      <hr/>

      <h3>Detalle de productos</h3>

      <table border="1" cellpadding="5" cellspacing="0">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${productosHTML}
        </tbody>
      </table>

      <h3>Subtotal: $${factura.facSubtotal}</h3>
      <h3>IVA: $${factura.facIva}</h3>
      <h2>Total: $${factura.facTotal}</h2>

      <p>Gracias por confiar en Optiluxe.</p>

      ${contactoHTML}
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: usuario.usuCorreo,
      subject: `Factura ${factura.facNumero} - Optiluxe`,
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