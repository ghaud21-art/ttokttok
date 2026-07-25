// 책 등록 자동완성용 카카오 도서검색 프록시. KAKAO_REST_API_KEY는 여기(서버)에서만 사용된다.
// 인증이 필요 없는 공개 엔드포인트 — 검색 결과 자체는 민감하지 않고, 키만 숨기면 된다.
function stripTags(s) {
  return (s || '').replace(/<[^>]*>/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const q = (req.query.q || '').toString().trim();
  if (!q) {
    res.status(400).json({ error: 'q is required' });
    return;
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'KAKAO_REST_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  try {
    const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(q)}&size=10`;
    const kakaoRes = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
    if (!kakaoRes.ok) {
      const errText = await kakaoRes.text().catch(() => '');
      res.status(502).json({ error: `카카오 도서검색 API 오류 (${kakaoRes.status}): ${errText}` });
      return;
    }
    const data = await kakaoRes.json();
    const books = (data.documents || []).map((d) => ({
      title: stripTags(d.title),
      author: (d.authors || []).map(stripTags).join(', '),
      publisher: stripTags(d.publisher),
      thumbnail: d.thumbnail || '',
    }));
    res.status(200).json({ books });
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown_error' });
  }
}
