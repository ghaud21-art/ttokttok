function buildContext(book, records) {
  return records
    .filter((r) => r.book_id === book.id)
    .map((r) => `[${r.type === 'quote' ? '인용구' : '인사이트'}] ${r.text}`)
    .join('\n');
}

async function callGenerate(type, book, records) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      bookTitle: book.title,
      bookAuthor: book.author,
      context: buildContext(book, records),
    }),
  });
  if (!res.ok) {
    throw new Error('생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }
  return res.json();
}

export function generateQuestions(book, records) {
  return callGenerate('questions', book, records);
}

export function generateMissions(book, records) {
  return callGenerate('missions', book, records);
}
