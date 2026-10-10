const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '../../');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// 1. Create a local static HTTP server to serve index.html
function startLocalServer(port = 8089) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(ROOT_DIR, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.json': 'application/json',
          '.css': 'text/css'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else if (req.url === '/api/send-otp') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Mock OTP sent' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

// Main test execution harness
(async () => {
  console.log('======================================================================');
  console.log('       FinTech Pay — Playwright E2E Automated Test Suite');
  console.log('======================================================================\n');

  let server;
  let browser;
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ [FAIL] ${message}`);
      failedCount++;
      throw new Error(message);
    } else {
      console.log(`  ✅ [PASS] ${message}`);
      passedCount++;
    }
  }

  try {
    const PORT = 8089;
    server = await startLocalServer(PORT);
    console.log(`[INFO] Local test server started on http://127.0.0.1:${PORT}`);

    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();
    page.on('dialog', async dialog => await dialog.accept());
    const APP_URL = `http://127.0.0.1:${PORT}/index.html`;

    // ---------------------------------------------------------
    // TEST SUITE 1: AUTHENTICATION, REGISTRATION & 6-DIGIT OTP
    // ---------------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & REGISTRATION TESTS ---');
    await page.goto(APP_URL);
    assert((await page.title()).includes('FinTech Pay'), 'Title includes FinTech Pay');

    // Clear any previous state
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify Auth screen visible
    const authVisible = await page.locator('#authScreen').isVisible();
    assert(authVisible, 'Auth screen is initially displayed for unauthenticated users');

    // Switch to Register Tab
    await page.locator('#tabRegisterBtn').click();
    assert(await page.locator('#registerForm').isVisible(), 'Switched to Registration form');

    // Test form filling
    await page.locator('#regFirstName').fill('Alisher');
    await page.locator('#regLastName').fill('Navoiy');
    await page.locator('#regEmail').fill('alisher.navoiy@gmail.com');
    await page.locator('#regPhone').fill('+998901234567');
    await page.locator('#regPassword').fill('secret123');

    // Capture pending OTP before submit
    await page.locator('#regSubmitBtn').click();

    // Wait for OTP modal
    await page.locator('#emailVerifyModal').waitFor({ state: 'visible' });
    assert(await page.locator('#emailVerifyModal').isVisible(), 'Email OTP Verification modal opened');

    // Grab generated secure OTP from browser window context
    const otpCode = await page.evaluate(() => window.getCurrentOtp ? window.getCurrentOtp() : window.currentOtpCode);
    assert(otpCode && otpCode.length === 6, `Cryptographic OTP generated: ${otpCode}`);

    // Enter OTP and submit
    await page.locator('#otpInput').fill(otpCode);
    await page.locator('#verifySubmitBtn').click();

    // Wait for App screen (Dashboard)
    await page.locator('#appScreen').waitFor({ state: 'visible', timeout: 5000 });
    assert(await page.locator('#appScreen').isVisible(), 'Successfully registered and transitioned to Dashboard');

    // Verify Welcome text and Welcome Bonus
    const welcomeText = await page.locator('#welcomeUserName').textContent();
    assert(welcomeText === 'Alisher', `Welcome user greeting matches 'Alisher' (got: ${welcomeText})`);

    const balanceText = await page.locator('#balanceDisplay').textContent();
    assert(balanceText === '1,000.00', `Welcome bonus of $1,000.00 credited (got: ${balanceText})`);

    // ---------------------------------------------------------
    // TEST SUITE 2: SESSION PERSISTENCE (F5 RELOAD)
    // ---------------------------------------------------------
    console.log('\n--- 2. SESSION PERSISTENCE (F5 REFRESH) ---');
    await page.reload();
    await page.waitForTimeout(500);
    assert(await page.locator('#appScreen').isVisible(), 'User remains logged in after page reload (F5)');
    const reloadedBalance = await page.locator('#balanceDisplay').textContent();
    assert(reloadedBalance === '1,000.00', 'Balance persists accurately across reloads');

    // ---------------------------------------------------------
    // TEST SUITE 3: CARD MANAGEMENT & FREEZE TOGGLE
    // ---------------------------------------------------------
    console.log('\n--- 3. CARD MANAGEMENT & FREEZE TESTS ---');
    const cardHolder = await page.locator('#cardHolderName').textContent();
    assert(cardHolder.includes('ALISHER NAVOIY'), `Cardholder name rendered on Virtual Card (${cardHolder})`);

    // Freeze card
    await page.locator('#cardFreezeBtn').click();
    assert(await page.locator('#virtualCardContainer').getAttribute('class').then(c => c.includes('apple-card-frozen')), 'Card transitioned to Frozen visual state');
    assert(await page.locator('#cardFreezeText').textContent() === 'Faollashtirish', 'Button text toggled to "Faollashtirish"');

    // Attempt transfer while card is frozen (Should be blocked!)
    await page.locator('button:has-text("P2P Pul O\'tkazish")').first().click();
    await page.locator('#recipientInput').fill('bobur@gmail.com');
    await page.locator('#amountInput').fill('50');
    await page.locator('#submitTransferBtn').click();
    const frozenAlert = await page.locator('#transferAlert').textContent();
    assert(frozenAlert.includes('muzlatilgan'), `Transfer blocked when card is frozen: "${frozenAlert}"`);
    await page.locator('#transferModal button[onclick="closeTransferModal()"]').click();

    // Unfreeze card
    await page.locator('#cardFreezeBtn').click();
    assert(await page.locator('#cardFreezeText').textContent() === 'Muzlatish', 'Card successfully unfrozen');

    // ---------------------------------------------------------
    // TEST SUITE 4: SECURITY & BOUNDARY VALIDATIONS
    // ---------------------------------------------------------
    console.log('\n--- 4. SECURITY AUDIT INVARIANTS & BOUNDARY TESTS ---');
    
    // Create a 2nd user in database so we can test P2P transfer
    await page.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('fintech_users') || '[]');
      users.push({
        id: 'USR-BOBUR-01',
        firstName: 'Zahiriddin',
        lastName: 'Bobur',
        email: 'bobur@gmail.com',
        phone: '+998917654321',
        password: 'pass123',
        walletNumber: 'WAL-5555-7777-USD',
        balance: 500.00,
        isFrozen: false,
        transactions: []
      });
      localStorage.setItem('fintech_users', JSON.stringify(users));
    });

    // Re-render other users
    await page.evaluate(() => renderOtherUsers());

    // 4.1: Negative transfer amount exploit attempt
    await page.locator('button:has-text("P2P Pul O\'tkazish")').first().click();
    await page.locator('#recipientInput').fill('bobur@gmail.com');
    await page.locator('#amountInput').fill('-100');
    await page.locator('#submitTransferBtn').click();
    const negativeAlert = await page.locator('#transferAlert').textContent();
    assert(negativeAlert.includes('0 dan katta va to\'g\'ri musbat son'), `SEC-02: Negative transfer blocked: "${negativeAlert}"`);

    // 4.2: Self-transfer exploit attempt
    await page.locator('#recipientInput').fill('alisher.navoiy@gmail.com');
    await page.locator('#amountInput').fill('50');
    await page.locator('#submitTransferBtn').click();
    const selfAlert = await page.locator('#transferAlert').textContent();
    assert(selfAlert.includes('O\'z hamyoningizga P2P pul o\'tkaza olmaysiz'), `SEC-06: Self-transfer blocked: "${selfAlert}"`);

    // 4.3: Exceeding balance transfer attempt
    await page.locator('#recipientInput').fill('bobur@gmail.com');
    await page.locator('#amountInput').fill('50000');
    await page.locator('#submitTransferBtn').click();
    const exceedAlert = await page.locator('#transferAlert').textContent();
    assert(exceedAlert.includes('Hisobingizda yetarli mablag\' mavjud emas'), `SEC-02: Exceeding balance transfer blocked: "${exceedAlert}"`);

    // 4.4: Valid P2P Transfer ($100 with 0.5% fee = $100.50 deduction)
    await page.locator('#amountInput').fill('50');
    await page.locator('#descriptionInput').fill('Kitob nashriyoti uchun');
    await page.locator('#submitTransferBtn').click();

    // Verify Receipt Modal opens
    await page.locator('#receiptModal').waitFor({ state: 'visible' });
    assert(await page.locator('#receiptModal').isVisible(), 'Receipt modal opened automatically upon commit');
    const rcpAmount = await page.locator('#rcpAmount').textContent();
    assert(rcpAmount === '$50.00', `Receipt amount verified ($50.00)`);
    await page.locator('#receiptModal button:has-text("Yopish")').click();

    // Verify Sender New Balance: $1000.00 - ($50.00 + $0.25 fee) = $949.75
    const updatedBalance = await page.locator('#balanceDisplay').textContent();
    assert(updatedBalance === '949.75', `Sender balance accurately debited with exact fee: $949.75 (got: ${updatedBalance})`);

    // Verify Recipient Received $50.00
    const recipientBalance = await page.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('fintech_users'));
      const bobur = users.find(u => u.email === 'bobur@gmail.com');
      return bobur.balance;
    });
    assert(recipientBalance === 550.00, `Recipient balance credited accurately: $550.00 (got: ${recipientBalance})`);

    // ---------------------------------------------------------
    // TEST SUITE 5: BALANCE TOP-UP (DEPOSIT)
    // ---------------------------------------------------------
    console.log('\n--- 5. BALANCE TOP-UP (DEPOSIT) ---');
    await page.evaluate(() => simulateDeposit());
    const topupBalance = await page.locator('#balanceDisplay').textContent();
    assert(topupBalance === '1,949.75', `Balance topped up by +$1,000.00: $1,949.75 (got: ${topupBalance})`);

    // ---------------------------------------------------------
    // TEST SUITE 6: RESPONSIVE CAPTURES & VISUAL VALIDATION
    // ---------------------------------------------------------
    console.log('\n--- 6. RESPONSIVE CHECK & ARTIFACT SCREENSHOTS ---');
    
    // Desktop Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    const desktopScreenshotPath = path.join(SCREENSHOTS_DIR, 'desktop-dashboard.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
    assert(fs.existsSync(desktopScreenshotPath), `Desktop screenshot captured: ${desktopScreenshotPath}`);

    // Mobile Viewport (iPhone 14 standard: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileScreenshotPath = path.join(SCREENSHOTS_DIR, 'mobile-dashboard.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
    assert(fs.existsSync(mobileScreenshotPath), `Mobile screenshot captured: ${mobileScreenshotPath}`);

    console.log('\n======================================================================');
    console.log(`[TEST RUN SUMMARY] Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log('======================================================================\n');

  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();
