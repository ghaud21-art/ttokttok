import { supabase } from '../supabaseClient.js';

function buildContext(book, records) {
  return records
    .filter((r) => r.book_id === book.id)
    .map((r) => `[${r.type === 'quote' ? '인용구' : '영감'}] ${r.text}`)
    .join('\n');
}

async function callGenerate(type, book, records) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      type,
      bookTitle: book.title,
      bookAuthor: book.author,
      context: buildContext(book, records),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(
      data.error === 'limit_reached'
        ? '무료로 제공되는 AI 생성 횟수를 모두 사용했어요.'
        : data.error === 'ai_disabled'
          ? '지금은 AI 기능이 잠시 꺼져 있어요.'
          : '생성에 실패했어요. 잠시 후 다시 시도해주세요.'
    );
    err.code = data.error || 'unknown';
    throw err;
  }

  return data;
}

export function generateQuestions(book, records) {
  return callGenerate('questions', book, records);
}

export function generateMissions(book, records) {
  return callGenerate('missions', book, records);
}
