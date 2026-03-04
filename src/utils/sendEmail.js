import nodemailer from "nodemailer";
import path from "path";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail({ to, subject, html }) {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");

    console.log("Ruta del logo:", logoPath);

    const info = await transporter.sendMail({
      from: `"OptiLuxe" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "logoOptiLuxe", 
        },
      ],
    });

    console.log("Correo enviado correctamente:", info.messageId);

  } catch (error) {
    console.error("Error enviando correo:", error);
    throw error;
  }
}