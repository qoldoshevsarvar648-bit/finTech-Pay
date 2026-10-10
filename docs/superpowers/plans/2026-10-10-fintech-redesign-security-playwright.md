# FinTech Pay Redesign, Security Hardening & Playwright E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform FinTech Pay into a secure, Apple Card / Linear-aesthetic neobank web application backed by defensive security invariants and verified with an automated Playwright test suite.

**Architecture:** Single-page banking application enhanced with cryptographic OTP/ID generation, integer-cent transaction arithmetic, strict input sanitization, Apple Card-grade dark luxury UI design, and an automated browser test harness executing via Playwright.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (modernized dark tokens), Lucide Icons, Node.js, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-fintech-redesign-spec.md`

## Global Constraints
- Single-page application architecture in `index.html` must remain self-contained for deployment on GitHub Pages & Vercel.
- All currency balances must be calculated in integer cents to eliminate floating point drift.
- All cryptographic IDs and OTP codes must use `crypto.getRandomValues()`.
- UI must follow taste-skill dials: `DESIGN_VARIANCE: 7`, `MOTION_INTENSITY: 6`, `VISUAL_DENSITY: 4`.
- WCAG AA contrast compliance for all buttons, inputs, and text elements.

## Review Focus
1. Negative or zero money transfer attempts must be immediately rejected with user-facing error.
2. Transfer amount exceeding available balance must be blocked.
3. Rapid clicking on transfer/submit buttons must not cause duplicate transactions.
4. Page reloads (F5) must keep user session intact and preserve transaction history.
5. User notes with HTML/script characters (`<`, `>`, `&`) must be escaped to prevent stored XSS.

---

### Task 1: Security Audit & Defensive Hardening
**Files:**
- Modify: `D:\antigravity\index.html`
- Create: `D:\antigravity\tests/security-audit-report.md`

- [ ] **Step 1: Replace pseudo-random generators with `crypto.getRandomValues`**
  - Implement `generateSecureOTP(digits = 6)` using `crypto.getRandomValues(new Uint32Array(1))`
  - Implement `generateSecureId(prefix = 'tx')` using cryptographically secure hex/uuid
- [ ] **Step 2: Harden transfer execution arithmetic and boundary validations**
  - Convert input amounts to integer cents: `Math.round(parseFloat(rawAmount) * 100)`
  - Reject amounts `<= 0`, non-finite, NaN, or containing invalid characters
  - Enforce sender balance check against integer cents
  - Check that sender email and recipient email are distinct
- [ ] **Step 3: Implement XSS input sanitization**
  - Create `escapeHTML(str)` utility to sanitize recipient names, cardholder names, transfer notes, and categories
- [ ] **Step 4: Add OTP request rate limiting & cooldown timer**
  - Implement 60-second cooldown on OTP resend requests with live countdown UI
- [ ] **Step 5: Verify security hardening and compile `tests/security-audit-report.md`**

---

### Task 2: Visual & UX Redesign (Taste-Skill)
**Files:**
- Modify: `D:\antigravity\index.html`

- [ ] **Step 1: Modernize Global Theme & Typography**
  - Dark luxury slate background (`#090d16` / `#0f172a`), border tokens (`border-white/10`)
  - Implement tabular mono numbers for balances (`font-mono tracking-tight tabular-nums`)
  - Replace AI-purple gradients with precision emerald (`#10b981`) and electric cyan accents
- [ ] **Step 2: Redesign Navigation & Auth Screen**
  - Clean split header with live security badge, system status, and user avatar
  - Restructure login/register modal with clean tab switcher, single primary CTA line, and prominent error feedback
- [ ] **Step 3: Redesign Dashboard & Hamyon Hero**
  - Hero Balance card with quick action pills (Pul yuborish, Hisobni to'ldirish, Yangi karta, Qabul qilish)
  - Interactive multi-card preview with metallic chip, contactless wave, card brand logo, and toggleable freeze status
- [ ] **Step 4: Redesign Transaction Ledger & Modals**
  - Asymmetric transaction list with type icon, category pill, relative date, and formatted currency diff (`+$1,000.00` / `-$50.00`)
  - Sleek transfer modal with recipient auto-complete, quick amount buttons ($10, $50, $100, $500), and live fee preview
  - Digital receipt modal with downloadable/printable summary
- [ ] **Step 5: Add tactile micro-interactions**
  - `active:scale-[0.98]` physical push feedback on all buttons
  - Smooth modal fades and spring card hover elevation

---

### Task 3: Playwright Test Harness & E2E Test Suite
**Files:**
- Create: `D:\antigravity\tests/e2e/auth.spec.js`
- Create: `D:\antigravity\tests/e2e/transfers.spec.js`
- Create: `D:\antigravity\tests/e2e/cards.spec.js`
- Create: `D:\antigravity\tests/e2e/run-tests.js`

- [ ] **Step 1: Set up Playwright runner script**
  - Verify Chromium / Playwright availability and configure headless/headed runner
- [ ] **Step 2: Write Auth & Session tests (`auth.spec.js`)**
  - Test registration with validation errors
  - Test OTP submission and account creation
  - Test login with valid credentials
  - Test F5 page refresh preserves login session
- [ ] **Step 3: Write Money Transfer & Ledger tests (`transfers.spec.js`)**
  - Test balance top-up (+$1,000.00)
  - Test valid P2P transfer between two users
  - Test rejection of negative amount (`-50`)
  - Test rejection of amount exceeding balance (`$999,999`)
  - Test receipt popup displays correct transaction ID and amount
- [ ] **Step 4: Write Card Management tests (`cards.spec.js`)**
  - Test viewing existing card details
  - Test adding a new virtual card
  - Test freezing/unfreezing card status
- [ ] **Step 5: Run full test suite and capture verification screenshots**

---

### Task 4: Production Verification & GitHub Sync
**Files:**
- Modify: `D:\antigravity\README.md`

- [ ] **Step 1: Run comprehensive local test pass**
- [ ] **Step 2: Commit all code, test reports, and assets to Git**
- [ ] **Step 3: Push to GitHub repository `main` branch**
- [ ] **Step 4: Verify deployment on GitHub Pages**
