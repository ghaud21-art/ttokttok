export async function searchBooks(query) {
  const res = await fetch(`/api/book-search?q=${encodeURIComponent(query)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `검색에 실패했어요 (${res.status})`);
  return data.books || [];
}
