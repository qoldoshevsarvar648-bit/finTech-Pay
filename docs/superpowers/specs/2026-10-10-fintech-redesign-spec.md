# FinTech Pay Redesign, Security Audit & E2E Testing Spec

## 1. Intent & Context
Upgrade the FinTech Pay single-page application into an Apple Card / Linear-grade modern neobank web application with rock-solid security invariants and exhaustive Playwright end-to-end tests.

## 2. Design System & Aesthetics (taste-skill)
- **Aesthetic Direction:** Dark Luxury Neobank (inspired by Apple Card, Stripe, Linear).
- **Core Dials:**
  - `DESIGN_VARIANCE: 7` (Refined asymmetric rhythm, avoids robotic boxes)
  - `MOTION_INTENSITY: 6` (Spring transitions, tactile push states, card tilt, smooth tab reveals)
  - `VISUAL_DENSITY: 4` (High breathing room, spacious typography, zero cramped widgets)
- **Typography:**
  - Display & Headings: Modern geometric sans with tightened tracking (`tracking-tight`).
  - Numbers & Balances: Monospace tabular figures (`tabular-nums font-mono`) for precision banking feel.
- **Color Calibration:**
  - Base: Deep obsidian slate (`bg-slate-950`, `bg-zinc-950`).
  - Primary Accent: Precision Emerald (`#10b981` / `#059669`) for positive liquidity, trust, and confirmation.
  - Secondary Accent: Electric Cyan (`#06b6d4` / `#0ea5e9`) for digital transfers & card chips.
  - Prohibition: No generic muddy purple gradients or AI-slop glows.
- **Materiality & Cards:**
  - Glassmorphic luxury with 1px border (`border-white/10`) and subtle interior reflection.
  - Interactive virtual debit/credit cards with realistic metallic chip, card brand, masked numbers, and status indicators.
  - Micro-tactile interaction: `active:scale-[0.98]` on all primary CTAs.
  - Consistent corner radius: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons.

## 3. Security Audit Invariants (security-audit)
1. **Cryptographic Randomness:**
   - Replace insecure `Math.random()` with `crypto.getRandomValues()` for OTP codes, session tokens, transaction IDs, and card CVVs.
2. **Transaction Integrity & Balance Validation:**
   - Prevent negative transfer amounts (`amount <= 0`).
   - Prevent self-transfers (`sender === recipient`).
   - Prevent non-numeric or NaN attacks (`Number.isFinite(amount)` check).
   - Fix IEEE-754 floating point arithmetic errors by operating on integer cents (`Math.round(amount * 100)`).
   - Strict sender balance boundary verification: `if (senderBalanceCents < transferCents) throw Error`.
3. **XSS & Injection Defense:**
   - Strict sanitization/escaping of user-supplied fields (recipient names, transaction descriptions, notes) before DOM injection.
4. **Rate Limiting & Anti-Spam:**
   - 60-second cooldown timer between OTP resend requests with client-side timestamp validation.
5. **Storage Hygiene:**
   - Do not leak raw passwords in logs or clear-text notifications.
   - Clean separation of user database vs. transient UI state.

## 4. End-to-End Testing (playwright-skill)
- Playwright test suite in `tests/e2e/`:
  - `auth.spec.js`: Registration, OTP entry, login validation, session persistence across F5 reload.
  - `transfers.spec.js`: Balance top-up, valid P2P money transfer, rejection of invalid amounts, balance deduction.
  - `cards.spec.js`: Card display, adding new card, freeze card toggle.
  - `responsive.spec.js`: Visual verification on Desktop (1440x900) and Mobile (390x844).
