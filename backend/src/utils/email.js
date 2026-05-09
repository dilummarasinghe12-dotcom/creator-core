const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

const passwordResetEmail = (name, resetUrl) => `
  <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F0F1A;padding:32px;border-radius:12px;color:#F0EBE0;">
    <h2 style="color:#FF6D00;margin-bottom:8px;">Creator Core</h2>
    <p>Hi ${name},</p>
    <p>You requested a password reset. Click the button below — it expires in 1 hour.</p>
    <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#FF6D00;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
    <p style="font-size:12px;color:#888;">If you didn't request this, ignore this email.</p>
  </div>
`;

const welcomeEmail = (name, tier) => `
  <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F0F1A;padding:32px;border-radius:12px;color:#F0EBE0;">
    <h2 style="color:#FF6D00;margin-bottom:8px;">Welcome to Creator Core</h2>
    <p>Hi ${name},</p>
    <p>Your <strong>${tier}</strong> membership is now active. Head to your dashboard to get started.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#FF6D00;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
  </div>
`;

module.exports = { sendEmail, passwordResetEmail, welcomeEmail };
