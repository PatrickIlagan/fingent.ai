import * as XLSX from 'xlsx-js-style';
import type { Workbook } from 'exceljs';
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

type DashboardMetric = { label: string; formula: string; color: string; note: string; value: number };

const currencyFormat = '₱#,##0.00;[Red]-₱#,##0.00';
const workbookHeaderFill = 'FF0F766E';

function numericValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value as string | number | boolean | Date;
}

function xmlText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function barChartSvg(metrics: DashboardMetric[]) {
  const chartMetrics = metrics.filter(metric => metric.label !== 'Net position');
  const maxValue = Math.max(1, ...chartMetrics.map(metric => Math.abs(metric.value)));
  const rows = chartMetrics.map((metric, index) => {
    const y = 70 + index * 58;
    const width = Math.max(2, Math.round((Math.abs(metric.value) / maxValue) * 430));
    const amount = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(metric.value);
    return '<text x="24" y="' + (y + 21) + '" font-family="Arial, sans-serif" font-size="14" fill="#334155">' + xmlText(metric.label) + '</text>'
      + '<rect x="245" y="' + y + '" width="430" height="30" rx="8" fill="#E2E8F0"/>'
      + '<rect x="245" y="' + y + '" width="' + width + '" height="30" rx="8" fill="#' + metric.color + '"/>'
      + '<text x="690" y="' + (y + 21) + '" text-anchor="end" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0F172A">' + xmlText(amount) + '</text>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="390" viewBox="0 0 720 390"><rect width="720" height="390" rx="18" fill="#FFFFFF"/><text x="24" y="36" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#0F172A">Financial overview</text><text x="24" y="57" font-family="Arial, sans-serif" font-size="12" fill="#64748B">Recorded balances and values from your FinGent workspaces</text>' + rows + '</svg>';
}

function pieSlicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = { x: cx + radius * Math.cos(startAngle), y: cy + radius * Math.sin(startAngle) };
  const end = { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return 'M ' + cx + ' ' + cy + ' L ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2) + ' Z';
}

function pieChartSvg(metrics: DashboardMetric[]) {
  const chartMetrics = metrics.filter(metric => metric.label !== 'Net position' && metric.value > 0);
  const total = chartMetrics.reduce((sum, metric) => sum + metric.value, 0);
  let currentAngle = -Math.PI / 2;
  const slices = total > 0 ? chartMetrics.map(metric => {
    const nextAngle = currentAngle + (metric.value / total) * Math.PI * 2;
    const path = pieSlicePath(170, 205, 120, currentAngle, nextAngle);
    currentAngle = nextAngle;
    return '<path d="' + path + '" fill="#' + metric.color + '" stroke="#FFFFFF" stroke-width="3"/>';
  }).join('') : '<circle cx="170" cy="205" r="120" fill="#E2E8F0"/>';
  const legend = (chartMetrics.length ? chartMetrics : [{ label: 'No positive balances yet', color: '94A3B8' } as DashboardMetric]).map((metric, index) => {
    const y = 100 + index * 48;
    const percent = total > 0 ? Math.round((metric.value / total) * 100) + '%' : '0%';
    return '<rect x="340" y="' + (y - 14) + '" width="14" height="14" rx="3" fill="#' + metric.color + '"/>'
      + '<text x="366" y="' + y + '" font-family="Arial, sans-serif" font-size="14" fill="#334155">' + xmlText(metric.label) + '</text>'
      + '<text x="675" y="' + y + '" text-anchor="end" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0F172A">' + percent + '</text>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="390" viewBox="0 0 720 390"><rect width="720" height="390" rx="18" fill="#FFFFFF"/><text x="24" y="36" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#0F172A">Positive-value mix</text><text x="24" y="57" font-family="Arial, sans-serif" font-size="12" fill="#64748B">Share of assets, income flows, and business monthly value</text>' + slices + '<circle cx="170" cy="205" r="68" fill="#FFFFFF"/><text x="170" y="199" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#64748B">TOTAL</text><text x="170" y="221" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0F172A">' + xmlText(new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(total)) + '</text>' + legend + '</svg>';
}

async function svgPng(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not render Excel chart.'));
      element.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 390;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare Excel chart.');
    context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function addDataWorksheet(workbook: Workbook, sheet: Sheet) {
  const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  const headers = Array.from(new Set(sheet.rows.flatMap(row => Object.keys(row))));
  if (!headers.length) {
    worksheet.addRow(['No records to export.']);
    return;
  }
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 23;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: workbookHeaderFill } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.rows.forEach((record, rowIndex) => {
    const row = worksheet.addRow(headers.map(header => cellValue(record[header])));
    row.eachCell((cell, column) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      if (moneyHeaders.test(headers[column - 1]) && typeof cell.value === 'number') cell.numFmt = currencyFormat;
    });
  });
  const numericColumns = headers.map((header, index) => moneyHeaders.test(header) && sheet.rows.some(row => typeof row[header] === 'number') ? index + 1 : 0).filter(Boolean);
  if (numericColumns.length && sheet.rows.length) {
    const totalRow = worksheet.addRow(headers.map((_, index) => index === 0 ? 'Total' : ''));
    totalRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      cell.font = { bold: true, color: { argb: 'FF065F46' } };
    });
    numericColumns.forEach(column => {
      const cell = totalRow.getCell(column);
      const letter = worksheet.getColumn(column).letter;
      cell.value = { formula: 'SUM(' + letter + '2:' + letter + (totalRow.number - 1) + ')', result: 0 };
      cell.numFmt = currencyFormat;
    });
  }
  headers.forEach((header, index) => {
    const longest = Math.max(header.length, ...sheet.rows.map(row => String(cellValue(row[header])).length));
    worksheet.getColumn(index + 1).width = Math.min(42, Math.max(13, longest + 2));
  });
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rows.length + 1), column: headers.length } };
}

async function exportDashboardWorkbook(filename: string, sheets: Sheet[], metrics: DashboardMetric[]) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FinGent';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const dashboard = workbook.addWorksheet('Dashboard', { views: [{ state: 'frozen', ySplit: 4 }] });
  dashboard.mergeCells('A1:J1');
  dashboard.mergeCells('A2:J2');
  dashboard.getCell('A1').value = 'FinGent Financial Dashboard';
  dashboard.getCell('A2').value = 'Interactive summary with calculation-ready source sheets and embedded charts';
  dashboard.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: workbookHeaderFill } };
  dashboard.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 18 };
  dashboard.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  dashboard.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
  dashboard.getCell('A2').font = { color: { argb: 'FF115E59' }, italic: true };
  dashboard.getCell('A2').alignment = { horizontal: 'center' };
  dashboard.getRow(1).height = 32;
  dashboard.getRow(2).height = 23;
  dashboard.getRow(4).values = ['Metric', 'Amount (PHP)', 'Quick visual', 'What this means'];
  dashboard.getRow(4).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: workbookHeaderFill } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });
  metrics.forEach((metric, index) => {
    const row = index + 5;
    const formulaBar = 'IF(B' + row + '=0,"",REPT("█",ROUND(ABS(B' + row + ')/MAX($B$5:$B$' + (metrics.length + 4) + ')*24,0)))';
    dashboard.getCell(row, 1).value = metric.label;
    dashboard.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + metric.color } };
    dashboard.getCell(row, 1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    dashboard.getCell(row, 2).value = { formula: metric.formula, result: metric.value };
    dashboard.getCell(row, 2).numFmt = currencyFormat;
    dashboard.getCell(row, 2).font = { bold: true };
    dashboard.getCell(row, 3).value = { formula: formulaBar, result: '' };
    dashboard.getCell(row, 3).font = { color: { argb: 'FF' + metric.color }, bold: true };
    dashboard.getCell(row, 4).value = metric.note;
    [2, 4].forEach(column => { dashboard.getCell(row, column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
  });
  [26, 20, 34, 47, 3, 15, 15, 15, 15, 15].forEach((width, index) => { dashboard.getColumn(index + 1).width = width; });
  dashboard.getColumn(4).alignment = { wrapText: true, vertical: 'middle' };
  const [barPng, piePng] = await Promise.all([svgPng(barChartSvg(metrics)), svgPng(pieChartSvg(metrics))]);
  const barImage = workbook.addImage({ base64: barPng, extension: 'png' });
  const pieImage = workbook.addImage({ base64: piePng, extension: 'png' });
  dashboard.addImage(barImage, { tl: { col: 5, row: 3 }, ext: { width: 500, height: 271 } });
  dashboard.addImage(pieImage, { tl: { col: 5, row: 18 }, ext: { width: 500, height: 271 } });
  sheets.forEach(sheet => addDataWorksheet(workbook, sheet));
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName(filename) + '.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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
  const accountValue = accounts.reduce((sum, account: any) => sum + numericValue(account.balance), 0);
  const investmentValue = portfolios.reduce((sum, portfolio: any) => sum + numericValue(portfolio.current_value), 0);
  const liabilityValue = liabilities.reduce((sum, liability: any) => sum + numericValue(liability.amount), 0);
  const incomeValue = incomeFlows.reduce((sum, incomeFlow: any) => sum + numericValue(incomeFlow.amount), 0);
  const businessValue = businesses.reduce((sum, business: any) => sum + numericValue(business.mrr), 0);
  const metrics: DashboardMetric[] = [
    { label: 'Accounts balance', formula: accountTotal, value: accountValue, color: '0F766E', note: 'Cash and account balances across FinGent.' },
    { label: 'Investment value', formula: investmentTotal, value: investmentValue, color: '2563EB', note: 'Current value of recorded portfolio holdings.' },
    { label: 'Liabilities due', formula: liabilitiesTotal, value: liabilityValue, color: 'DC2626', note: 'Recorded bills, credits, debts, and installments.' },
    { label: 'Income flows', formula: incomeTotal, value: incomeValue, color: '7C3AED', note: 'Recorded income-flow amounts.' },
    { label: 'Business monthly value', formula: businessTotal, value: businessValue, color: 'D97706', note: 'Monthly value from active business workspaces.' },
    { label: 'Net position', formula: 'B5+B6-B7', value: accountValue + investmentValue - liabilityValue, color: '059669', note: 'Accounts plus investments less liabilities.' }
  ];
  await exportDashboardWorkbook('fingent-complete-export', sheets, metrics);
}
