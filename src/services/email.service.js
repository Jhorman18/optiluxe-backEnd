import nodemailer from "nodemailer";

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

// Verificar conexión SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error de conexión SMTP:", error);
  } else {
    console.log("✅ Servidor SMTP listo para enviar correos");
  }
});

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
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: usuario.usuCorreo,
      subject: `Factura ${factura.facNumero} - Optiluxe`,
      html,
    });

    console.log("✅ Correo enviado correctamente:", info.response);

  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
};