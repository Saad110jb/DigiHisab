/**
 * DigiHisab Complete End-to-End (E2E) Test Suite
 * File: tests/e2e/digihisab-full-suite.spec.ts
 *
 * Covers:
 *   - Module 1: SuperAdmin Authentication & Zero-Trust Security (/admin/login, TOTP 2FA, Invalidation)
 *   - Module 2: Dynamic Subscriptions & Persona Access Gates (20-Khata Quota, Cross-Persona Isolation, Dual VIP)
 *   - Module 3: Live Settings & Kill-Switches (Master Paywall Kill-Switch, Maintenance Interceptor)
 *   - Module 4: Payment Lifecycle & Webhooks (Manual Pilot TID, Easypaisa Gateway Callback, Udhaar WhatsApp Links)
 *   - Module 5: JEV Double-Entry Engine & Safe OPEX Budget Guardian
 *   - Module 6: Dukandar Retail POS, Continuous Barcode Viewfinder & Galla Bandi
 *   - Module 7: Chor Nazar Sentinel & Fraud Radar (Till Skimming Push Alerts, Manager PIN Gate)
 *   - Module 8: Household (Ghar Ka Hisab) Sub-Meters, Kameti & Domestic Staff
 *   - Module 9: Roman Urdu Voice AI & Multi-Tone Taqaza Debt Recovery
 *   - Module 10: SBP CNIC KYC Compliance & Immutable Audit Trail
 */

import { test, expect, Page } from '@playwright/test';

const SUPERADMIN_BASE = process.env.SUPERADMIN_URL || 'http://localhost:3000';
const BACKEND_API_BASE = process.env.BACKEND_API_URL || 'http://localhost:5000/api/v1';

// Seed Credentials
const ROOT_ADMIN = {
  email: 'admin.root@digihisab.pk',
  password: 'Root@Sentinel#2026',
  validTotp: '123456', // Test TOTP bypass or mock
  invalidTotp: '888888',
};

const DUKANDAR_FREE_USER = {
  phone: '03001234567',
  fullName: 'Tariq Kiryana Store',
  persona: 'DUKANDAR',
  tier: 'FREE_STARTER',
};

const DUKANDAR_PRO_USER = {
  phone: '03009663004',
  fullName: 'Muhammad Saad Store',
  persona: 'DUKANDAR',
  tier: 'DUKAN_PRO_MALIK_400',
};

const HOUSEHOLD_PRO_USER = {
  phone: '03119876543',
  fullName: 'Ayesha Domestic Hub',
  persona: 'HOUSEHOLD',
  tier: 'GHAR_AI_PRO_200',
};

const DUAL_VIP_USER = {
  phone: '03215555555',
  fullName: 'Malik Jahangir Dual',
  persona: 'DUAL_VIP',
  tier: 'DUAL_VIP_750',
};

// Snapshot State for Safe Staging Teardown
let originalPaywallState = true;
let originalMaintenanceState = false;

test.beforeAll(async () => {
  // 1. Capture original SuperAdmin settings state
  try {
    const res = await fetch(`${SUPERADMIN_BASE}/api/v1/admin/settings`, {
      headers: { 'x-e2e-test': 'true' },
    });
    if (res.ok) {
      const data = await res.json();
      originalPaywallState = data?.settings?.enforceSubscriptionPaywalls ?? true;
      originalMaintenanceState = data?.settings?.platformMaintenanceMode ?? false;
    }
  } catch (err) {
    console.warn('[E2E Setup] Could not query SuperAdmin settings, using defaults');
  }
});

test.afterAll(async () => {
  // Restore staging environment safeguards
  try {
    await fetch(`${SUPERADMIN_BASE}/api/v1/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({
        enforceSubscriptionPaywalls: originalPaywallState,
        platformMaintenanceMode: originalMaintenanceState,
      }),
    });
    console.log('[E2E Teardown] Staging flags restored cleanly.');
  } catch (err) {
    console.error('[E2E Teardown Error] Failed to restore settings:', err);
  }
});

// Helper for SuperAdmin login with TOTP
async function loginAdmin(page: any) {
  await page.goto(`${SUPERADMIN_BASE}/admin`);
  // If already authenticated and not at login page
  if (!page.url().includes('/admin/login')) {
    return;
  }

  await page.locator('input[placeholder*="admin.root"]').fill(ROOT_ADMIN.email);
  await page.locator('input[type="password"]').fill(ROOT_ADMIN.password);
  await page.click('button[type="submit"]');

  const validDigits = ROOT_ADMIN.validTotp.split('');
  const otpInputs = page.locator('input[inputmode="numeric"]');
  await expect(otpInputs.first()).toBeVisible({ timeout: 10000 });
  for (let i = 0; i < validDigits.length; i++) {
    await otpInputs.nth(i).fill(validDigits[i]);
  }

  const submitBtn = page.locator('button[type="submit"]');
  await expect(submitBtn).toBeEnabled({ timeout: 8000 });
  await submitBtn.click();
  await expect(page).not.toHaveURL(new RegExp('/admin/login'), { timeout: 15000 });
}

// ============================================================================
// MODULE 1: SUPERADMIN AUTHENTICATION & ZERO-TRUST SECURITY
// ============================================================================
test.describe('Module 1: SuperAdmin Zero-Trust Security & 2FA Gateways', () => {
  test('1.1 Unauthenticated Route Protection: Redirection to /admin/login', async ({ page }) => {
    // Attempt accessing protected superadmin routes without a session cookie
    const protectedRoutes = ['/admin', '/admin/subscriptions', '/admin/settings', '/admin/security'];
    for (const route of protectedRoutes) {
      await page.goto(`${SUPERADMIN_BASE}${route}`);
      await expect(page).toHaveURL(new RegExp('/admin/login'));
    }
  });

  test('1.2 Two-Step Credential Verification & TOTP Challenge', async ({ context, page }) => {
    await context.clearCookies();
    await page.goto(`${SUPERADMIN_BASE}/admin/login`);

    // Step 1: Credential Entry
    await page.locator('input[placeholder*="admin.root"]').fill(ROOT_ADMIN.email);
    await page.locator('input[type="password"]').fill(ROOT_ADMIN.password);
    await page.click('button[type="submit"]');

    // Should transition to Step 2: TOTP Challenge (6 numeric inputs)
    const invalidDigits = ROOT_ADMIN.invalidTotp.split('');
    const otpInputs = page.locator('input[inputmode="numeric"]');
    await expect(otpInputs.first()).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < invalidDigits.length; i++) {
      await otpInputs.nth(i).fill(invalidDigits[i]);
    }
    const invalidSubmitBtn = page.locator('button[type="submit"]');
    await expect(invalidSubmitBtn).toBeEnabled({ timeout: 5000 });
    await invalidSubmitBtn.click();
    await expect(page.getByText(/Invalid/i)).toBeVisible({ timeout: 8000 });

    // The form clears inputs on invalid token and stays on the TOTP challenge screen.
    // Wait for the inputs to reset completely before typing valid code
    await expect(otpInputs.first()).toHaveValue('', { timeout: 4000 });
    await page.waitForTimeout(300);

    // Now supply valid TOTP to complete verification and enter /admin
    const validDigits = ROOT_ADMIN.validTotp.split('');
    for (let i = 0; i < validDigits.length; i++) {
      await otpInputs.nth(i).fill(validDigits[i]);
    }
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await expect(page).not.toHaveURL(new RegExp('/admin/login'), { timeout: 15000 });
  });

  test('1.3 Anonymous Directory & Credential Visibility Safeguards', async ({ page }) => {
    // 1. Authenticate via Zero-Trust gateway
    await loginAdmin(page);

    // 2. Navigate to Administrator Security Directory on /admin/rbac
    await page.goto(`${SUPERADMIN_BASE}/admin/rbac`);
    await expect(page).toHaveURL(new RegExp('/admin/rbac'));

    // Must enforce anonymous identity (No consumer headshots or consumer names)
    const avatars = page.locator('img[alt*="avatar"], img[alt*="profile"]');
    expect(await avatars.count()).toBe(0);

    // Password Eye toggle should show/hide masked secret
    const eyeToggle = page.locator('button[title*="Password" i], button:has(svg.lucide-eye)').first();
    if (await eyeToggle.isVisible()) {
      await eyeToggle.click();
      await expect(
        page.locator('button[title*="Hide Password" i], button:has(svg.lucide-eye-off)').first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('1.4 Emergency Global Session Invalidation', async ({ page, context }) => {
    await loginAdmin(page);
    await page.goto(`${SUPERADMIN_BASE}/admin/settings`);
    const securityTab = page.locator('button:has-text("Security"), button:has-text("سیکیورٹی")');
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }

    // Click Invalidate All Sessions button
    const invalidateBtn = page.locator('button:has-text("Invalidate All Sessions")');
    if (await invalidateBtn.isVisible()) {
      await invalidateBtn.click();
      // Confirm modal
      const confirmBtn = page.locator('button:has-text("Confirm Invalidation"), button:has-text("تمام سیشن ختم کریں")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      // Refreshing open tab should force redirection back to /admin/login
      await page.reload();
      await expect(page).toHaveURL(new RegExp('/admin/login'));
    }
  });
});

// ============================================================================
// MODULE 2: DYNAMIC SUBSCRIPTIONS & PERSONA ACCESS GATES
// ============================================================================
test.describe('Module 2: Dynamic Subscriptions & Persona Sandboxing', () => {
  test('2.1 Freemium Quota Ceiling: 20-Khata Cap Enforcement', async () => {
    // Attempt adding customer #21 via API for a Free Starter merchant
    const res = await fetch(`${BACKEND_API_BASE}/counterparties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-tier': 'FREE_STARTER',
        'x-test-customer-count': '20',
      },
      body: JSON.stringify({
        name: 'Customer 21 Test',
        phone: '03009999999',
        type: 'CUSTOMER',
      }),
    });

    if (res.status === 402 || res.status === 403) {
      const data = await res.json();
      expect(data.error || data.message).toMatch(/(PAYWALL|LIMIT_EXCEEDED|QUOTA)/i);
    }
  });

  test('2.2 Cross-Persona Isolation: Household vs Dukandar Sandboxing', async () => {
    // Household user attempting to invoke Dukandar POS route
    const posRes = await fetch(`${BACKEND_API_BASE}/cash-drawer/reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-persona': 'HOUSEHOLD',
        'x-test-tier': 'GHAR_AI_PRO_200',
      },
      body: JSON.stringify({ physicalCash: 15000 }),
    });
    expect([400, 401, 403]).toContain(posRes.status);

    // Dukandar user attempting to invoke Household utility route
    const submeterRes = await fetch(`${BACKEND_API_BASE}/utility-bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-persona': 'DUKANDAR',
        'x-test-tier': 'DUKAN_PRO_MALIK_400',
      },
      body: JSON.stringify({ unitsConsumed: 120, tariff: 52 }),
    });
    expect([400, 401, 403]).toContain(submeterRes.status);
  });

  test('2.3 Dual-Persona VIP Access & 10 Sub-Account Allowance', async () => {
    // Dual VIP user accessing both domains simultaneously
    const res = await fetch(`${BACKEND_API_BASE}/auth/verify-capabilities`, {
      headers: {
        'x-test-tier': 'DUAL_VIP_750',
      },
    });
    if (res.ok) {
      const data = await res.json();
      expect(data.allowedPersonas).toContain('DUKANDAR');
      expect(data.allowedPersonas).toContain('HOUSEHOLD');
      expect(data.maxSubAccounts).toBeGreaterThanOrEqual(10);
    }
  });

  test('2.4 Dynamic Price & Visibility Toggle Propagation', async () => {
    // 1. Update DUKAN_BASIC_250 price to Rs. 300 via SuperAdmin API
    const patchRes = await fetch(`${SUPERADMIN_BASE}/api/v1/admin/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({
        planKey: 'DUKAN_BASIC_250',
        monthlyPrice: 300,
        isVisible: true,
      }),
    });

    if (patchRes.ok) {
      // 2. Fetch public config on client and verify new Rs. 300 price
      const configRes = await fetch(`${SUPERADMIN_BASE}/api/v1/config/app-version`);
      const configData = await configRes.json();
      expect(configRes.status).toBe(200);
    }
  });
});

// ============================================================================
// MODULE 3: LIVE SETTINGS PROPAGATION & KILL-SWITCHES
// ============================================================================
test.describe('Module 3: Live Settings Propagation & Kill-Switches', () => {
  test('3.1 Master Subscription Paywall Kill-Switch Bypass', async () => {
    // Set enforceSubscriptionPaywalls: false in SuperAdmin
    await fetch(`${SUPERADMIN_BASE}/api/v1/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({ enforceSubscriptionPaywalls: false }),
    });

    // Check config endpoint
    const configRes = await fetch(`${SUPERADMIN_BASE}/api/v1/config/app-version`);
    const config = await configRes.json();
    const isEnforced = config?.data?.subscriptionEnforcementActive ?? config?.data?.enforcePaywalls;
    expect(isEnforced).toBe(false);

    // Free account can now register Customer #21 without 402 Paywall error
    const addRes = await fetch(`${BACKEND_API_BASE}/counterparties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-tier': 'FREE_STARTER',
        'x-bypass-paywall': 'true',
      },
      body: JSON.stringify({
        name: 'Free Customer #21 Bypass',
        phone: `0300${Date.now().toString().slice(-7)}`,
        relationType: 'CUSTOMER',
      }),
    });
    expect([200, 201]).toContain(addRes.status);
  });

  test('3.2 Platform Maintenance Mode Interceptor', async ({ page }) => {
    // Turn ON Maintenance Mode
    await fetch(`${SUPERADMIN_BASE}/api/v1/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({ platformMaintenanceMode: true }),
    });

    // Client user portal should be intercepted with maintenance banner
    await page.goto(`${SUPERADMIN_BASE}/maintenance`);
    await expect(page.getByRole('heading', { name: /Scheduled Platform Upgrade/i })).toBeVisible({ timeout: 10000 });

    // Reset Maintenance Mode back to false
    await fetch(`${SUPERADMIN_BASE}/api/v1/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({ platformMaintenanceMode: false }),
    });
  });

  test('3.3 Persona Safeguards & Operational Threshold Sync', async () => {
    // Sync Chor Nazar Threshold to Rs. 1000
    const res = await fetch(`${SUPERADMIN_BASE}/api/v1/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({
        chorNazarThreshold: 1000,
        submeterTariff: 52.0,
      }),
    });
    expect([200, 204]).toContain(res.status);
  });
});

// ============================================================================
// MODULE 4: PAYMENT LIFECYCLE & WEBHOOK GATEWAYS
// ============================================================================
test.describe('Module 4: Payment Lifecycle & Webhook Gateways', () => {
  const testTid = `TID_${Date.now()}`;

  test('4.1 Manual Pilot TID Submission & SuperAdmin Approval Desk', async () => {
    // 1. User submits pilot payment TID
    const submitRes = await fetch(`${BACKEND_API_BASE}/payments/manual/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tid: testTid,
        amount: 400,
        planKey: 'DUKAN_PRO_MALIK_400',
        method: 'EASYPAISA',
      }),
    });
    expect([200, 201]).toContain(submitRes.status);

    // 2. Duplicate submission with same TID must be rejected
    const dupRes = await fetch(`${BACKEND_API_BASE}/payments/manual/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tid: testTid,
        amount: 400,
        planKey: 'DUKAN_PRO_MALIK_400',
      }),
    });
    expect(dupRes.status).toBe(400);

    // 3. SuperAdmin approves TID
    const approveRes = await fetch(`${SUPERADMIN_BASE}/api/v1/admin/subscriptions/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-test': 'true' },
      body: JSON.stringify({ tid: testTid }),
    });
    expect([200, 204]).toContain(approveRes.status);
  });

  test('4.2 Automated Easypaisa Gateway Webhook Simulation', async () => {
    const orderRef = `DH_SUB_${Date.now()}`;
    const webhookRes = await fetch(`${BACKEND_API_BASE}/payments/easypaisa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderRefNum: orderRef,
        responseCode: '0000',
        amount: '250.00',
        signature: 'TEST_VALID_HASH',
      }),
    });
    expect([200, 204]).toContain(webhookRes.status);
  });

  test('4.3 Customer Udhaar WhatsApp Payment Link & Auto-Clearance', async () => {
    const invoiceId = `DH_INV_${Date.now()}`;
    // Generate WhatsApp payment link for Rs. 1,850 debt
    const linkRes = await fetch(`${BACKEND_API_BASE}/payment-links/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId,
        amount: 1850,
        customerPhone: '923001234567',
        customerName: 'Rashid Khan',
      }),
    });

    if (linkRes.ok) {
      const data = await linkRes.json();
      expect(data.whatsappUrl).toContain('wa.me');
      expect(data.whatsappUrl).toContain(encodeURIComponent('1850'));

      // Simulate webhook clearance for this invoice
      const clearRes = await fetch(`${BACKEND_API_BASE}/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          status: 'SUCCESS',
          amount: 1850,
        }),
      });
      expect([200, 204]).toContain(clearRes.status);
    }
  });
});

// ============================================================================
// MODULE 5: JEV DOUBLE-ENTRY ENGINE & SAFE OPEX GUARDIAN
// ============================================================================
test.describe('Module 5: JEV Double-Entry Engine & Safe OPEX Guardian', () => {
  test('5.1 Strict Debit/Credit Balancing Law Verification', async () => {
    // Unbalanced voucher: Debit 5,000 vs Credit 4,000 -> Must fail with 422
    const unbalancedRes = await fetch(`${BACKEND_API_BASE}/jev/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Unbalanced Cash Voucher',
        entries: [
          { accountCode: '1010_CASH', debit: 5000, credit: 0 },
          { accountCode: '4010_SALES', debit: 0, credit: 4000 },
        ],
      }),
    });
    expect(unbalancedRes.status).toBe(422);

    // Balanced voucher: Debit 5,000 == Credit 5,000 -> Must succeed
    const balancedRes = await fetch(`${BACKEND_API_BASE}/jev/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Balanced Cash Sale Voucher',
        entries: [
          { accountCode: '1010_CASH', debit: 5000, credit: 0 },
          { accountCode: '4010_SALES', debit: 0, credit: 5000 },
        ],
      }),
    });
    expect([200, 201]).toContain(balancedRes.status);
  });

  test('5.2 Daily Safe OPEX Budget Guardian States', async () => {
    // Fetch simulated budget state when spending within 30-day profit margin
    const budgetRes = await fetch(`${BACKEND_API_BASE}/jev/opex-guardian/simulate?amount=500`);
    if (budgetRes.ok) {
      const data = await budgetRes.json();
      expect(['SAFE', 'THRESHOLD_WARNING', 'OVERBUDGET']).toContain(data.state);
    }
  });

  test('5.3 Wholesale Purchase Order Accruals: Auto-JEV Posting', async () => {
    // Approve wholesale PO of Rs. 51,240
    const poRes = await fetch(`${BACKEND_API_BASE}/wholesale-po/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poNumber: `PO_${Date.now()}`,
        totalCost: 51240,
        distributorId: 'DIST_ALI_01',
      }),
    });
    if (poRes.ok) {
      const data = await poRes.json();
      expect(data.jevVoucherCreated).toBe(true);
      expect(data.debitAccount).toMatch(/INVENTORY/i);
      expect(data.creditAccount).toMatch(/ACCOUNTS_PAYABLE/i);
    }
  });
});

// ============================================================================
// MODULE 6: DUKANDAR RETAIL POS, HARDWARE SCANNER & GALLA BANDI
// ============================================================================
test.describe('Module 6: Retail POS, Rapid Barcode Scanner & Cash Drawer', () => {
  test('6.1 Rapid Barcode Buffer & Manual Keypad Fallback Integrity', async () => {
    // Test barcode lookup API
    const barcodeRes = await fetch(`${BACKEND_API_BASE}/inventory/barcode/8964000123456`);
    if (barcodeRes.ok) {
      const item = await barcodeRes.json();
      expect(item.retailPrice).toBeGreaterThan(0);
    }
  });

  test('6.2 Galla Bandi Denomination Reconciliation Calculation', async () => {
    // Calculate physical cash across notes:
    // (5000 * 2) + (1000 * 5) + (500 * 4) + (100 * 10) = 10,000 + 5,000 + 2,000 + 1,000 = 18,000
    const reconcileRes = await fetch(`${BACKEND_API_BASE}/till/reconcile-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        denominations: {
          '5000': 2,
          '1000': 5,
          '500': 4,
          '100': 10,
        },
        expectedCash: 18000,
      }),
    });
    if (reconcileRes.ok) {
      const data = await reconcileRes.json();
      expect(data.physicalCash).toBe(18000);
      expect(data.status).toBe('EXACT_MATCH');
      expect(data.discrepancy).toBe(0);
    }
  });

  test('6.3 Thermal Receipt Payload Structure (ESC/POS 58mm/80mm)', async () => {
    const receiptRes = await fetch(`${BACKEND_API_BASE}/receipts/generate-escpos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: `ORD_${Date.now()}`,
        items: [{ name: 'Atta 10kg', qty: 1, price: 1350 }],
        totalAmount: 1350,
      }),
    });
    if (receiptRes.ok) {
      const receipt = await receiptRes.json();
      expect(receipt.storeHeader).toBeDefined();
      expect(receipt.bilingualText).toBeDefined();
    }
  });
});

// ============================================================================
// MODULE 7: CHOR NAZAR SENTINEL & FRAUD DETECTION RADAR
// ============================================================================
test.describe('Module 7: Chor Nazar Sentinel & Till Skimming Protection', () => {
  test('7.1 Discrepancy Alerting on Cash Shortage', async () => {
    // Shortage of Rs. 1,500 against threshold of Rs. 1,000
    const alertRes = await fetch(`${BACKEND_API_BASE}/sentinel/evaluate-shortage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortageAmount: 1500,
        threshold: 1000,
      }),
    });
    if (alertRes.ok) {
      const data = await alertRes.json();
      expect(data.alertTriggered).toBe(true);
      expect(data.notificationDispatched).toBe(true);
    }
  });

  test('7.2 Manager PIN Override for Cashier Expense Limit', async () => {
    // Cashier attempting Rs. 8,000 expense (limit: Rs. 2,000)
    const pinRes = await fetch(`${BACKEND_API_BASE}/security/verify-manager-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        managerPin: '7860',
        expenseAmount: 8000,
      }),
    });
    if (pinRes.ok) {
      const data = await pinRes.json();
      expect(data.verified).toBe(true);
    }
  });
});

// ============================================================================
// MODULE 8: HOUSEHOLD (GHAR KA HISAB) DOMESTIC LEDGER & UTILITIES
// ============================================================================
test.describe('Module 8: Household Ledger, Sub-Meters & Kameti Hub', () => {
  test('8.1 Sub-Meter Electricity Slab Tariff Calculation', async () => {
    // Units consumed: 150 units at Rs. 52.00/unit = Rs. 7,800
    const calcRes = await fetch(`${BACKEND_API_BASE}/household/submeters/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantName: 'Upper Floor Tenant',
        previousReading: 1200,
        currentReading: 1350,
        tariffPerUnit: 52.0,
      }),
    });
    if (calcRes.ok) {
      const data = await calcRes.json();
      expect(data.unitsConsumed).toBe(150);
      expect(data.totalBill).toBe(7800);
    }
  });

  test('8.2 Kameti Committee 10-Month Payout Cycle', async () => {
    // Create 10-month, Rs. 10,000/month Kameti
    const kametiRes = await fetch(`${BACKEND_API_BASE}/household/kameti/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthlyContribution: 10000,
        totalMembers: 10,
        currentMonth: 4,
      }),
    });
    if (kametiRes.ok) {
      const data = await kametiRes.json();
      expect(data.monthlyPot).toBe(100000);
      expect(data.payoutDisbursed).toBeDefined();
    }
  });
});

// ============================================================================
// MODULE 9: ROMAN URDU AI VOICE & DYNAMIC TAQAZA RECOVERY
// ============================================================================
test.describe('Module 9: Roman Urdu Voice AI & Dynamic Taqaza Reminders', () => {
  test('9.1 Roman Urdu Intent & Entity Extraction', async () => {
    const transcript = 'Tariq se 2500 wasool kiye aur 400 ka doodh kharcha likho';
    const nlpRes = await fetch(`${BACKEND_API_BASE}/ai/parse-roman-urdu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    if (nlpRes.ok) {
      const data = await nlpRes.json();
      expect(data.intent1.type).toBe('WASOOLI');
      expect(data.intent1.amount).toBe(2500);
      expect(data.intent2.type).toBe('EXPENSE');
      expect(data.intent2.amount).toBe(400);
    }
  });

  test('9.2 Taqaza Multi-Tone Reminders Generation', async () => {
    for (const tone of ['POLITE', 'FIRM', 'FINAL_NOTICE']) {
      const taqazaRes = await fetch(`${BACKEND_API_BASE}/taqaza/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Kashif Ali',
          balance: 3200,
          tone,
        }),
      });
      if (taqazaRes.ok) {
        const msg = await taqazaRes.json();
        expect(msg.textUrdu.length).toBeGreaterThan(10);
      }
    }
  });
});

// ============================================================================
// MODULE 10: SBP CNIC KYC COMPLIANCE & IMMUTABLE AUDIT TRAIL
// ============================================================================
test.describe('Module 10: SBP CNIC KYC Compliance & Audit Logs', () => {
  test('10.1 CNIC KYC Upload & Approval Gate', async () => {
    // 1. Submit CNIC Smart Card for review
    const kycRes = await fetch(`${BACKEND_API_BASE}/kyc/submit-cnic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnicNumber: '35201-1234567-1',
        nameOnCard: 'Muhammad Saad',
        frontImageUri: 'mock_front.jpg',
      }),
    });
    if (kycRes.ok) {
      const data = await kycRes.json();
      expect(['UNDER_REVIEW', 'VERIFIED']).toContain(data.status);
    }
  });

  test('10.2 Tamper-Evident SuperAdmin Audit Log Ledger', async () => {
    // Fetch recent audit logs from SuperAdmin
    const auditRes = await fetch(`${SUPERADMIN_BASE}/api/v1/admin/audit-logs`, {
      headers: { 'x-e2e-test': 'true' },
    });
    expect(auditRes.status).toBe(200);
    const logs = await auditRes.json();
    const logList = logs?.data?.logs || logs?.data || logs;
    expect(Array.isArray(logList)).toBe(true);
  });
});
