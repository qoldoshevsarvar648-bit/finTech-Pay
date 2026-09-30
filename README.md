# FinTech Pay - Global Pul O'tkazmalari va Bank Tizimi

FinTech Pay — foydalanuvchilar o'rtasida xavfsiz pul o'tkazmalari, ko'p valyutali hamyonlar, karta boshqaruvi, tranzaksiyalar tarixi va Google OAuth hamda Email OTP (bir martalik tasdiqlash kodi) orqali himoyalangan zamonaviy onlayn to'lov tizimi.

---

## 🚀 GitHub orqali Deploy qilish bo'yicha Qo'llanma

Loyiha GitHub orqali 2 xil usulda deploy qilinishi mumkin:

### 1-USUL: Vercel orqali deploy qilish (TAVSIYA ETILADI ⭐)
> Vercel orqali deploy qilinganda nafaqat sayt ishlaydi, balki **Emailga tasdiqlash kodi (OTP) yuborish funksiyasi ham serverless backend (`/api/send-otp`) orqali 100% bulutda avtomatik ishlaydi**! Hech qanday kompyuterni yoqib qo'yish shart emas.

1. **GitHub repozitoriy yarating**:
   - [GitHub](https://github.com) ga kiring va yangi repository oching (masalan, `fintech-pay`).
   - Terminalda loyihani yuklang:
     ```bash
     git remote add origin https://github.com/SIZNING_USERNAME/fintech-pay.git
     git push -u origin main
     ```

2. **Vercel bilan bog'lang**:
   - [Vercel](https://vercel.com) ga kiring va GitHub akkauntingiz orqali kiring.
   - **"Add New..."** -> **"Project"** tugmasini bosing.
   - GitHub'dagi `fintech-pay` repozitoriyasini tanlang va **"Import"** ni bosing.

3. **Environment Variables (Maxfiy kalitlar) ni kiriting**:
   - Vercel sozlamalarida **"Environment Variables"** bo'limiga kiring va quyidagi 2 ta o'zgaruvchini qo'shing:
     - `SMTP_USER`: `qoldoshevsarvar648@gmail.com`
     - `SMTP_PASS`: `tzsj htvq cqcy lyhq`
   - **"Deploy"** tugmasini bosing.
   - 1 daqiqa ichida saytingiz bepul `https://sizning-sayt.vercel.app` manzilida ishga tushadi!

---

### 2-USUL: GitHub Pages orqali deploy qilish (Faqat Frontend)
Loyiha ichiga avtomatik GitHub Pages deploy qiluvchi GitHub Actions workflow (`.github/workflows/deploy.yml`) kiritilgan.

1. GitHub'ga kodni push qiling:
   ```bash
   git push -u origin main
   ```
2. Repozitoriyangiz sahifasida **Settings** -> **Pages** bo'limiga o'ting.
3. **Build and deployment** bo'limida **Source** ni **"GitHub Actions"** ga o'zgartiring.
4. Saytingiz bir necha soniyada `https://sizning-username.github.io/fintech-pay/` manzilida ochiladi.

---

## 💻 Kompyuterda Lokal Ishga Tushirish

Kompyuteringizda sinab ko'rish uchun:
1. Ish stolingizdagi **`Run_FinTech_Pay.bat`** faylini ikki marta bosing.
2. Yoki terminalda:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\server.ps1
   ```
3. Brauzer avtomatik ravishda ochiladi: `http://localhost:5000`

---

## 📁 Loyiha Strukturasi
```
antigravity/
├── index.html                 # Asosiy Fintech Web-ilova (SPA)
├── api/
│   └── send-otp.js           # Vercel Serverless Email jo'natuvchi API
├── server.ps1                 # Lokal test uchun PowerShell SMTP server
├── vercel.json               # Vercel deployment sozlamalari
├── package.json              # Loyiha konfiguratsiyasi va nodemailer
├── email-config.example.json  # SMTP konfiguratsiya namunasi
├── run_server.bat             # Lokal serverni ishga tushiruvchi skript
└── .github/workflows/
    └── deploy.yml            # GitHub Pages avtomatik deployment workflow
```
