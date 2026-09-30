const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // CORS sozlamalari
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST requests allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const toEmail = body.to || body.email;
    const otpCode = body.code;
    const toName = body.userName || body.name || 'Hurmatli mijoz';

    if (!toEmail || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Pochta manzili yoki tasdiqlash kodi yetishmayapti'
      });
    }

    // SMTP sozlamalarini olish (Environment variables yoki email-config.json)
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS;
    let smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    let smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    if (!smtpUser || !smtpPass) {
      try {
        const configPath = path.join(process.cwd(), 'email-config.json');
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (cfg.smtp) {
            smtpUser = smtpUser || cfg.smtp.user;
            smtpPass = smtpPass || cfg.smtp.pass;
            smtpHost = smtpHost || cfg.smtp.host || 'smtp.gmail.com';
            smtpPort = smtpPort || cfg.smtp.port || 587;
          }
        }
      } catch (e) {
        console.warn('Config read error:', e.message);
      }
    }

    // Zaxira qiymatlar
    smtpUser = smtpUser || 'qoldoshevsarvar648@gmail.com';
    smtpPass = smtpPass || 'tzsj htvq cqcy lyhq';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:20px;padding:32px;border:1px solid #334155;color:#f8fafc;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#6366f1;margin:0;font-size:24px;font-weight:800;letter-spacing:1px;">FinTech Pay</h1>
      <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">Xavfsiz va Global Pul O'tkazmalari Tizimi</p>
    </div>
    <p style="font-size:15px;color:#e2e8f0;margin:0 0 16px 0;">Assalomu alaykum, <b>${toName}</b>!</p>
    <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0 0 20px 0;">
      FinTech Pay tizimida hisobingizni tasdiqlash uchun 6 xonali maxfiy tasdiqlash kodingiz:
    </p>
    <div style="background:#0f172a;border:2px dashed #6366f1;border-radius:16px;padding:18px;text-align:center;margin:24px 0;">
      <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#38bdf8;">${otpCode}</span>
    </div>
    <p style="font-size:11px;color:#64748b;line-height:1.5;margin:0;">
      💡 Ushbu kod 10 daqiqa davomida amal qiladi. Agar xat sizning asosiy sahifangizda ko'rinmasa, iltimos <b>Spam</b> papkasini ham tekshiring.
    </p>
  </div>
</body>
</html>
    `;

    const plainText = `Assalomu alaykum ${toName}!\n\nFinTech Pay tizimida tasdiqlash kodingiz: ${otpCode}\n\nUshbu kod 10 daqiqa davomida amal qiladi.`;

    const mailOptions = {
      from: `"FinTech Pay Xavfsizlik" <${smtpUser}>`,
      to: toEmail,
      replyTo: smtpUser,
      subject: `FinTech Pay - Tasdiqlash Kodi: ${otpCode}`,
      text: plainText,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      email: toEmail,
      delivered: true,
      message: `Tasdiqlash kodi ${toEmail} pochtasiga yuborildi.`
    });
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({
      success: false,
      delivered: false,
      error: error.message,
      message: 'Xat yuborishda xatolik yuz berdi: ' + error.message
    });
  }
}
