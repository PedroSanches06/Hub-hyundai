import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// sendMail helper
export async function sendEmail(to, subject, html) {
  const info = await transport.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html
  });
  console.log("Sent email:", info.messageId);
  return info;
}
