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
  const overview = [
    { Metric: 'Accounts balance', Value: accounts.reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0) },
    { Metric: 'Investment value', Value: portfolios.reduce((sum: number, item: any) => sum + Number(item.current_value || 0), 0) },
    { Metric: 'Liabilities due', Value: liabilities.filter((item: any) => item.status !== 'Paid').reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) },
    { Metric: 'Business monthly value', Value: businesses.reduce((sum: number, item: any) => sum + Number(item.mrr || 0), 0) }
  ];
  exportExcel('fingent-complete-export', [
    { name: 'Overview', rows: overview }, { name: 'Accounts', rows: accounts }, { name: 'Transactions', rows: transactions }, { name: 'Investments', rows: portfolios }, { name: 'Liabilities', rows: liabilities },
    { name: 'Income Flows', rows: incomeFlows }, { name: 'Goals', rows: goals }, { name: 'Budgets', rows: budgets }, { name: 'Categories', rows: categories }, { name: 'Career', rows: career }, { name: 'Personal Notes', rows: notes }, { name: 'Routines', rows: routines },
    { name: 'Businesses', rows: businesses }, { name: 'Business Records', rows: businessItems }, { name: 'Business Cash Flow', rows: businessTransactions }, { name: 'Freelance Businesses', rows: freelanceBusinesses }, { name: 'Freelance Services', rows: services }, { name: 'Freelance Invoices', rows: invoices }, { name: 'Freelance Time Logs', rows: timeLogs }
  ]);
}
