// Vercel Serverless Function — Gemini API 프록시.
// GEMINI_API_KEY는 여기(서버)에서만 사용되고 클라이언트로 절대 전달되지 않는다.
import { getAuthedUser, getSupabaseAdmin } from './_lib/adminAuth.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FREE_USES = 3;

function questionsPrompt(bookTitle, bookAuthor, context) {
  return `당신은 독서 성찰을 돕는 코치입니다. 아래는 "${bookTitle}"(${bookAuthor || '저자 미상'}) 책을 읽으며 독자가 기록한 인용구와 인사이트입니다.

${context || '(아직 기록된 인용구/인사이트가 없습니다. 책 제목을 바탕으로 질문을 만들어주세요.)'}

이 내용을 분석해 책의 주요 논점을 도출하고, 다음 세 스타일을 자유롭게 섞어 한국어 질문 5개를 만들어주세요. 특정 장르에 억지로 맞추지 마세요.
- 철학적 질문: 책의 논점을 깊이 성찰하게 하는 질문
- 실용적 질문: 책의 메시지를 자신의 삶에 적용해보게 하는 질문
- 서사적 질문: 책 내용과 감정적·주제적으로 연결해보게 하는 질문

각 질문은 한 문장, 40자 내외로 간결하게 작성하세요. 반드시 아래 JSON 형식으로만, 다른 말 없이 응답하세요:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}`;
}

function missionsPrompt(bookTitle, bookAuthor, context) {
  return `당신은 독서 후 실천을 설계하는 코치입니다. 아래는 "${bookTitle}"(${bookAuthor || '저자 미상'}) 책을 읽으며 독자가 남긴 인용구와 인사이트입니다.

${context || '(아직 기록된 인용구/인사이트가 없습니다. 책 제목을 바탕으로 미션을 만들어주세요.)'}

이 내용에서 책의 주제를 분석하고, 그 주제와 긴밀히 연관되면서 직접 체험하거나 도전하는 형태의 실천 행동을 한국어로 5개 제안해주세요.
- 단순히 텍스트를 변형하지 말고, 책의 의도를 충분히 반영한 의미 있는 행동이어야 합니다.
- 단순히 "적어보기"나 "찾아보기" 대신, 직접 체험하거나 도전하는 행동으로 구성하세요.
- 즉시 실행 가능하되 삶에 지속적인 영향을 줄 수 있는 행동을 제안하세요.
- 매일/매주 반복해야 하는 습관성 목표는 제안하지 마세요.
- 흥미롭고 창의적인 제안으로, 행동 자체가 동기를 부여할 수 있도록 하세요.
- 각 액션은 50자 이내로 작성하세요.

반드시 아래 JSON 형식으로만, 다른 말 없이 응답하세요:
{"missions": ["행동1", "행동2", "행동3", "행동4", "행동5"]}`;
}

const FALLBACK_QUESTIONS = (bookTitle) => [
  `${bookTitle}에서 가장 마음에 남은 문장은 지금 나의 삶과 어떻게 연결되어 있을까?`,
  '이 책이 던진 질문 중 하나를 골라, 나라면 어떤 선택을 했을지 생각해본다면?',
  '이 책을 읽기 전의 나와 지금의 나, 무엇이 달라졌을까?',
  '이 책의 메시지를 한 사람에게 전한다면, 누구에게 왜 전하고 싶을까?',
  '이 책에서 아직 풀리지 않은 궁금증이 있다면 무엇일까?',
];

const FALLBACK_MISSIONS = [
  '이 책의 주제와 맞닿은 낯선 장소를 하루 시간 내어 직접 가보기',
  '책 속 인물이라면 하지 않았을 선택 하나를 이번 주에 시도해보기',
  '가장 인상 깊은 문장을 손글씨로 옮겨 적어 눈에 띄는 곳에 붙여두기',
  '이 책에서 얻은 생각을 지인 한 명과 30분 대화해보기',
  '평소 미뤄왔던 어려운 대화나 결정을 이 책의 메시지에 기대어 실행해보기',
];

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned.slice(cleaned.indexOf('{')));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type, bookTitle, bookAuthor, context } = req.body || {};
  if (type !== 'questions' && type !== 'missions') {
    res.status(400).json({ error: 'type must be "questions" or "missions"' });
    return;
  }
  if (!bookTitle) {
    res.status(400).json({ error: 'bookTitle is required' });
    return;
  }

  const user = await getAuthedUser(req);
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabaseAdmin.from('ddok_app_settings').select('ai_enabled').eq('id', true).maybeSingle(),
    supabaseAdmin.from('ddok_profiles').select('is_admin, ai_uses_count').eq('id', user.id).maybeSingle(),
  ]);

  const isAdmin = !!profile?.is_admin;
  const aiEnabled = settings ? settings.ai_enabled !== false : true;
  const usesCount = profile?.ai_uses_count || 0;

  if (!isAdmin && !aiEnabled) {
    res.status(403).json({ error: 'ai_disabled' });
    return;
  }
  if (!isAdmin && usesCount >= FREE_USES) {
    res.status(403).json({ error: 'limit_reached', usesCount, freeUses: FREE_USES });
    return;
  }

  const prompt = type === 'questions'
    ? questionsPrompt(bookTitle, bookAuthor, context)
    : missionsPrompt(bookTitle, bookAuthor, context);

  let result;
  try {
    const parsed = await callGemini(prompt);
    if (type === 'questions') {
      const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : null;
      if (!questions || questions.length === 0) throw new Error('empty questions');
      result = { questions };
    } else {
      const missions = Array.isArray(parsed.missions)
        ? parsed.missions.slice(0, 5).map((m) => String(m).slice(0, 50))
        : null;
      if (!missions || missions.length === 0) throw new Error('empty missions');
      result = { missions };
    }
  } catch (err) {
    console.error('[api/generate] falling back:', err.message);
    result = type === 'questions'
      ? { questions: FALLBACK_QUESTIONS(bookTitle) }
      : { missions: FALLBACK_MISSIONS };
  }

  if (!isAdmin) {
    await supabaseAdmin.from('ddok_profiles').update({ ai_uses_count: usesCount + 1 }).eq('id', user.id);
  }

  res.status(200).json({ ...result, isAdmin, usesCount: isAdmin ? usesCount : usesCount + 1, freeUses: FREE_USES });
}
