const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

function parseMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];
  let inList = false;
  let listType = '';

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    let tableHtml = '<div class="table-container"><table>\n';
    let isHeader = true;

    for (let i = 0; i < tableRows.length; i++) {
      const row = tableRows[i];
      // Skip markdown separator row like | :--- | :--- |
      if (row.every(cell => /^:?-+:?$/.test(cell.trim()))) {
        isHeader = false;
        continue;
      }
      tableHtml += '  <tr>\n';
      for (const cell of row) {
        const tag = isHeader ? 'th' : 'td';
        tableHtml += `    <${tag}>${formatInline(cell.trim())}</${tag}>\n`;
      }
      tableHtml += '  </tr>\n';
      if (i === 0 && isHeader) {
        // if next row is separator, we know first row was header
        if (tableRows[i + 1] && tableRows[i + 1].every(cell => /^:?-+:?$/.test(cell.trim()))) {
          isHeader = false;
        }
      }
    }
    tableHtml += '</table></div>\n';
    html += tableHtml;
    tableRows = [];
    inTable = false;
  };

  const flushList = () => {
    if (!inList) return;
    html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
    inList = false;
  };

  const formatInline = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\$(.*?)\$/g, '<span class="math">$1</span>');
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushTable();
        flushList();
        const codeContent = codeBuffer.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        html += `<pre class="code-block ${codeBlockLang}"><code>${codeContent}</code></pre>\n`;
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushTable();
        flushList();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal Rule
    if (/^(\-{3,}|\_{3,}|\*{3,})$/.test(trimmed)) {
      flushList();
      html += '<hr class="section-divider" />\n';
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      html += `<h1 class="doc-title">${formatInline(trimmed.slice(2))}</h1>\n`;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      html += `<h2 class="section-heading">${formatInline(trimmed.slice(3))}</h2>\n`;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      html += `<h3 class="subsection-heading">${formatInline(trimmed.slice(4))}</h3>\n`;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      flushList();
      html += `<h4 class="minor-heading">${formatInline(trimmed.slice(5))}</h4>\n`;
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      flushList();
      html += `<blockquote>${formatInline(trimmed.slice(2))}</blockquote>\n`;
      continue;
    }

    // Unordered lists
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList || listType !== 'ul') {
        flushList();
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `  <li>${formatInline(trimmed.slice(2))}</li>\n`;
      continue;
    }

    // Ordered lists
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `  <li>${formatInline(olMatch[2])}</li>\n`;
      continue;
    }

    // Empty lines
    if (trimmed === '') {
      flushList();
      continue;
    }

    // Standard Paragraph
    flushList();
    html += `<p>${formatInline(trimmed)}</p>\n`;
  }

  flushTable();
  flushList();
  return html;
}

async function generatePdf() {
  const mdPath = path.resolve(__dirname, '../docs/DigiHisab_Project_Report.md');
  const pdfPath = path.resolve(__dirname, '../docs/DigiHisab_Project_Report.pdf');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  const parsedBody = parseMarkdown(mdContent);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DigiHisab Project Report</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .content-wrapper {
      padding: 24mm 20mm;
    }
    
    /* Cover Page Styling */
    .cover-page {
      padding: 40mm 20mm 30mm 20mm;
      min-height: 270mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-bottom: 2px solid #00a86b;
      page-break-after: always;
    }
    .cover-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 4px 12px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 9999px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .cover-title {
      font-size: 28pt;
      font-weight: 900;
      color: #0b2239;
      line-height: 1.15;
      margin: 0 0 12px 0;
      letter-spacing: -0.5px;
    }
    .cover-subtitle {
      font-size: 13pt;
      color: #475569;
      font-weight: 500;
      line-height: 1.5;
      margin-bottom: 30px;
    }
    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-top: 40px;
    }
    .meta-item {
      font-size: 9pt;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 7.5pt;
      display: block;
      margin-bottom: 3px;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 700;
    }

    /* Headings */
    h1.doc-title {
      display: none; /* Rendered on cover */
    }
    h2.section-heading {
      font-size: 15pt;
      font-weight: 800;
      color: #0b2239;
      border-bottom: 2px solid #00a86b;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }
    h3.subsection-heading {
      font-size: 12pt;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    h4.minor-heading {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 22px;
    }
    li {
      margin-bottom: 4px;
    }

    /* Tables */
    .table-container {
      width: 100%;
      margin: 14px 0 18px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    th {
      background-color: #0b2239;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #1e293b;
      letter-spacing: 0.3px;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    tr:hover {
      background-color: #f1f5f9;
    }

    /* Code Blocks */
    pre.code-block {
      background-color: #0b192c;
      color: #f1f5f9;
      padding: 12px 14px;
      border-radius: 8px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 12px 0 16px 0;
      border: 1px solid #1e293b;
      page-break-inside: avoid;
    }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.5pt;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre.code-block code {
      background-color: transparent;
      color: inherit;
      padding: 0;
      border: none;
    }

    /* Blockquotes */
    blockquote {
      background: #f8fafc;
      border-left: 4px solid #00a86b;
      margin: 12px 0;
      padding: 10px 14px;
      color: #334155;
      font-style: italic;
      border-radius: 0 6px 6px 0;
    }

    /* Dividers */
    hr.section-divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 22px 0;
    }

    /* Inline Math styling */
    span.math {
      font-family: "Cambria Math", "Latin Modern Math", serif;
      font-style: italic;
    }

    a {
      color: #0284c7;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div>
      <span class="cover-badge">Academic Engineering Thesis &amp; Investor Prospectus</span>
      <h1 class="cover-title">DigiHisab (ڈیجی حساب)</h1>
      <div class="cover-subtitle">
        AI-Powered Dual-Ledger Financial Operating System for Micro-Merchants &amp; Households<br>
        <em style="font-size: 10pt; color: #64748b;">A Resilient, Multimodal Accounting Architecture for Pakistan's Micro-Economy</em>
      </div>
    </div>

    <div class="cover-meta-grid">
      <div class="meta-item">
        <span class="meta-label">Lead Author &amp; Architect</span>
        <span class="meta-val">Muhammad Saad (saad110jb)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Academic Department</span>
        <span class="meta-val">Computer Science &amp; Software Engineering</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">System Release &amp; Build</span>
        <span class="meta-val">v2.4.1 (Production EAS APK)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Core Microservices</span>
        <span class="meta-val">Node.js Express + Python FastAPI ML</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">GitHub Repository</span>
        <span class="meta-val">github.com/Saad110jb/DigiHisab</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Production Verification</span>
        <span class="meta-val">28/28 E2E Playwright Specs Passing</span>
      </div>
    </div>
  </div>

  <!-- Document Body -->
  <div class="content-wrapper">
    ${parsedBody}
  </div>
</body>
</html>`;

  console.log('Launching headless Microsoft Edge via Playwright...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle' });

  console.log('Rendering print-perfect A4 PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '14mm',
      right: '14mm',
    },
    headerTemplate: `
      <div style="font-size: 7.5pt; font-family: Segoe UI, sans-serif; width: 100%; text-align: right; padding-right: 14mm; color: #64748b; border-bottom: 0.5px solid #e2e8f0; margin-bottom: 3mm; padding-bottom: 1.5mm;">
        DigiHisab (ڈیجی حساب) — Engineering Thesis & Project Report (v2.4.1)
      </div>`,
    footerTemplate: `
      <div style="font-size: 7.5pt; font-family: Segoe UI, sans-serif; width: 100%; display: flex; justify-content: space-between; padding-left: 14mm; padding-right: 14mm; color: #64748b; border-top: 0.5px solid #e2e8f0; padding-top: 1.5mm;">
        <span>CONFIDENTIAL &amp; PROPRIETARY • DEPARTMENT OF COMPUTER SCIENCE</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
  });

  await browser.close();
  console.log(`✅ Successfully generated: ${pdfPath}`);
}

generatePdf().catch((err) => {
  console.error('❌ Failed to generate PDF:', err);
  process.exit(1);
});
