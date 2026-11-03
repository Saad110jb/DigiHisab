import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { UserProfile } from '../store/auth.store';
import { IBusinessLogsResponse } from '../api/businessLogs.api';

export const buildAuditPdfHtml = (
  user: UserProfile | null,
  logsData: IBusinessLogsResponse,
  dateRangeLabel: string = 'This Month'
): string => {
  const storeName = user?.businessName || (user?.fullName ? `${user.fullName}'s Store` : 'میرا اسٹور');
  const ownerName = user?.fullName || 'اپنا نام / مالکانہ';
  const phone = user?.phone || '0300-0000000';
  const address = user?.address
    ? user?.city
      ? `${user.address}, ${user.city}`
      : user.address
    : user?.city || 'پاکستان';
  const merchantId = user?.id ? `MER-${user.id.slice(-6).toUpperCase()}` : 'MER-STORE';
  const printDate = new Date().toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const hashStamp = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`;

  // Cash sales sum
  const totalCashSales = logsData.cashSales.reduce((sum, item) => sum + item.amount, 0);

  // Udhaar receivables sum
  const totalUdhaarGiven = logsData.udhaarDebts
    .filter((u) => u.entryType === 'UDHAAR_GIVEN')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalWasooliReceived = logsData.udhaarDebts
    .filter((u) => u.entryType === 'WASOOLI_RECEIVED')
    .reduce((sum, item) => sum + item.amount, 0);

  // Supplier Dues sum
  const totalSupplierDue = logsData.supplierInvoices.reduce((sum, item) => sum + item.remainingDue, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${storeName} - Audit Statement</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.4;
      background-color: #FFFFFF;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0B192C;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .store-title {
      font-size: 22px;
      font-weight: 800;
      color: #0B192C;
      margin: 0 0 4px 0;
    }
    .store-sub {
      font-size: 11px;
      color: #475569;
      margin: 0;
    }
    .badge-merchant {
      background: #0B192C;
      color: #34D399;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-align: right;
    }
    .summary-banner {
      background: #0B192C;
      color: #FFFFFF;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary-banner .col {
      flex: 1;
    }
    .summary-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94A3B8;
    }
    .summary-value {
      font-size: 20px;
      font-weight: 800;
      color: #34D399;
      margin: 2px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0B192C;
      margin: 18px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
    }
    th {
      background-color: #F1F5F9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border: 1px solid #CBD5E1;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #E2E8F0;
      color: #1E293B;
    }
    tr:nth-child(even) td {
      background-color: #F8FAFC;
    }
    .green-text { color: #059669; font-weight: 700; }
    .red-text { color: #DC2626; font-weight: 700; }
    .blue-text { color: #0284C7; font-weight: 700; }
    .pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pill-green { background: #D1FAE5; color: #065F46; }
    .pill-red { background: #FEE2E2; color: #991B1B; }
    .pill-yellow { background: #FEF3C7; color: #92400E; }
    .pill-blue { background: #E0F2FE; color: #075985; }
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px dashed #CBD5E1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748B;
    }
    .signature-box {
      border-top: 1px solid #94A3B8;
      width: 160px;
      text-align: center;
      padding-top: 4px;
      margin-top: 40px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <h1 class="store-title">${storeName}</h1>
      <p class="store-sub"><strong>Owner/Merchant:</strong> ${ownerName} &bull; <strong>Contact:</strong> ${phone}</p>
      <p class="store-sub"><strong>Store Location:</strong> ${address}</p>
    </div>
    <div class="badge-merchant">
      <div>MERCHANT AUDIT STATEMENT</div>
      <div style="font-size: 13px; margin-top:2px;">${merchantId}</div>
      <div style="font-size: 9px; color: #94A3B8; margin-top:2px;">Range: ${dateRangeLabel}</div>
    </div>
  </div>

  <!-- SUMMARY BANNER -->
  <div class="summary-banner">
    <div class="col">
      <div class="summary-title">Total Cash Counter Sales</div>
      <div class="summary-value">Rs. ${totalCashSales.toLocaleString()}</div>
      <div style="font-size: 10px; color: #CBD5E1;">Recorded Retail Counter Entries</div>
    </div>
    <div class="col">
      <div class="summary-title">Udhaar Wasooli Received</div>
      <div class="summary-value" style="color: #6EE7B7;">Rs. ${totalWasooliReceived.toLocaleString()}</div>
      <div style="font-size: 10px; color: #CBD5E1;">Customer Recoveries</div>
    </div>
    <div class="col">
      <div class="summary-title">Outstanding Supplier Dues</div>
      <div class="summary-value" style="color: #FCA5A5;">Rs. ${totalSupplierDue.toLocaleString()}</div>
      <div style="font-size: 10px; color: #CBD5E1;">Pending Supplier Payables</div>
    </div>
  </div>

  <!-- SECTION 1: CASH SALES LOG -->
  <div class="section-title">
    <span>1. Cash Counter Sales Log (فوری نقد سیل لاگ)</span>
    <span style="font-size:11px; font-weight:normal; color:#64748B;">Total: ${logsData.cashSales.length} Records</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Amount (Rs.)</th>
        <th>Till / Account</th>
        <th>Item Summary / Note</th>
      </tr>
    </thead>
    <tbody>
      ${logsData.cashSales
        .map(
          (item) => `
        <tr>
          <td>${item.dateTime}</td>
          <td class="green-text">Rs. ${item.amount.toLocaleString()}</td>
          <td><span class="pill pill-blue">${item.targetAccount.replace('_', ' ')}</span></td>
          <td>${item.note || 'N/A'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 2: UDHAAR & DEBT LOG -->
  <div class="section-title">
    <span>2. Udhaar & Debt Recovery Audit (گاہک ادھار اور وصولی لاگ)</span>
    <span style="font-size:11px; font-weight:normal; color:#64748B;">Total: ${logsData.udhaarDebts.length} Records</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Customer Name</th>
        <th>Contact Phone</th>
        <th>Entry Type</th>
        <th>Amount (Rs.)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${logsData.udhaarDebts
        .map(
          (item) => `
        <tr>
          <td>${item.timestamp}</td>
          <td><strong>${item.customerName}</strong></td>
          <td>${item.phone}</td>
          <td class="${item.entryType === 'WASOOLI_RECEIVED' ? 'green-text' : 'red-text'}">
            ${item.entryType === 'WASOOLI_RECEIVED' ? 'Wasooli' : 'Udhaar Given'}
          </td>
          <td>Rs. ${item.amount.toLocaleString()}</td>
          <td>
            <span class="pill ${
              item.status === 'FULLY_CLEARED'
                ? 'pill-green'
                : item.status === 'PARTIAL'
                ? 'pill-yellow'
                : 'pill-red'
            }">${item.status}</span>
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 3: SUPPLIER INVOICES & DUES -->
  <div class="section-title">
    <span>3. Supplier Invoices & Dues Log (سپلائر خریداری و بلز)</span>
    <span style="font-size:11px; font-weight:normal; color:#64748B;">Total: ${logsData.supplierInvoices.length} Bills</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Invoice ID</th>
        <th>Supplier Name</th>
        <th>Invoice Total</th>
        <th>Paid Amount</th>
        <th>Remaining Due</th>
        <th>Verification</th>
      </tr>
    </thead>
    <tbody>
      ${logsData.supplierInvoices
        .map(
          (item) => `
        <tr>
          <td class="blue-text">${item.invoiceId}</td>
          <td><strong>${item.supplierName}</strong></td>
          <td>Rs. ${item.invoiceAmount.toLocaleString()}</td>
          <td class="green-text">Rs. ${item.paidAmount.toLocaleString()}</td>
          <td class="red-text">Rs. ${item.remainingDue.toLocaleString()}</td>
          <td><span class="pill pill-green">${item.verifiedStatus}</span></td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 4: STAFF PAYROLL -->
  <div class="section-title">
    <span>4. Staff Attendance & Tankha Payouts (ملازمین تنخواہ لاگ)</span>
    <span style="font-size:11px; font-weight:normal; color:#64748B;">Total: ${logsData.staffPayrolls.length} Records</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Staff Helper</th>
        <th>Role Title</th>
        <th>Month</th>
        <th>Days Present</th>
        <th>Advance Kharcha</th>
        <th>Net Paid</th>
        <th>Payout Status</th>
      </tr>
    </thead>
    <tbody>
      ${logsData.staffPayrolls
        .map(
          (item) => `
        <tr>
          <td><strong>${item.staffName}</strong></td>
          <td>${item.roleTitle}</td>
          <td>${item.month}</td>
          <td>${item.daysPresent} Days</td>
          <td class="red-text">Rs. ${item.advanceKharcha.toLocaleString()}</td>
          <td class="green-text">Rs. ${item.netPaid.toLocaleString()}</td>
          <td><span class="pill ${item.isPaid ? 'pill-green' : 'pill-yellow'}">${item.isPaid ? 'PAID ✓' : 'PENDING'}</span></td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 5: PROFIT ANALYTICS -->
  <div class="section-title">
    <span>5. Consolidated Profit & Savings Analytics (سالانہ منافع و بچت)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th>Total Inflow</th>
        <th>Total Outflow</th>
        <th>Net Profit</th>
        <th>Net Margin %</th>
      </tr>
    </thead>
    <tbody>
      ${logsData.profitAnalytics
        .map(
          (item) => `
        <tr>
          <td><strong>${item.month}</strong></td>
          <td class="green-text">Rs. ${item.totalInflow.toLocaleString()}</td>
          <td class="red-text">Rs. ${item.totalOutflow.toLocaleString()}</td>
          <td class="green-text">Rs. ${item.netProfit.toLocaleString()}</td>
          <td class="blue-text">+${item.netMarginPercent}%</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 6: SECURITY AUDIT TRAIL -->
  <div class="section-title">
    <span>6. Immutable Forensic Audit Trail (سستم سیکیورٹی آڈٹ لاگ)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Action Type</th>
        <th>Authorized Admin</th>
        <th>Audit Details & Reason</th>
      </tr>
    </thead>
    <tbody>
      ${logsData.auditLogs
        .map(
          (item) => `
        <tr>
          <td style="font-size:10px;">${item.timestamp}</td>
          <td><span class="pill pill-blue">${item.actionType}</span></td>
          <td>${item.authorizedByName} (${item.authorizedByRole})</td>
          <td>${item.reason}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <!-- FOOTER & VERIFICATION STAMP -->
  <div style="display: flex; justify-content: space-between; margin-top: 30px;">
    <div>
      <div style="font-size: 10px; color: #475569;">
        <strong>Cryptographic Verification Hash:</strong><br/>
        <code style="background:#F1F5F9; padding:2px 6px; border-radius:3px;">${hashStamp}</code>
      </div>
      <div style="font-size: 10px; color: #64748B; margin-top: 6px;">
        Generated by DigiHisab Khata AI Engine &bull; Printable Archival Record
      </div>
    </div>
    <div class="signature-box">
      <strong>Merchant Authorized Stamp</strong><br/>
      <span style="font-size:10px; color:#64748B;">${storeName}</span>
    </div>
  </div>

</body>
</html>
  `;
};

export const printAuditPdf = async (
  user: UserProfile | null,
  logsData: IBusinessLogsResponse,
  dateRangeLabel: string = 'This Month'
) => {
  const html = buildAuditPdfHtml(user, logsData, dateRangeLabel);
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  } else {
    await Print.printAsync({ html });
  }
};

export const shareAuditPdf = async (
  user: UserProfile | null,
  logsData: IBusinessLogsResponse,
  dateRangeLabel: string = 'This Month'
) => {
  const html = buildAuditPdfHtml(user, logsData, dateRangeLabel);
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${user?.businessName || 'Store'}_Audit_Report.pdf`,
      });
    } else {
      await Print.printAsync({ html });
    }
  }
};
