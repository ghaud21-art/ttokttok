// 북적북적 CSV 양식(인덱스,제목,저자,출판사,독서상태,생성일,시작일,읽은 날짜,중단일)과의
// 불러오기/내보내기를 위한 순수 함수 모음. Supabase나 React에 의존하지 않는다.
import { STATUS_LABELS } from './format.js';

const CSV_HEADER = ['인덱스', '제목', '저자', '출판사', '독서상태', '생성일', '시작일', '읽은 날짜', '중단일'];

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const len = text.length;
  let i = 0;
  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { inQuotes = true; i += 1; continue; }
    if (char === ',') { row.push(field); field = ''; i += 1; continue; }
    if (char === '\r') { i += 1; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; continue; }
    field += char; i += 1;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function parseCSVObjects(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

export function mapReadingStatus(raw) {
  const s = (raw || '').trim();
  if (s.includes('읽고 싶')) return { status: 'want', uncertain: false };
  if (s.includes('읽는') || s.includes('읽고 있')) return { status: 'reading', uncertain: false };
  if (s.includes('읽은') || s.includes('완독')) return { status: 'done', uncertain: false };
  return { status: 'reading', uncertain: true };
}

function dateOrNull(s) {
  const t = (s || '').trim();
  return t || null;
}

export function csvToBookRows(text) {
  const objs = parseCSVObjects(text);
  let uncertainCount = 0;
  const rows = [];
  objs.forEach((o) => {
    const title = (o['제목'] || '').trim();
    if (!title) return;
    const { status, uncertain } = mapReadingStatus(o['독서상태']);
    if (uncertain) uncertainCount += 1;
    rows.push({
      title,
      author: (o['저자'] || '').trim(),
      genre: '미분류',
      status,
      started_at: dateOrNull(o['시작일']),
      finished_at: dateOrNull(o['읽은 날짜']),
      created_at: dateOrNull(o['생성일']),
    });
  });
  return { rows, uncertainCount };
}

function csvField(value) {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function dateOnly(ts) {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

export function booksToCSV(books) {
  const lines = [CSV_HEADER.map(csvField).join(',')];
  books.forEach((b, idx) => {
    lines.push([
      String(idx + 1),
      b.title || '',
      b.author || '',
      '',
      STATUS_LABELS[b.status] || '',
      dateOnly(b.created_at),
      dateOnly(b.started_at),
      dateOnly(b.finished_at),
      '',
    ].map(csvField).join(','));
  });
  return lines.join('\r\n');
}

export function templateCSV() {
  const example = ['1', '예시: 아무도 오지 않는 곳에서', '천선란', '', '읽은 책', '2026-01-04', '2026-01-04', '2026-01-10', ''];
  return [CSV_HEADER, example].map((r) => r.map(csvField).join(',')).join('\r\n');
}

export function downloadCSV(filename, text) {
  const BOM = String.fromCharCode(0xFEFF);
  const blob = new Blob([BOM + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
