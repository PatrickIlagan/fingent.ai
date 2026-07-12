import * as XLSX from 'xlsx-js-style';
import type { ExportRow } from './export';

type Sheet = { name: string; rows: ExportRow[] };
const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'fingent-export';
const moneyHeaders = /amount|balance|value|invested|currentvalue|target|saved|payable|income|expense|revenue|gross/i;
const headerStyle = { fill: { fgColor: { rgb: '0F766E' } }, font: { color: { rgb: 'FFFFFF' }, bold: true }, alignment: { vertical: 'center' } };
const totalStyle = { fill: { fgColor: { rgb: 'D1FAE5' } }, font: { color: { rgb: '065F46' }, bold: true } };

function makeSheet(rows: ExportRow[]) {
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const values = rows.map(row => headers.map(header => row[header] ?? ''));
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...values]);
  if (headers.length) {
    sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, values.length), c: headers.length - 1 } }) };
    sheet['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
    sheet['!cols'] = headers.map((header, index) => ({ wch: Math.min(42, Math.max(13, header.length + 3, ...values.map(row => String(row[index] ?? '').length + 2))) }));
    headers.forEach((header, column) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
      if (cell) cell.s = headerStyle;
      if (moneyHeaders.test(header)) {
        for (let row = 1; row <= values.length; row++) {
          const valueCell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
          if (valueCell && typeof valueCell.v === 'number') valueCell.z = '₱#,##0.00;[Red]-₱#,##0.00';
        }
      }
    });
    values.forEach((_, rowIndex) => headers.forEach((_, column) => {
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: column });
      const cell = sheet[address];
      if (cell && rowIndex % 2 === 1) cell.s = { fill: { fgColor: { rgb: 'F8FAFC' } } };
    }));
    const numericColumns = headers.map((header, column) => moneyHeaders.test(header) && values.some(row => typeof row[column] === 'number') ? column : -1).filter(column => column >= 0);
    if (numericColumns.length && values.length) {
      const totalRow = values.length + 1;
      const label = sheet[XLSX.utils.encode_cell({ r: totalRow, c: 0 })] = { t: 's', v: 'Total', s: totalStyle } as any;
      void label;
      numericColumns.forEach(column => {
        const address = XLSX.utils.encode_cell({ r: totalRow, c: column });
        const columnLetter = XLSX.utils.encode_col(column);
        sheet[address] = { t: 'n', v: 0, f: `SUM(${columnLetter}2:${columnLetter}${values.length + 1})`, s: totalStyle, z: moneyHeaders.test(headers[column]) ? '₱#,##0.00;[Red]-₱#,##0.00' : '#,##0.00' } as any;
      });
      sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: headers.length - 1 } });
    }
  }
  return sheet;
}

function sumFormula(sheetName: string, rows: ExportRow[], header: string) {
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const index = headers.findIndex(value => value.toLowerCase() === header.toLowerCase());
  if (index < 0 || !rows.length) return '0';
  const letter = XLSX.utils.encode_col(index);
  return "SUM('" + sheetName + "'!" + letter + "2:" + letter + (rows.length + 1) + ")";
}

function makeDashboard(metrics: { label: string; formula: string; color: string; note: string }[]) {
  const sheet = XLSX.utils.aoa_to_sheet([['FinGent Financial Dashboard'], ['Complete export workbook'], [], ['Metric', 'Amount (PHP)', 'Visual chart', 'What this means']]);
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }];
  sheet['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 32 }, { wch: 46 }];
  sheet['!freeze'] = { xSplit: 0, ySplit: 4 } as any;
  sheet.A1.s = { fill: { fgColor: { rgb: '0F766E' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 18 }, alignment: { horizontal: 'center', vertical: 'center' } };
  sheet.A2.s = { fill: { fgColor: { rgb: 'CCFBF1' } }, font: { color: { rgb: '115E59' }, italic: true }, alignment: { horizontal: 'center' } };
  ['A4', 'B4', 'C4', 'D4'].forEach(address => { sheet[address].s = headerStyle; });
  metrics.forEach((metric, index) => {
    const row = index + 5; const fill = metric.color; const maxRow = metrics.length + 4;
    sheet['A' + row] = { t: 's', v: metric.label, s: { fill: { fgColor: { rgb: fill } }, font: { color: { rgb: 'FFFFFF' }, bold: true } } } as any;
    sheet['B' + row] = { t: 'n', v: 0, f: metric.formula, z: '₱#,##0.00;[Red]-₱#,##0.00', s: { fill: { fgColor: { rgb: 'F8FAFC' } }, font: { bold: true, color: { rgb: '0F172A' } } } } as any;
    sheet['C' + row] = { t: 'str', v: '', f: 'IF(B' + row + '=0,"",REPT("█",ROUND(ABS(B' + row + ')/MAX($B$5:$B$' + maxRow + ')*24,0)))', s: { font: { color: { rgb: fill }, bold: true } } } as any;
    sheet['D' + row] = { t: 's', v: metric.note, s: { fill: { fgColor: { rgb: 'F8FAFC' } }, font: { color: { rgb: '475569' } } } } as any;
  });
  sheet['!ref'] = 'A1:D' + (metrics.length + 4);
  return sheet;
}

function exportExcelWithDashboard(filename: string, sheets: Sheet[], dashboard: ReturnType<typeof makeDashboard>) {
  const workbook = XLSX.utils.book_new();
  (workbook as any).Workbook = { CalcPr: { fullCalcOnLoad: true, forceFullCalc: true, calcMode: 'auto' } };
  XLSX.utils.book_append_sheet(workbook, dashboard, 'Dashboard');
  sheets.filter(sheet => sheet.rows.length > 0).forEach(sheet => XLSX.utils.book_append_sheet(workbook, makeSheet(sheet.rows), sheet.name.slice(0, 31)));
  XLSX.writeFile(workbook, safeName(filename) + '.xlsx', { compression: true });
}

export function exportExcel(filename: string, sheets: Sheet[]) {
  const workbook = XLSX.utils.book_new();
  (workbook as any).Workbook = { CalcPr: { fullCalcOnLoad: true, forceFullCalc: true, calcMode: 'auto' } };
  sheets.filter(sheet => sheet.rows.length > 0).forEach(sheet => XLSX.utils.book_append_sheet(workbook, makeSheet(sheet.rows), sheet.name.slice(0, 31)));
  if (!workbook.SheetNames.length) XLSX.utils.book_append_sheet(workbook, makeSheet([{ Message: 'No records to export.' }]), 'Overview');
  XLSX.writeFile(workbook, `${safeName(filename)}.xlsx`, { compression: true });
}

const fetchRows = async (path: string) => {
  const response = await fetch(path);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : data ? [data] : [];
};

export async function exportEverythingWorkbook() {
  const [accounts, transactions, portfolios, liabilities, incomeFlows, goals, budgets, categories, career, notes, routines, businesses, freelanceBusinesses, services, invoices, timeLogs] = await Promise.all([
    fetchRows('/api/accounts'), fetchRows('/api/transactions'), fetchRows('/api/portfolios'), fetchRows('/api/liabilities'), fetchRows('/api/income_flows'), fetchRows('/api/goals'), fetchRows('/api/budgets'), fetchRows('/api/categories'), fetchRows('/api/career'), fetchRows('/api/personal/notes'), fetchRows('/api/personal/routines'), fetchRows('/api/businesses'), fetchRows('/api/freelance_businesses'), fetchRows('/api/freelancing/services'), fetchRows('/api/freelancing/invoices'), fetchRows('/api/freelancing/time_logs')
  ]);
  const businessDetails = await Promise.all(businesses.map(async (business: any) => ({ business, items: await fetchRows(`/api/businesses/${business.id}/items`), transactions: await fetchRows(`/api/businesses/${business.id}/transactions`) })));
  const businessItems = businessDetails.flatMap(({ business, items }) => items.map((item: any) => ({ Business: business.name, Type: item.type, Name: item.name, Status: item.status, Value: item.value, Details: item.extra_info || '' })));
  const businessTransactions = businessDetails.flatMap(({ business, transactions }) => transactions.map((transaction: any) => ({ Business: business.name, Date: transaction.date, Type: transaction.type, Status: transaction.status || 'Paid', Category: transaction.category || '', Description: transaction.description, Amount: transaction.amount })));
  const sheets: Sheet[] = [
    { name: 'Accounts', rows: accounts }, { name: 'Transactions', rows: transactions }, { name: 'Investments', rows: portfolios }, { name: 'Liabilities', rows: liabilities },
    { name: 'Income Flows', rows: incomeFlows }, { name: 'Goals', rows: goals }, { name: 'Budgets', rows: budgets }, { name: 'Categories', rows: categories }, { name: 'Career', rows: career }, { name: 'Personal Notes', rows: notes }, { name: 'Routines', rows: routines },
    { name: 'Businesses', rows: businesses }, { name: 'Business Records', rows: businessItems }, { name: 'Business Cash Flow', rows: businessTransactions }, { name: 'Freelance Businesses', rows: freelanceBusinesses }, { name: 'Freelance Services', rows: services }, { name: 'Freelance Invoices', rows: invoices }, { name: 'Freelance Time Logs', rows: timeLogs }
  ];
  const accountTotal = sumFormula('Accounts', accounts, 'balance');
  const investmentTotal = sumFormula('Investments', portfolios, 'current_value');
  const liabilitiesTotal = sumFormula('Liabilities', liabilities, 'amount');
  const incomeTotal = sumFormula('Income Flows', incomeFlows, 'amount');
  const businessTotal = sumFormula('Businesses', businesses, 'mrr');
  const dashboard = makeDashboard([
    { label: 'Accounts balance', formula: accountTotal, color: '0F766E', note: 'Cash and account balances across FinGent.' },
    { label: 'Investment value', formula: investmentTotal, color: '2563EB', note: 'Current value of recorded portfolio holdings.' },
    { label: 'Liabilities due', formula: liabilitiesTotal, color: 'DC2626', note: 'Recorded bills, credits, debts, and installments.' },
    { label: 'Income flows', formula: incomeTotal, color: '7C3AED', note: 'Recorded income-flow amounts.' },
    { label: 'Business monthly value', formula: businessTotal, color: 'D97706', note: 'Monthly value from active business workspaces.' },
    { label: 'Net position', formula: 'B5+B6-B7', color: '059669', note: 'Accounts plus investments less liabilities.' }
  ]);
  exportExcelWithDashboard('fingent-complete-export', sheets, dashboard);
}
