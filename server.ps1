# =====================================================================
# FINTECH PAY - GLOBAL WEB SERVER & EMAIL OTP DISPATCH ENGINE
# =====================================================================
# Ushbu server barcha sayt tashrif buyuruvchilari (global hamma email)
# uchun avtomatik ravishda tasdiqlash kodini jo'natadi.
#
# Global Pochta Jo'natuvchisi (SMTP SENDER): qoldoshevsarvar648@gmail.com
# Saytga kim qaysi email bilan kirmasin, uning pochtasiga xat aynan
# shu jo'natuvchi orqali yetkaziladi.
# =====================================================================

$defaultSmtpServer = "smtp.gmail.com"
$defaultSmtpPort   = 587
$defaultSmtpUser   = "qoldoshevsarvar648@gmail.com"
$defaultSmtpPass   = "tzsj htvq cqcy lyhq"

$port = 3000
$url = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  FinTech Pay Web Serveri & Global Pochta Tizimi Ishga Tushdi!" -ForegroundColor Green
    Write-Host "  Manzil: $url" -ForegroundColor Yellow
    Write-Host "  Global Pochta Jo'natuvchisi: $defaultSmtpUser" -ForegroundColor Green
    Write-Host "  Holati: Istalgan email manzilga xat yuborishga 100% tayyor!" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Cyan
    
    try { Start-Process $url } catch {}
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")

        try {
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                continue
            }

            # 1. AVTOMATIK GLOBAL EMAIL OTP YUBORISH ENDPOINTI
            if ($request.Url.AbsolutePath -eq "/api/send-otp" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $json = ConvertFrom-Json $bodyText

                $toEmail   = if ($json.to) { $json.to.ToString().Trim().ToLower() } else { "" }
                $toName    = if ($json.name) { $json.name.ToString().Trim() } else { "Foydalanuvchi" }
                $otpCode   = if ($json.code) { $json.code.ToString().Trim() } else { "" }
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

                Write-Host ""
                Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
                Write-Host " [GLOBAL POCHTA TIZIMI SO'ROVI]" -ForegroundColor Yellow
                Write-Host "  Qabul qiluvchi : $toName <$toEmail>" -ForegroundColor White
                Write-Host "  Jo'natuvchi    : $defaultSmtpUser" -ForegroundColor DarkGray
                Write-Host "  Vaqt           : $timestamp" -ForegroundColor DarkGray
                
                # email-config.json faylidan o'qish (agar bor bo'lsa)
                $configFile = Join-Path $PSScriptRoot "email-config.json"
                $activeSmtpServer = $defaultSmtpServer
                $activeSmtpPort   = $defaultSmtpPort
                $activeSmtpUser   = $defaultSmtpUser
                $activeSmtpPass   = $defaultSmtpPass
                $activeWebhook    = ""

                if (Test-Path $configFile) {
                    try {
                        $cfg = Get-Content $configFile -Raw | ConvertFrom-Json
                        if ($cfg.smtp.host) { $activeSmtpServer = $cfg.smtp.host }
                        if ($cfg.smtp.port) { $activeSmtpPort   = [int]$cfg.smtp.port }
                        if ($cfg.smtp.user) { $activeSmtpUser = $cfg.smtp.user }
                        if ($cfg.smtp.pass) { $activeSmtpPass = $cfg.smtp.pass }
                        if ($cfg.webhookUrl) { $activeWebhook = $cfg.webhookUrl }
                    } catch {}
                }

                $sentRealEmail = $false
                $sendError = ""

                # SMTP orqali real pochtaga jo'natish
                if ($activeSmtpUser -and $activeSmtpPass -and $toEmail) {
                    try {
                        $smtp = New-Object Net.Mail.SmtpClient($activeSmtpServer, $activeSmtpPort)
                        $smtp.EnableSsl = $true
                        $smtp.Timeout = 20000
                        $smtp.Credentials = New-Object Net.NetworkCredential($activeSmtpUser, $activeSmtpPass)
                        
                        $msg = New-Object Net.Mail.MailMessage
                        $msg.From = New-Object Net.Mail.MailAddress($activeSmtpUser, "FinTech Pay Xizmati")
                        $msg.To.Add($toEmail)
                        $msg.ReplyToList.Add($activeSmtpUser)
                        $msg.Subject = "FinTech Pay - Tasdiqlash Kodi: $otpCode"
                        $msg.SubjectEncoding = [System.Text.Encoding]::UTF8
                        $msg.Priority = [Net.Mail.MailPriority]::High

                        $htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:20px;padding:32px;border:1px solid #334155;color:#f8fafc;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#6366f1;margin:0;font-size:24px;font-weight:800;letter-spacing:1px;">FinTech Pay</h1>
      <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">Xavfsiz va Global Pul O'tkazmalari Tizimi</p>
    </div>
    <p style="font-size:15px;color:#e2e8f0;margin:0 0 16px 0;">Assalomu alaykum, <b>$toName</b>!</p>
    <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0 0 20px 0;">
      FinTech Pay tizimida hisobingizni tasdiqlash uchun 6 xonali maxfiy tasdiqlash kodingiz:
    </p>
    <div style="background:#0f172a;border:2px dashed #6366f1;border-radius:16px;padding:18px;text-align:center;margin:24px 0;">
      <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#38bdf8;">$otpCode</span>
    </div>
    <p style="font-size:11px;color:#64748b;line-height:1.5;margin:0;">
      💡 Ushbu kod 10 daqiqa davomida amal qiladi. Agar xat sizning asosiy sahifangizda ko'rinmasa, iltimos <b>Spam</b> papkasini ham tekshiring.
    </p>
  </div>
</body>
</html>
"@
                        $plainContent = "Assalomu alaykum $toName!`n`nFinTech Pay tizimida tasdiqlash kodingiz: $otpCode`n`nUshbu kod 10 daqiqa davomida amal qiladi."
                        
                        $plainView = [Net.Mail.AlternateView]::CreateAlternateViewFromString($plainContent, [System.Text.Encoding]::UTF8, "text/plain")
                        $htmlView  = [Net.Mail.AlternateView]::CreateAlternateViewFromString($htmlContent, [System.Text.Encoding]::UTF8, "text/html")
                        $msg.AlternateViews.Add($plainView)
                        $msg.AlternateViews.Add($htmlView)

                        $smtp.Send($msg)
                        $sentRealEmail = $true
                        Write-Host "  Natija         : Xat $toEmail pochtasiga 100% yetkazildi!" -ForegroundColor Green
                    } catch {
                        $sendError = $_.Exception.Message
                        Write-Host "  SMTP Xatolik   : $sendError" -ForegroundColor Red
                    }
                }

                # Agar Webhook bo'lsa, zaxira sifatida ishlatish
                if (-not $sentRealEmail -and $activeWebhook -and $toEmail) {
                    try {
                        $whBody = @{
                            to      = $toEmail
                            name    = $toName
                            code    = $otpCode
                            subject = "FinTech Pay - Tasdiqlash Kodi: $otpCode"
                        } | ConvertTo-Json
                        $whRes = Invoke-RestMethod -Uri $activeWebhook -Method Post -Body $whBody -ContentType "application/json" -TimeoutSec 10
                        $sentRealEmail = $true
                        Write-Host "  Natija         : Webhook orqali xat jo'natildi!" -ForegroundColor Green
                    } catch {
                        $sendError = $_.Exception.Message
                        Write-Host "  Webhook Xatosi : $sendError" -ForegroundColor Red
                    }
                }

                # Natijani faylga yozib borish
                $logLine = "[$timestamp] TO: $toEmail | SENDER: $activeSmtpUser | DELIVERED: $sentRealEmail | ERROR: $sendError"
                Add-Content -Path (Join-Path $PSScriptRoot "email_log.txt") -Value $logLine -ErrorAction SilentlyContinue

                Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
                Write-Host ""

                $resObj = @{
                    success   = $sentRealEmail
                    email     = $toEmail
                    delivered = $sentRealEmail
                    error     = $sendError
                    message   = if ($sentRealEmail) { "Tasdiqlash kodi $toEmail pochtasiga yuborildi." } else { "Xat yuborishda xatolik yuz berdi." }
                }
                $resJson = ConvertTo-Json $resObj
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                continue
            }

            # 2. STATIK FAYLLARNI UZATISH (INDEX.HTML)
            $localPath = Join-Path $PSScriptRoot "index.html"
            if (Test-Path $localPath) {
                $buffer = [System.IO.File]::ReadAllBytes($localPath)
                $response.ContentType = "text/html; charset=utf-8"
                $response.StatusCode = 200
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } else {
                $response.StatusCode = 404
            }
        } catch {
            Write-Host "So'rovni qayta ishlashda xatolik: $_" -ForegroundColor Red
            $response.StatusCode = 500
        } finally {
            try { $response.Close() } catch {}
        }
    }
} catch {
    Write-Host "Server xatosi: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) { $listener.Stop() }
}
