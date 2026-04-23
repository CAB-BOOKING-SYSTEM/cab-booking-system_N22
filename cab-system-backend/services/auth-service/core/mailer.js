import nodemailer from 'nodemailer';

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async ({ to, resetToken, ttlMinutes }) => {
  const appScheme = process.env.APP_SCHEME || 'cabapp';
  const resetLink = `${appScheme}://reset-password?token=${resetToken}`;

  if (!smtpConfigured()) {
    console.log(`[MAILER] SMTP chưa cấu hình — token cho ${to}:`);
    console.log(`[MAILER] Token: ${resetToken}`);
    console.log(`[MAILER] Deep link: ${resetLink}`);
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `Cab System <${process.env.SMTP_USER}>`,
    to,
    subject: 'Đặt lại mật khẩu',
    html : `
  <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
    <h2>Đặt lại mật khẩu</h2>
    <p>Mã OTP của bạn là:</p>
    <div style="
      font-size: 40px; 
      font-weight: bold; 
      letter-spacing: 12px;
      color: #4F8EF7;
      text-align: center;
      padding: 20px;
      background: #f0f4ff;
      border-radius: 12px;
      margin: 20px 0;
    ">
      ${resetToken}
    </div>
    <p>Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong>.</p>
    <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  </div>
`
  });
};
