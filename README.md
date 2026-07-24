# 똑똑 — 우리 사이 똑똑 (독서 기록 웹 앱)

책을 읽으며 얻은 인용구·인사이트를 기록하고, Gemini AI가 성찰 질문과 실천 미션을 만들어주는 독서 기록 웹앱입니다. 친구들과 각자 계정으로 로그인해서 쓰고, "함께읽기" 모임을 만들어 질문과 미션을 공유할 수 있어요.

## 기술 스택
- **프론트엔드**: React + Vite
- **DB / 인증 / 이미지 저장**: Supabase (Postgres, Auth, Storage)
- **AI**: Google Gemini API (Vercel Serverless Function을 통해서만 호출 — API 키가 브라우저에 노출되지 않아요)
- **배포**: GitHub → Vercel

---

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에 가입/로그인 → **New Project** 생성 (이름, DB 비밀번호, 리전은 자유롭게 — 한국에서 쓴다면 `Northeast Asia (Seoul)` 추천)
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** → **New query** 로 들어가서, 이 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 파일 내용을 전부 복사해서 붙여넣고 **Run** 을 누르세요.
   - 이 한 번의 실행으로 테이블, 보안 정책(RLS), 회원가입 자동 프로필 생성, 함께읽기 초대코드 함수, 표지 이미지 저장용 `covers` 버킷까지 전부 만들어집니다.
3. 왼쪽 메뉴 **Project Settings → API** 에서 아래 두 값을 복사해두세요.
   - `Project URL` → `.env.local`의 `VITE_SUPABASE_URL`
   - `anon public` key → `.env.local`의 `VITE_SUPABASE_ANON_KEY`
4. (선택) **Authentication → Sign In / Providers → Email** 에서 "Confirm email"을 꺼두면, 친구들이 가입 후 이메일 인증 없이 바로 로그인할 수 있어요. 켜두면 가입 시 확인 메일을 받아야 합니다.

## 2. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/apikey) 에서 API 키를 발급받으세요. (무료 등급 제공)
2. 이 키는 `.env.local`의 `GEMINI_API_KEY`와, 이후 Vercel 배포 시 환경변수에 넣게 됩니다. **절대 `VITE_` 접두사를 붙이지 마세요** — 붙이면 브라우저에 노출됩니다.

## 3. 로컬에서 실행하기

```bash
npm install
```

`.env.example`을 복사해 `.env.local`을 만들고 위에서 발급받은 값을 채워주세요.

```bash
cp .env.example .env.local
```

두 가지 방식으로 로컬 실행할 수 있어요:

- **프론트엔드만 확인**: `npm run dev` → `http://localhost:5173`. 이 경우 AI 질문/미션 생성 버튼은 서버 함수(`/api/generate`)가 없어서 항상 미리 준비된 예시 질문·미션으로 대체됩니다.
- **AI 기능까지 전부 확인**: [Vercel CLI](https://vercel.com/docs/cli)로 실행하면 `api/generate.js`까지 함께 로컬에서 동작합니다.
  ```bash
  npx vercel dev
  ```
  처음 실행 시 Vercel 로그인 및 프로젝트 연결을 안내하는 프롬프트가 뜹니다.

## 4. GitHub에 올리기

```bash
git init
git add .
git commit -m "Initial commit: 똑똑 독서 기록 웹앱"
```

GitHub에서 새 저장소를 만든 뒤:

```bash
git remote add origin https://github.com/<your-id>/<repo-name>.git
git branch -M main
git push -u origin main
```

`.env.local`은 `.gitignore`에 포함되어 있어 절대 커밋되지 않아요 — API 키가 안전하게 보관됩니다.

## 5. Vercel에 배포하기

1. [vercel.com](https://vercel.com) 로그인 → **Add New → Project** → 방금 push한 GitHub 저장소 선택 → Import
2. **Environment Variables** 에 아래 3개를 추가 (Production / Preview / Development 모두 체크):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. **Deploy** 클릭. 프레임워크는 Vite로 자동 인식되고, `api/generate.js`는 자동으로 서버리스 함수로 배포됩니다.
4. 배포 완료 후 나오는 `https://<프로젝트>.vercel.app` 주소를 친구들에게 공유하면 각자 회원가입해서 쓸 수 있어요.

## 6. 친구들과 함께 쓰는 법

- 각자 이메일 + 비밀번호로 회원가입 → 개인 서재(책장)는 본인만 볼 수 있어요.
- 상단 **함께읽기** 탭에서 모임을 만들면 6자리 초대코드가 생성됩니다.
- 초대코드를 공유하면, 다른 사람은 함께읽기 탭의 **초대코드로 참여** 버튼으로 합류해 같은 모임의 질문·미션을 함께 보고 답할 수 있어요.

---

## 폴더 구조

```
api/generate.js          Gemini API 서버리스 프록시 (질문/미션 생성)
supabase/schema.sql       테이블 + RLS 정책 + Storage 버킷 (SQL Editor에 붙여넣기용)
public/                   앱 아이콘, 월별 기록 배지 이미지
src/
  pages/                  화면 단위 컴포넌트 (책장 / 책 상세 / 함께읽기 / 태그 / 실천 기록)
  components/             재사용 UI 조각
  hooks/                  useAuth, useReadingData(개인 데이터), useGroups(함께읽기)
  lib/                    포맷팅, 배지 등급 계산, Storage 업로드, Gemini 클라이언트 래퍼
  styles.css              디자인 토큰 & 컴포넌트 스타일
```

## 문제 해결

- **로그인은 되는데 책장이 계속 비어있어요** → Supabase SQL Editor에서 `schema.sql`을 실행했는지, 실행 중 에러가 없었는지 확인하세요.
- **표지 이미지 업로드가 실패해요** → Supabase 대시보드 **Storage**에 `covers` 버킷이 생성되어 있는지 확인하세요 (schema.sql에 포함되어 있어 보통 자동 생성됩니다).
- **AI 질문/미션이 항상 똑같은 예시 문장만 나와요** → `GEMINI_API_KEY`가 `.env.local`(로컬) 또는 Vercel 환경변수(배포)에 제대로 들어가 있는지, 로컬이라면 `vercel dev`로 실행했는지 확인하세요. 키가 없거나 호출이 실패하면 앱이 자동으로 예시 질문/미션으로 대체합니다(빈 화면 방지용 폴백).
- **회원가입 후 로그인이 안 돼요** → Supabase Authentication 설정에서 이메일 확인(Confirm email)이 켜져 있으면 메일함에서 인증 링크를 눌러야 합니다.
