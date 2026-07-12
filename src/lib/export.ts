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

export function exportPdf(title: string, rows: ExportRow[], subtitle = '') {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const width = 190; let y = 18;
  pdf.setFontSize(18); pdf.text(title, 10, y); y += 8;
  if (subtitle) { pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(subtitle, 10, y); y += 7; }
  pdf.setDrawColor(210); pdf.line(10, y, 200, y); y += 7;
  if (!rows.length) { pdf.setFontSize(11); pdf.setTextColor(80); pdf.text('No records to export.', 10, y); pdf.save(`${safeName(title)}.pdf`); return; }
  rows.forEach((row, index) => {
    const text = Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => `${key}: ${clean(value)}`).join('  |  ');
    const lines = pdf.splitTextToSize(text, width);
    if (y + lines.length * 5 > 280) { pdf.addPage(); y = 18; }
    pdf.setFontSize(10); pdf.setTextColor(30); pdf.text(lines, 10, y); y += lines.length * 5 + 3;
    if (index < rows.length - 1) { pdf.setDrawColor(235); pdf.line(10, y - 1, 200, y - 1); }
  });
  pdf.save(`${safeName(title)}.pdf`);
}
