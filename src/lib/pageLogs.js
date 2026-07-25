// page_log 기능이 생기기 전에 이미 완독한 책은 로그가 없으므로, 완독일이 있는데
// 해당 책의 로그가 하나도 없다면 전체 페이지를 완독일 달에 한 번에 반영해준다.
// (완독일 값 자체가 부정확하면 — 예: 예전에 다 읽은 책을 최근에야 등록한 경우 —
// 그 달에 페이지가 몰려 보일 수 있다. 책 상세에서 완독일을 고치면 바로 반영된다.)
export function computeEffectivePageLogs(books, pageLogs) {
  const loggedBookIds = new Set((pageLogs || []).map((l) => l.book_id));
  const backfill = (books || [])
    .filter((b) => b.status === 'done' && b.finished_at && b.total_pages > 0 && !loggedBookIds.has(b.id))
    .map((b) => ({ book_id: b.id, pages_delta: b.total_pages, created_at: b.finished_at, backfilled: true }));
  return [...(pageLogs || []), ...backfill];
}
