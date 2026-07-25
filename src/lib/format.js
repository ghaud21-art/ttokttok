export const STATUS_LABELS = { reading: '읽는 중', done: '완독', want: '읽고 싶음' };
export const STATUS_TAG_CLASS = {
  reading: 'tag tag-accent',
  done: 'tag tag-neutral',
  want: 'tag tag-accent-2',
};

export function pctOf(book) {
  if (book.total_pages > 0) {
    return Math.min(100, Math.round((book.current_page / book.total_pages) * 100));
  }
  return book.status === 'done' ? 100 : 0;
}

export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizeForSearch(s) {
  return (s || '').toLowerCase().replace(/\s+/g, '');
}

export function matchesSearch(text, query) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(text).includes(q);
}

export function parseTags(text) {
  return Array.from(
    new Set(
      (text || '')
        .split(/[\s,#]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}
