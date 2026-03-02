import nodemailer from "nodemailer";

export async function enviarFacturaCorreo(destinatario, factura) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: destinatario,
    subject: "Tu factura - Óptica",
    html: `
      <h2>Gracias por tu compra 👓</h2>
      <p>Número de factura: ${factura.factura.facNumero}</p>
      <p>Total: ${factura.factura.facTotal}</p>
    `,
  });
}