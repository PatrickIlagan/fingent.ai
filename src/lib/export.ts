import jsPDF from 'jspdf';

export type ExportRow = Record<string, string | number | null | undefined>;

const clean = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'export';

export function exportCsv(filename: string, rows: ExportRow[]) {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = (value: unknown) => `"${clean(value).replace(/"/g, '""')}"`;
  const body = [columns.map(escape).join(','), ...rows.map(row => columns.map(column => escape(row[column])).join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url; link.download = `${safeName(filename)}.csv`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

type StatementSection = { title: string; rows: ExportRow[] };

export function exportPdfStatement(title: string, sections: StatementSection[], subtitle = '') {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210; const contentWidth = 190; let y = 0; let page = 1;
  const header = () => {
    pdf.setFillColor(13, 148, 136); pdf.rect(0, 0, pageWidth, 31, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(19); pdf.text(title, 10, 15);
    pdf.setFontSize(8); pdf.text(`FinGent statement  |  Generated ${new Date().toLocaleDateString('en-PH')}`, 10, 22);
    y = 40;
  };
  const nextPage = () => { pdf.addPage(); page += 1; header(); };
  const footer = () => { pdf.setTextColor(120); pdf.setFontSize(8); pdf.text(`Page ${page}`, 190, 289, { align: 'right' }); };
  header();
  if (subtitle) { pdf.setTextColor(80); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(subtitle, contentWidth), 10, y); y += 11; }
  const allRows = sections.flatMap(section => section.rows);
  const money = allRows.flatMap(row => Object.entries(row).filter(([key, value]) => /amount|balance|value|invested|revenue|income|expense|payable|target/i.test(key) && typeof value === 'number').map(([, value]) => Number(value)));
  pdf.setFillColor(240, 253, 250); pdf.roundedRect(10, y, 190, 21, 3, 3, 'F');
  pdf.setTextColor(6, 95, 70); pdf.setFontSize(8); pdf.text('RECORDS', 15, y + 7); pdf.text('TOTAL FINANCIAL VALUE', 76, y + 7); pdf.text('SECTIONS', 145, y + 7);
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.text(String(allRows.length), 15, y + 16); pdf.text(`PHP ${money.reduce((sum, value) => sum + value, 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`, 76, y + 16); pdf.text(String(sections.filter(section => section.rows.length).length), 145, y + 16); pdf.setFont('helvetica', 'normal'); y += 30;
  sections.forEach(section => {
    if (!section.rows.length) return;
    if (y > 265) { footer(); nextPage(); }
    pdf.setFillColor(15, 118, 110); pdf.roundedRect(10, y, 190, 8, 2, 2, 'F'); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(section.title, 14, y + 5.4); pdf.setFont('helvetica', 'normal'); y += 12;
    section.rows.forEach((row, index) => {
      const text = Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => `${key}: ${clean(value)}`).join('   |   ');
      const lines = pdf.splitTextToSize(text, contentWidth - 8); const height = Math.max(9, lines.length * 4.4 + 4);
      if (y + height > 280) { footer(); nextPage(); }
      pdf.setFillColor(index % 2 ? 248 : 240, index % 2 ? 250 : 253, index % 2 ? 252 : 250); pdf.roundedRect(10, y, 190, height, 1.5, 1.5, 'F');
      pdf.setTextColor(30); pdf.setFontSize(8.5); pdf.text(lines, 14, y + 5); y += height + 2;
    });
    y += 3;
  });
  footer(); pdf.save(`${safeName(title)}.pdf`);
}

export function exportPdf(title: string, rows: ExportRow[], subtitle = '') { exportPdfStatement(title, [{ title: 'Statement details', rows }], subtitle); }

const fetchRows = async (path: string) => {
  const response = await fetch(path); if (!response.ok) return [];
  const data = await response.json(); return Array.isArray(data) ? data : data ? [data] : [];
};

export async function exportEverythingPdfStatement() {
  const [accounts, transactions, investments, liabilities, incomeFlows, businesses, services, invoices] = await Promise.all([
    fetchRows('/api/accounts'), fetchRows('/api/transactions'), fetchRows('/api/portfolios'), fetchRows('/api/liabilities'), fetchRows('/api/income_flows'), fetchRows('/api/businesses'), fetchRows('/api/freelancing/services'), fetchRows('/api/freelancing/invoices')
  ]);
  exportPdfStatement('FinGent Financial Statement', [
    { title: 'Accounts', rows: accounts.map((item: any) => ({ Account: item.name, Type: item.type, Balance: item.balance, Purpose: item.purpose || '' })) },
    { title: 'Transactions', rows: transactions.map((item: any) => ({ Date: item.date, Account: item.account_name || '', Type: item.type, Category: item.category, Description: item.description || '', Amount: item.amount })) },
    { title: 'Investments', rows: investments.map((item: any) => ({ Asset: item.name, Type: item.type, Invested: item.invested, CurrentValue: item.current_value, Ticker: item.ticker || '' })) },
    { title: 'Liabilities', rows: liabilities.map((item: any) => ({ Name: item.name, Type: item.type, Status: item.status, Amount: item.amount, DueDate: item.date || '' })) },
    { title: 'Income Flows', rows: incomeFlows.map((item: any) => ({ Name: item.name, Category: item.category || 'Income', Date: item.date, Amount: item.amount, Recurring: item.is_recurring ? 'Yes' : 'No' })) },
    { title: 'Businesses', rows: businesses.map((item: any) => ({ Venture: item.name, Type: item.type, Status: item.status, MonthlyValue: item.mrr || 0, Customers: item.customers || 0 })) },
    { title: 'Freelance Services', rows: services.map((item: any) => ({ Service: item.name, Client: item.client || '', Status: item.status, Value: item.value || 0, Deadline: item.deadline || '' })) },
    { title: 'Freelance Invoices', rows: invoices.map((item: any) => ({ Invoice: item.invoice_number, Client: item.client_name || '', Status: item.status, Amount: item.amount, DueDate: item.due_date })) }
  ], 'A formatted snapshot of your FinGent data. This statement is for personal planning and record-keeping.');
}
