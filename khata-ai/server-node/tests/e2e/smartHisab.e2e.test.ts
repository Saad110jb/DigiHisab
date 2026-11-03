import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';

let mongoServer: MongoMemoryServer | null = null;

// Global Context Store for E2E Sequential Test Execution
let authToken: string;              // Master Profile Owner JWT
let cashierToken: string;           // Sub-Account Cashier JWT
let profileId: string;              // Master Profile ID
let cashierSubAccountId: string;    // Sub-Account Cashier ID
let customerId: string;             // Customer Counterparty ID
let supplierId: string;             // Supplier Counterparty ID
let staffId: string;                // Domestic Staff Counterparty ID
let receivableEntryId: string;      // First Ledger Entry ID
let kametiPoolId: string;           // Rotating Savings Pool ID
let kametiMemberId: string;         // Enrolled Member ID
let utilitySplitId: string;         // Utility Bill Record ID
let reminderJobId: string;          // Scheduled Debt Recovery Job ID
let reconciliationId: string;       // Cash Drawer Closing ID
let paymentLinkId: string;          // Dynamic Payment Link ID
let paymentLinkToken: string;       // Generated Payment Token
let categoryRuleId: string;         // Auto-categorization Rule ID
let maintenanceLogId: string;       // Domestic Repair Log ID
let payrollId: string;              // Domestic Payroll Record ID
let loanId: string;                 // Informal Loan Record ID
let assetId: string;                // Household Asset ID
let inventoryItemId: string;        // Inventory Item ID
let profitSummaryId: string;        // Profit Summary ID
let rationBudgetId: string;         // Ration Budget ID
let schoolFeeId: string;            // School Fee Record ID
let settlementContractId: string;   // Settlement Contract ID
let stockMovementId: string;        // Stock Movement ID
let supplierContractId: string;     // Supplier Contract ID
let purchaseOrderId: string;        // Wholesale Purchase Order ID
let auditLogId: string;             // Audit Log ID

describe('Digi Hisab E2E Master Integration Test Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const testUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/digihisab_e2e_test';

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
    } catch (err) {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(uri);
    }

    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.connection.syncIndexes();
  });

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  /* -------------------------------------------------------------------------- */
  /* 1. AUTHENTICATION & PROFILE MANAGEMENT                                     */
  /* -------------------------------------------------------------------------- */
  describe('1. Authentication & Profile Controller', () => {
    it('POST /api/v1/auth/register - Should register a new master merchant profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: '03001234567',
          fullName: 'Chaudhry Muhammad Ali',
          businessName: 'Ali General Store & Traders',
          pin: '123456',
          activePersona: 'VENDOR',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.profileId).toBeDefined();

      authToken = res.body.token;
      profileId = res.body.data.profileId;
    });

    it('POST /api/v1/auth/login-pin - Should login master merchant and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login-pin')
        .send({
          phone: '03001234567',
          pin: '123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('GET /api/v1/profile - Should retrieve master profile details', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(profileId);
    });

    it('POST /api/v1/profile/sub-accounts - Should create a cashier sub-account', async () => {
      const res = await request(app)
        .post('/api/v1/profile/sub-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tariq Cashier',
          phone: '03009998877',
          pin: '5555',
          role: 'CASHIER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();

      cashierSubAccountId = res.body.data._id;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. COUNTERPARTY MANAGEMENT                                                 */
  /* -------------------------------------------------------------------------- */
  describe('2. Counterparty Controller', () => {
    it('POST /api/v1/counterparties - Should register a Customer counterparty', async () => {
      const res = await request(app)
        .post('/api/v1/counterparties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Usman Customer',
          phone: '03129876543',
          relationType: 'CUSTOMER',
          creditLimit: 50000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      customerId = res.body.data._id;
    });

    it('POST /api/v1/counterparties - Should register a Supplier counterparty', async () => {
      const res = await request(app)
        .post('/api/v1/counterparties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Metro Wholesale Supplier',
          phone: '03215554433',
          relationType: 'SUPPLIER',
          creditLimit: 200000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      supplierId = res.body.data._id;
    });

    it('POST /api/v1/counterparties - Should register a Staff counterparty', async () => {
      const res = await request(app)
        .post('/api/v1/counterparties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Saima Maid',
          phone: '03337778899',
          relationType: 'STAFF',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      staffId = res.body.data._id;
    });

    it('GET /api/v1/counterparties - Should list registered counterparties with filter', async () => {
      const res = await request(app)
        .get('/api/v1/counterparties?relationType=CUSTOMER')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. LEDGER & TRANSACTIONS                                                   */
  /* -------------------------------------------------------------------------- */
  describe('3. Ledger Controller', () => {
    it('POST /api/v1/ledger - Should record Udhaar Given (Receivable)', async () => {
      const res = await request(app)
        .post('/api/v1/ledger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          counterpartyId: customerId,
          entryType: 'RECEIVABLE',
          amount: 15000,
          category: 'Grocery Sales',
          description: 'Monthly ration credit',
          paymentMode: 'CASH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      receivableEntryId = res.body.data._id;
    });

    it('POST /api/v1/ledger - Should record partial Udhaar Received (Collection)', async () => {
      const res = await request(app)
        .post('/api/v1/ledger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          counterpartyId: customerId,
          entryType: 'CASH_IN',
          amount: 5000,
          category: 'Debt Repayment',
          description: 'Partial Cash recovery',
          paymentMode: 'CASH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/ledger/summary - Should compute correct net receivable balance', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalReceivables).toBe(15000);
      expect(res.body.data.totalCashIn).toBe(5000);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. KAMETI ROTATING SAVINGS POOL                                            */
  /* -------------------------------------------------------------------------- */
  describe('4. Kameti Pool Controller', () => {
    it('POST /api/v1/kameti - Should create a new Kameti pool', async () => {
      const res = await request(app)
        .post('/api/v1/kameti')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Family Gold Committee',
          monthlyContribution: 10000,
          totalMonths: 5,
          startDate: '2026-10-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      kametiPoolId = res.body.data._id;
    });

    it('POST /api/v1/kameti/:id/members - Should enroll member into Kameti pool', async () => {
      const res = await request(app)
        .post(`/api/v1/kameti/${kametiPoolId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberName: 'Chaudhry Ali',
          memberPhone: '03001234567',
          payoutMonth: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      kametiMemberId = res.body.data.members[0]._id;
    });

    it('POST /api/v1/kameti/:id/members/:memberId/pay - Should log monthly contribution payment', async () => {
      const res = await request(app)
        .post(`/api/v1/kameti/${kametiPoolId}/members/${kametiMemberId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amountPaid: 10000,
          paymentMode: 'CASH',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. UTILITY BILL SPLIT & TENANTS                                            */
  /* -------------------------------------------------------------------------- */
  describe('5. Utility Controller', () => {
    it('POST /api/v1/utility - Should create a manual electricity bill split record', async () => {
      const res = await request(app)
        .post('/api/v1/utility')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          utilityType: 'ELECTRICITY',
          providerName: 'LESCO',
          billingMonth: '2026-09',
          totalBillAmount: 45000,
          billDueDate: '2026-10-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      utilitySplitId = res.body.data._id;
    });

    it('POST /api/v1/utility/:id/calculate-allocations - Should calculate tenant allocations', async () => {
      const res = await request(app)
        .post(`/api/v1/utility/${utilitySplitId}/calculate-allocations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tenantSubMeters: [
            { tenantOrFloorName: 'Ground Floor Tenant', subMeterUnitsConsumed: 300 },
            { tenantOrFloorName: 'Upper Floor Tenant', subMeterUnitsConsumed: 200 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. CASH DRAWER RECONCILIATION                                              */
  /* -------------------------------------------------------------------------- */
  describe('6. Cash Drawer Controller', () => {
    it('POST /api/v1/cash-drawer/reconcile - Should submit physical cash count', async () => {
      const res = await request(app)
        .post('/api/v1/cash-drawer/reconcile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          openingBalance: 5000,
          physicalCountedCash: 15000,
          noteDenominations: { 5000: 2, 1000: 5 },
          remarks: 'Evening shift end reconciliation',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      reconciliationId = res.body.data._id;
    });

    it('GET /api/v1/cash-drawer/stats - Should return cash drawer metrics', async () => {
      const res = await request(app)
        .get('/api/v1/cash-drawer/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 7. DOMESTIC MAINTENANCE LOGS                                              */
  /* -------------------------------------------------------------------------- */
  describe('7. Maintenance Controller', () => {
    it('POST /api/v1/maintenance - Should log domestic AC repair job', async () => {
      const res = await request(app)
        .post('/api/v1/maintenance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Inverter AC Gas Refill',
          maintenanceType: 'HVAC_AC',
          cost: 4500,
          serviceDate: '2026-09-20',
          nextServiceReminderDate: '2027-03-20',
          notes: 'Freon gas refilled with 1 year service warranty',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      maintenanceLogId = res.body.data._id;
    });

    it('GET /api/v1/maintenance/upcoming-reminders - Should fetch service reminders', async () => {
      const res = await request(app)
        .get('/api/v1/maintenance/upcoming-reminders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 8. DOMESTIC PAYROLL & STAFF                                               */
  /* -------------------------------------------------------------------------- */
  describe('8. Payroll Controller', () => {
    it('POST /api/v1/payroll - Should setup payroll profile for domestic maid', async () => {
      const res = await request(app)
        .post('/api/v1/payroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffCounterpartyId: staffId,
          staffName: 'Saima Maid',
          roleTitle: 'Maid',
          baseSalary: 25000,
          advancePlan: {
            totalAdvanceGiven: 10000,
            monthlyDeductionAmount: 2000,
            remainingBalance: 10000,
            active: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      payrollId = res.body.data._id;
    });

    it('POST /api/v1/payroll/:id/pay-salary - Should process monthly salary disbursement', async () => {
      const res = await request(app)
        .post(`/api/v1/payroll/${payrollId}/pay-salary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          month: '2026-09',
          daysPresent: 28,
          daysAbsent: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 9. DYNAMIC PAYMENT LINKS                                                   */
  /* -------------------------------------------------------------------------- */
  describe('9. Payment Link Controller', () => {
    it('POST /api/v1/payment-links - Should generate JazzCash/Easypaisa payment link', async () => {
      const res = await request(app)
        .post('/api/v1/payment-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 2500,
          counterpartyId: customerId,
          description: 'Invoice #104 payment link',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.linkToken).toBeDefined();

      paymentLinkId = res.body.data._id;
      paymentLinkToken = res.body.data.linkToken;
    });

    it('GET /api/v1/payment-links/public/:token - Should retrieve public invoice view', async () => {
      const res = await request(app)
        .get(`/api/v1/payment-links/public/${paymentLinkToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(2500);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 10. EXPENSE CATEGORY RULES                                                 */
  /* -------------------------------------------------------------------------- */
  describe('10. Expense Category Rule Controller', () => {
    it('POST /api/v1/category-rules - Should create auto-tagging keyword rule', async () => {
      const res = await request(app)
        .post('/api/v1/category-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryName: 'Daily Dairy & Groceries',
          personaTarget: 'BOTH',
          keywords: ['doodh', 'roti', 'dahi', 'ghee'],
          budgetCapMonthly: 30000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      categoryRuleId = res.body.data._id;
    });

    it('POST /api/v1/category-rules/:id/keywords - Should append new keywords to rule', async () => {
      const res = await request(app)
        .post(`/api/v1/category-rules/${categoryRuleId}/keywords`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          keywords: ['makhan', 'cream'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 11. INFORMAL LOANS / QARZ-E-HASANA                                        */
  /* -------------------------------------------------------------------------- */
  describe('11. Loan Controller', () => {
    it('POST /api/v1/loans - Should record Extended Qarz-e-Hasana loan', async () => {
      const res = await request(app)
        .post('/api/v1/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactName: 'Brother Ahmed',
          contactPhone: '03451112233',
          loanDirection: 'GIVEN',
          principalAmount: 50000,
          agreedReturnDate: '2026-12-31',
          notes: 'Interest-free Qarz-e-Hasana for medical emergency',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      loanId = res.body.data._id;
    });

    it('POST /api/v1/loans/:id/repay - Should log loan repayment', async () => {
      const res = await request(app)
        .post(`/api/v1/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 20000,
          paymentMode: 'BANK_TRANSFER',
          notes: 'First installment repayment via Meezan Bank',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.remainingAmount).toBe(30000);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 12. HOUSEHOLD ASSETS                                                       */
  /* -------------------------------------------------------------------------- */
  describe('12. Asset Controller', () => {
    it('POST /api/v1/assets - Should register home solar system asset', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetName: '10kW Hybrid Solar Inverter System',
          category: 'SOLAR_SYSTEM',
          purchaseDate: '2026-01-15',
          purchasePrice: 1200000,
          warrantyExpiryDate: '2031-01-15',
          vendorName: 'Inverex Solar Solutions',
          serialNumber: 'INV-10KW-998822',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      assetId = res.body.data._id;
    });

    it('GET /api/v1/assets/stats - Should fetch total asset valuation stats', async () => {
      const res = await request(app)
        .get('/api/v1/assets/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalValuation).toBeGreaterThanOrEqual(1200000);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 13. SKU INVENTORY MANAGEMENT                                              */
  /* -------------------------------------------------------------------------- */
  describe('13. Inventory Controller', () => {
    it('POST /api/v1/inventory - Should create SKU inventory item', async () => {
      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'RICE-SUPER-5KG',
          barcode: '8964000112233',
          itemName: 'Super Kernel Basmati Rice 5kg Pack',
          category: 'Pulses & Grain',
          stockOnHand: 50,
          lowStockThreshold: 10,
          wholesaleCost: 1800,
          retailPrice: 2200,
          unitOfMeasure: 'PACK',
          supplierCounterpartyId: supplierId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      inventoryItemId = res.body.data._id;
    });

    it('PATCH /api/v1/inventory/:id/adjust-stock - Should adjust stock level', async () => {
      const res = await request(app)
        .patch(`/api/v1/inventory/${inventoryItemId}/adjust-stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          adjustmentType: 'RESTOCK',
          quantity: 20,
          notes: 'Received fresh supplier shipment',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.newStock).toBe(70);
    });

    it('GET /api/v1/inventory/low-stock-alerts - Should query active inventory items', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/low-stock-alerts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 14. PROFIT SUMMARY                                                        */
  /* -------------------------------------------------------------------------- */
  describe('14. Profit Summary Controller', () => {
    it('POST /api/v1/profit-summary - Should record monthly profit summary', async () => {
      const res = await request(app)
        .post('/api/v1/profit-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          periodType: 'MONTHLY',
          periodKey: '2026-09',
          grossSales: 500000,
          costOfGoodsSold: 350000,
          operatingExpenses: 50000,
          totalReceivablesCollected: 120000,
          totalPayablesSettled: 200000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.netProfit).toBe(100000);
      profitSummaryId = res.body.data._id;
    });

    it('POST /api/v1/profit-summary/recalculate - Should recalculate metrics from ledger', async () => {
      const res = await request(app)
        .post('/api/v1/profit-summary/recalculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          periodType: 'MONTHLY',
          periodKey: '2026-09',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 15. RATION BUDGET                                                         */
  /* -------------------------------------------------------------------------- */
  describe('15. Ration Budget Controller', () => {
    it('POST /api/v1/ration-budget - Should create monthly ration budget', async () => {
      const res = await request(app)
        .post('/api/v1/ration-budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monthKey: '2026-09',
          totalMonthlyAllocatedBudget: 60000,
          categoryLimits: [
            { category: 'Atta/Flour', allocatedAmount: 10000, spentAmount: 4000 },
            { category: 'Cooking Oil', allocatedAmount: 12000, spentAmount: 6000 },
            { category: 'Meat & Chicken', allocatedAmount: 20000, spentAmount: 15000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      rationBudgetId = res.body.data._id;
    });

    it('POST /api/v1/ration-budget/:id/log-expense - Should log expense in category', async () => {
      const res = await request(app)
        .post(`/api/v1/ration-budget/${rationBudgetId}/log-expense`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'Atta/Flour',
          amount: 2500,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 16. SCHOOL FEE TRACKER                                                    */
  /* -------------------------------------------------------------------------- */
  describe('16. School Fee Tracker Controller', () => {
    it('POST /api/v1/school-fee - Should create school fee voucher', async () => {
      const res = await request(app)
        .post('/api/v1/school-fee')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          childName: 'Zainab Ali',
          schoolName: 'Army Public School (APS)',
          gradeClass: 'Class 5-B',
          termOrMonth: '2026-09',
          tuitionFeeAmount: 15000,
          vanTransportFeeAmount: 4000,
          siblingDiscountAmount: 1000,
          otherChargesAmount: 500,
          dueDate: '2026-10-10',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalDue).toBe(18500);
      schoolFeeId = res.body.data._id;
    });

    it('PATCH /api/v1/school-fee/:id/mark-paid - Should mark fee voucher paid', async () => {
      const res = await request(app)
        .patch(`/api/v1/school-fee/${schoolFeeId}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recordInLedger: true,
          paymentMode: 'BANK_TRANSFER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.feeRecord.isPaid).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 17. SETTLEMENT CONTRACT                                                    */
  /* -------------------------------------------------------------------------- */
  describe('17. Settlement Contract Controller', () => {
    it('POST /api/v1/settlement - Should create debt settlement discount offer', async () => {
      const res = await request(app)
        .post('/api/v1/settlement')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          counterpartyId: customerId,
          originalDebtAmount: 20000,
          offeredDiscountAmount: 3000,
          agreedPayoffAmount: 17000,
          daysOverdueAtOffer: 45,
          expiresAt: '2026-10-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      settlementContractId = res.body.data._id;
    });

    it('PATCH /api/v1/settlement/:id/status - Should accept settlement contract', async () => {
      const res = await request(app)
        .patch(`/api/v1/settlement/${settlementContractId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'ACCEPTED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 18. STOCK MOVEMENT AUDIT TRAIL                                             */
  /* -------------------------------------------------------------------------- */
  describe('18. Stock Movement Controller', () => {
    it('POST /api/v1/stock-movements - Should record restock movement', async () => {
      const res = await request(app)
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inventoryItemId: inventoryItemId,
          movementType: 'RESTOCK',
          quantityChange: 30,
          unitCost: 1800,
          notes: 'Bulk stock restock shipment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      stockMovementId = res.body.data._id;
    });

    it('GET /api/v1/stock-movements - Should list stock movements audit trail', async () => {
      const res = await request(app)
        .get('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 19. SUPPLIER CONTRACT                                                      */
  /* -------------------------------------------------------------------------- */
  describe('19. Supplier Contract Controller', () => {
    it('POST /api/v1/supplier-contracts - Should create supplier B2B terms contract', async () => {
      const res = await request(app)
        .post('/api/v1/supplier-contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierCounterpartyId: supplierId,
          contractTitle: 'Metro Wholesale Annual Trade Agreement',
          creditPeriodDays: 45,
          maxCreditCeiling: 300000,
          earlyPaymentDiscountPercent: 2.5,
          earlyPaymentWindowDays: 10,
          termsAndConditions: '2.5% discount if paid within 10 days via direct bank transfer.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      supplierContractId = res.body.data._id;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 20. WHOLESALE PURCHASE ORDER (PO)                                          */
  /* -------------------------------------------------------------------------- */
  describe('20. Wholesale Purchase Order Controller', () => {
    it('POST /api/v1/purchase-orders - Should create draft purchase order', async () => {
      const res = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierCounterpartyId: supplierId,
          poNumber: 'PO-2026-001',
          items: [
            {
              inventoryItemId: inventoryItemId,
              itemName: 'Super Kernel Basmati Rice 5kg Pack',
              quantityOrdered: 40,
              unitCost: 1750,
            },
          ],
          discount: 1000,
          tax: 0,
          notes: 'Quarterly bulk order replenishment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grandTotal).toBe(69000);
      purchaseOrderId = res.body.data._id;
    });

    it('PATCH /api/v1/purchase-orders/:id/receive - Should mark PO RECEIVED and auto-restock items', async () => {
      const res = await request(app)
        .patch(`/api/v1/purchase-orders/${purchaseOrderId}/receive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.po.status).toBe('RECEIVED');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 21. AUDIT LOGS                                                            */
  /* -------------------------------------------------------------------------- */
  describe('21. Audit Log Controller', () => {
    it('POST /api/v1/audit-logs - Should record security override audit event', async () => {
      const res = await request(app)
        .post('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'CREDIT_LIMIT_OVERRIDE',
          targetDocumentId: customerId,
          targetCollection: 'Counterparty',
          details: {
            previousLimit: 50000,
            newLimit: 100000,
            reason: 'Owner manual approval',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      auditLogId = res.body.data._id;
    });

    it('GET /api/v1/audit-logs - Should retrieve audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 22. AUTOMATED REMINDERS                                                   */
  /* -------------------------------------------------------------------------- */
  describe('22. Reminder Controller', () => {
    it('POST /api/v1/reminders - Should schedule a debt recovery reminder job', async () => {
      const res = await request(app)
        .post('/api/v1/reminders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          counterpartyId: customerId,
          scheduledFor: '2026-10-05',
          channel: 'WHATSAPP',
          customTemplateText: 'Respected Usman, reminder for pending balance of PKR 10,000.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      reminderJobId = res.body.data._id;
    });

    it('GET /api/v1/reminders - Should list scheduled debt recovery jobs', async () => {
      const res = await request(app)
        .get('/api/v1/reminders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
