/**
 * =========================================================================
 * FinTech Pay - Google Apps Script Email Jo'natuvchi (Webhook)
 * =========================================================================
 * Ushbu kod GitHub Pages saytidan turib to'g'ridan-to'g'ri qoldoshevsarvar648@gmail.com
 * pochtasi orqali barcha foydalanuvchilarga bepul tasdiqlash kodi (OTP) yuborish uchun xizmat qiladi.
 *
 * QANDAY O'RNATILADI (2 daqiqa):
 * 1. https://script.google.com saytiga kiring (qoldoshevsarvar648@gmail.com hisobingiz bilan).
 * 2. "Yangi loyiha" ("Новый проект" / "New project") tugmasini bosing.
 * 3. Eski kodni o'chirib, ushbu fayldagi kodni to'liq nusxalab qo'ying (Paste qiling).
 * 4. Yuqori o'ng burchakdagi "Deploy" -> "New deployment" ("Начать развертывание" -> "Новое развертывание") ni bosing.
 * 5. Tishli g'ildirak (Gear) belgisini bosib "Web app" ni tanlang.
 * 6. Quyidagilarni belgilang:
 *    - Description: FinTech Pay OTP
 *    - Execute as: Me (qoldoshevsarvar648@gmail.com)
 *    - Who has access: Anyone ("Barcha" / "Все")  <-- JUDA MUHIM!
 * 7. "Deploy" ni bosing, ruxsat bering ("Authorize access" -> o'z pochtangizni tanlang -> "Advanced" -> "Go to FinTech Pay (unsafe)" -> "Allow").
 * 8. Berilgan "Web app URL" (masalan: https://script.google.com/macros/s/.../exec) havolasini nusxalang.
 * 9. FinTech Pay saytida "Email sozlamalari" tugmasini bosib, "Google Webhook URL" qatoriga qo'ying va Saqlang!
 * =========================================================================
 */

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }

    var toEmail = data.to || data.email;
    var toName = data.name || data.userName || "Hurmatli mijoz";
    var otpCode = data.code;
    var subject = data.subject || ("FinTech Pay - Tasdiqlash Kodi: " + otpCode);

    if (!toEmail || !otpCode) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Email yoki OTP kod yetishmayapti"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var htmlContent = `
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

    var plainText = "Assalomu alaykum " + toName + "!\n\nFinTech Pay tizimida tasdiqlash kodingiz: " + otpCode + "\n\nUshbu kod 10 daqiqa davomida amal qiladi.";

    // Gmail orqali jo'natish
    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      body: plainText,
      htmlBody: htmlContent,
      name: "FinTech Pay Xavfsizlik"
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      delivered: true,
      email: toEmail,
      message: "Tasdiqlash kodi pochtangizga muvaffaqiyatli yuborildi."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
