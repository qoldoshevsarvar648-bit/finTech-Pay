# FinTech Pay - Xavfsizlik Auditi va Zaifliklar Tahlili Hisoboti

**Sana:** 2026-10-10  
**Tizim:** FinTech Pay (Client-side Single Page Application & API Endpoints)  
**Metodologiya:** OWASP Top 10, CWE / Source-first Defensive Security Audit

---

## 1. Aniqlangan Xavfsizlik Muammolari va Ularning Darajasi

| ID | Zaiflik Turi | Xavf Darajasi | Joylashuv | Tavsifi va Ta'siri |
|---|---|---|---|---|
| **SEC-01** | Pseudo-Random Number Generator (PRNG) | **HIGH** | `index.html` (OTP, Wallet, TxID) | `Math.random()` kriptografik jihatdan zaif bo'lib, uning ketma-ketligini taxmin qilish mumkin. 6 xonali OTP kodlari osongina bashorat qilinishi xavfi mavjud edi. |
| **SEC-02** | Salbiy va Nol Miqdordagi O'tkazmalar (Negative Balance Exploit) | **HIGH** | `handleTransferSubmit()` | `amount <= 0` yoki `NaN` tekshiruvi yo'q edi. Salbiy qiymat kiritilsa, yuboruvchining balansi kamayish o'rniga noqonuniy oshib ketardi. |
| **SEC-03** | Suzuvchi Vergulli Arifmetika Xatosi (Floating-Point Precision) | **MEDIUM** | Balans va xizmat haqi hisoblash | `0.1 + 0.2 = 0.30000000000000004` kabi IEEE-754 xatoligi hisobiga bir necha o'tkazmadan so'ng balans sentlarda buzilishi xavfi mavjud edi. |
| **SEC-04** | Stored DOM Cross-Site Scripting (XSS) | **HIGH** | `renderTransactions()`, `viewReceipt()` | Foydalanuvchi ism-familiyasi, hamyon ma'lumotlari yoki tranzaksiya izohi `escapeHTML` qilinmasdan to'g'ridan-to'g'ri `innerHTML` ga joylanar edi. |
| **SEC-05** | OTP So'rovlarida Rate-Limiting Yo'qligi (Email Flooding) | **MEDIUM** | `resendVerificationCode()` | Tasdiqlash kodini qayta jo'natish tugmasi cheklovsiz bosilishi mumkin edi, bu esa email xizmatini spamga tushirishi yoki limitlarni tugatishi mumkin edi. |
| **SEC-06** | O'z-o'ziga Pul O'tkazish Cheklovi | **LOW** | `handleTransferSubmit()` | Foydalanuvchi o'z hisobiga transfer qilib, komissiya ushlanib qolishi va sun'iy tranzaksiya oqimi yaratishi mumkin edi. |

---

## 2. Amalga Oshirilgan Himoya choralari (Defensive Hardening)

### 1. Kriptografik Xavfsiz Tasodifiy Sonlar (`crypto.getRandomValues`)
`Math.random()` butunlay olib tashlandi. Uning o'rniga Web Crypto API ning apparat darajasidagi entropiyasidan foydalanuvchi:
- `generateSecureRandomInt(min, max)`
- `generateSecureOTP(digits = 6)`
- `generateSecureId(prefix)` funksiyalari joriy etildi.

### 2. Butun Sentlar Bilan Ishlovchi Hisob-kitob (Integer Cents Arithmetic)
Barcha valyuta hisob-kitoblari mayda sentlarga (`Math.round(amount * 100)`) o'tkazildi:
```javascript
const transferCents = Math.round(rawAmount * 100);
const feeCents = Math.round(transferCents * 0.005);
const totalDeductionCents = transferCents + feeCents;
```
Bu suzuvchi vergul xatolarini 100% bartaraf etadi.

### 3. O'tkazma Chegaralari va Validatsiya
- `rawAmount <= 0`, `NaN`, `Infinity` kiritish qat'iy bloklandi.
- Minimal o'tkazma summasi: `$0.01`.
- Yuboruvchi hisobida yetarli mablag' borligi sent darajasida tekshiriladi.
- Yuboruvchi va qabul qiluvchi bir xil shaxs bo'lishi taqiqlandi.

### 4. XSS Himoyasi (`escapeHTML`)
Foydalanuvchi kiritgan har qanday matn (ism, familiya, izoh, email) ekranga chiqarilishidan oldin to'liq tozalanadi:
`&` ➡️ `&amp;`, `<` ➡️ `&lt;`, `>` ➡️ `&gt;`, `"` ➡️ `&quot;`, `'` ➡️ `&#039;`.

### 5. 60 Sekundlik OTP Kutilish Vaqti (Cooldown Timer)
Foydalanuvchi yangi kod so'ragandan so'ng, tugma 60 soniyaga bloklanadi va jonli taymer ko'rsatiladi.
