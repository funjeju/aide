# CLAUDE.md

> 이 파일은 Claude Code가 본 프로젝트에서 작업할 때 따라야 할 **프로젝트 전용 규칙**을 정의합니다.
> Claude Code는 매 세션 시작 시 이 파일을 읽고, 모든 코드 작성/수정/리뷰에 이 규칙을 적용합니다.

**버전:** v0.2
**최종 수정:** 2026-04-27

---

## 🚨 중요: 작업 시작 전 필수 확인

**이 프로젝트의 모든 작업은 `docs/` 폴더의 문서를 기반으로 한다.**
**코드 작성 전 관련 문서를 반드시 먼저 읽어야 한다.**

### 작업 유형별 필수 참조 문서

| 작업 유형 | 반드시 읽을 문서 |
|---|---|
| 프로젝트 개요 / Phase 확인 | `docs/01_MVP_정의서_v0.4.md` |
| 기능 명세 확인 (FR-XXX) | `docs/02_PRD_v0.6.md` |
| Firestore 컬렉션/필드 추가/수정 | `docs/03_Firestore_스키마_v0.1.md` |
| 폴더/파일 생성, 코딩 스타일 | `docs/04_폴더구조_코딩컨벤션_v0.1.md` |
| AI 호출 (Gemini, Whisper) | `docs/05_AI_파이프라인_v0.1.md` |
| Cloud Function 작성 | `docs/06_API_Spec_v0.1.md` + `docs/05_AI_파이프라인_v0.1.md` |
| 인증/권한/Firestore Rules | `docs/07_인증_보안_v0.1.md` |
| 새 화면 추가 / 화면 흐름 | `docs/08_User_Flow_v0.1.md` |
| UI 디자인 / 컴포넌트 | `docs/09_Wireframe_v0.1.md` |
| 환경변수 / Secret | `docs/10_환경변수_v0.1.md` |
| 결제 / 구독 | `docs/11_결제_구독_v0.1.md` |
| 다국어 (i18n) | `docs/12_다국어_v0.1.md` |
| 배포 / CI/CD | `docs/13_배포_운영_v0.1.md` |
| 어드민 기능 | `docs/14_어드민_운영_v0.1.md` |

### 절대 규칙

1. **문서에 정의되지 않은 컬렉션 / 필드 / API / 화면을 임의로 만들지 않는다.**
   문서에 없으면 사용자에게 먼저 확인하고, 결정되면 **해당 문서를 먼저 업데이트한 후 코드를 작성**한다.

2. **PRD에 정의된 기능 번호(FR-XXX)를 항상 추적한다.**
   - 커밋 메시지: `feat(mobile): FR-002 음성 입력 화면 STT 통합`
   - PR 제목: `[FR-002] 음성 입력 화면`
   - 코드 주석: `// FR-002: 음성 입력 (PRD 02 Section 4.2)`

3. **새로운 결정 사항이 발생하면 코드보다 문서를 먼저 수정한다.**
   - 결정 사항 추가 → 해당 문서의 "결정 필요 사항" 섹션 업데이트
   - 결정 사항이 여러 문서에 걸치면 모두 동기화

4. **작업 시작 시 항상 현재 Phase를 확인한다.**
   - Phase 1 Alpha → 28개 기능 중 Phase 1로 표시된 것만 구현
   - Phase에 없는 기능은 "Phase X 작업 항목"으로 별도 기록 후 보류

5. **각 코드 파일 상단에 참조 문서 주석을 단다.**
   ```typescript
   /**
    * @see docs/06_API_Spec_v0.1.md - Section 2.1 classifyInput
    * @see docs/05_AI_파이프라인_v0.1.md - Section 4.3.1
    * @see docs/02_PRD_v0.6.md - FR-004
    */
   export const classifyInput = onCall(...)
   ```

### 문서 우선순위

문서 간 충돌 시 우선순위:
1. **PRD (02)** — 기능 정의의 최종 권위
2. **MVP 정의서 (01)** — Phase 분류, Tier 정의
3. **나머지 기술 문서 (03~14)** — PRD 기반 구체화

충돌 발견 시 사용자에게 보고하고 PRD부터 정정한다.

---

## 0. 프로젝트 개요

### 0.1 프로젝트 정체
- **이름**: **Aide** (에이드) — Always by your s**IDE**
- **종류**: AI 기반 개인 일정관리 SaaS
- **한 줄 정의**: 사용자는 생각 없이 기록만, AI가 정리하고 실행까지 연결해주는 개인 비서 앱

### 0.2 두 개의 클라이언트
이 프로젝트는 **두 개의 독립된 클라이언트 + 공유 백엔드**로 구성됩니다.

```
1. 모바일 앱 (메인)        → React Native + Expo
2. 어드민 콘솔 (운영)      → Next.js (Web)
3. 공유 백엔드             → Firebase (Auth, Firestore, Functions, Storage, FCM)
```

### 0.3 개발 일정
- **v1.0 풀스펙, 4 Phase, 12~15개월**
- Phase 1 (Alpha) → Phase 2 (Beta 1) → Phase 3 (Beta 2) → Phase 4 (정식 출시)

### 0.4 사용자 기능 28개 + 어드민 기능 8개
> 상세는 `02_PRD_v0.6.md` 참고

---

## 1. 기술 스택 (확정 — 변경 금지)

### 1.1 모바일 앱
- **프레임워크**: React Native + Expo (최신 SDK)
- **언어**: **TypeScript** (JavaScript 사용 금지)
- **상태 관리**: Zustand
- **UI 스타일링**: NativeWind (Tailwind CSS for RN)
- **애니메이션**: React Native Reanimated 3
- **네비게이션**: Expo Router (파일 기반)
- **국제화**: i18next + react-i18next
- **다크모드**: NativeWind 다크모드

### 1.2 어드민 콘솔
- **프레임워크**: Next.js 14 (App Router)
- **언어**: **TypeScript**
- **UI**: shadcn/ui + Tailwind CSS
- **차트**: Recharts
- **데이터 페칭**: TanStack Query (React Query)
- **인증**: Firebase Auth + Custom Claims
- **배포**: Vercel
- **도메인**: `admin.{앱이름}.com`

### 1.3 백엔드 (Firebase)
- **인증**: Firebase Auth (Google, Apple, 어드민 전용)
- **데이터베이스**: Firestore (실시간 + 오프라인)
- **서버리스**: Cloud Functions (TypeScript)
- **파일 저장**: Cloud Storage
- **푸시**: FCM
- **분석**: Firebase Analytics + Crashlytics

### 1.4 AI / 외부 서비스
- **LLM**: Gemini 2.5 Flash-Lite (Tier 1, 분류) + Gemini 2.5 Flash (Tier 2, 생성)
- **STT**: 디바이스 네이티브 + Whisper API (백업)
- **캘린더**: Google Calendar API + Apple Calendar (EventKit)
- **위치**: Expo Location (Geofencing)
- **결제**: RevenueCat + Apple IAP + Google Play Billing + Stripe (웹)

### 1.5 절대 사용 금지
- ❌ JavaScript (반드시 TypeScript)
- ❌ Redux (Zustand 사용)
- ❌ styled-components (NativeWind 사용)
- ❌ React Navigation (Expo Router 사용)
- ❌ Realm DB / SQLite (Firestore 오프라인 모드 사용)
- ❌ axios (fetch + TanStack Query 사용)
- ❌ Moment.js (date-fns 사용)
- ❌ class component (function component만)

---

## 2. 핵심 설계 원칙

### 2.1 데이터 생명주기
모든 사용자 입력은 다음 6단계를 거칩니다.
```
[Raw 원문 보존] → [Parsed AI분석] → [Draft 임시] → [Confirmed 확정] → [Execution 실행] → [Log 학습]
```
각 단계는 별도 Firestore 컬렉션으로 분리. **각 단계 데이터는 절대 덮어쓰지 않고 새로 생성**.

### 2.2 트랙 (Track) 분리
모든 데이터는 두 트랙 중 하나로 분류:
- `LIFE` (일상) — 그린 (#10B981)
- `WORK` (비즈니스) — 블루 (#3B82F6)

### 2.3 엔티티 3종
- `TASK` — 할 일
- `PERSON` — 인물
- `EVENT` — 이벤트

### 2.4 우선순위 5단계
- `URGENT` (긴급) → `HIGH` (중요) → `NORMAL` (보통) → `LOW` (낮음) → `SOMEDAY` (언젠가)

### 2.5 시스템 한도 vs 사용자 한도 (필수 이해)
이 시스템은 **두 단계 한도 체계**입니다.

```typescript
// 잘못된 예 (사용자 한도 무시)
if (textLength > 10000) throw new Error('초과');

// 올바른 예
const userLimit = await getUserLimit(uid, 'textMaxLength');
if (textLength > userLimit) throw new Error(`Tier 한도 초과 (${userLimit}자)`);
```

**모든 사용자 입력 작업은 Cloud Functions에서 한도 체크 필수**.

### 2.6 시간 처리
- 사용자 입력: 디바이스 로컬 시간
- DB 저장: **반드시 UTC** (Firestore Timestamp)
- 표시: 로컬 시간 + 절대/상대 혼용 (date-fns 사용)
- 시간대 변경 (여행) 처리: 디바이스 시간대 자동 따라감

### 2.7 AI 호출 비용 최소화
1. **시스템 프롬프트 캐싱 항상 활성화** (90% 절감)
2. **Tier 1 vs Tier 2 라우팅 엄수** — 단순 작업은 절대 Flash 호출 금지
3. 사용자 컨텍스트 1일 1회 요약 → 챗봇 호출 시 재사용
4. 모든 AI 호출은 사용자별 비용 모니터링

---

## 3. 폴더 구조 (개략)

> 상세는 `09_폴더구조_코딩컨벤션.md` 참고 (Wave 1에서 작성 예정)

```
project-root/
├── apps/
│   ├── mobile/           # React Native + Expo 앱
│   └── admin/            # Next.js 어드민 콘솔
├── packages/
│   ├── shared/           # 공통 타입, 유틸 (앱 + 어드민)
│   ├── firebase/         # Firebase 클라이언트 헬퍼
│   └── ui/               # 공유 UI 컴포넌트 (제한적)
├── functions/            # Firebase Cloud Functions
├── firestore.rules       # Firestore Security Rules
├── docs/                 # 모든 .md 문서
│   ├── 01_MVP_정의서.md
│   ├── 02_PRD.md
│   ├── 03_Firestore_스키마.md
│   └── ...
├── CLAUDE.md             # ← 이 파일
└── package.json          # Monorepo 루트 (pnpm workspaces 추천)
```

---

## 4. 코딩 컨벤션

### 4.1 일반 규칙
- **TypeScript strict 모드**: 모든 패키지에서 활성화
- **함수형 프로그래밍 우선**: class보다 function, 불변성 유지
- **명시적 타입**: 함수 시그니처에 반환 타입 명시 (인퍼런스 의존 금지)
- **early return**: 중첩 if 대신 early return으로 평탄화
- **순수 함수 우선**: 부수 효과 최소화

### 4.2 명명 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일 (컴포넌트) | PascalCase | `TaskCard.tsx` |
| 파일 (기타) | kebab-case | `format-date.ts` |
| 함수/변수 | camelCase | `getUserLimit` |
| 상수 | UPPER_SNAKE | `MAX_TEXT_LENGTH` |
| 타입/인터페이스 | PascalCase | `interface UserLimits` |
| 컴포넌트 | PascalCase | `<TaskCard />` |
| Firestore 컬렉션 | camelCase | `dailyReports` |
| Firestore 필드 | camelCase | `createdAt` |

### 4.3 한국어 처리
- **UI 텍스트는 절대 하드코딩 금지** — i18n 파일 사용
- 사용자 입력은 그대로 보존 (정규화 X)
- 검색은 `contains` 기반 (Firestore 한국어 정규식 제한)

### 4.4 에러 처리
```typescript
// ✅ 올바른 패턴
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };

async function getUserLimit(uid: string): Promise<Result<UserLimits>> {
  try {
    const data = await fetchUserLimit(uid);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// ❌ 잘못된 패턴 (try-catch 없는 throw)
async function getUserLimit(uid: string): Promise<UserLimits> {
  return await fetchUserLimit(uid); // 호출자가 처리해야 함
}
```

### 4.5 주석
- **왜(Why)**를 설명 — 무엇(What)은 코드로 표현
- TODO/FIXME에는 이슈 번호 포함 (`// TODO(#123): ...`)
- 한국어 주석 OK (이 프로젝트는 한국어 주 언어)

### 4.6 import 순서
```typescript
// 1. React / React Native (외부)
import { useState } from 'react';
import { View, Text } from 'react-native';

// 2. 외부 라이브러리
import { create } from 'zustand';
import { format } from 'date-fns';

// 3. 내부 모듈 (절대 경로)
import { db } from '@/firebase/config';
import { useTaskStore } from '@/stores/task';

// 4. 상대 경로
import { formatDate } from './utils';

// 5. 타입 (별도 그룹)
import type { Task } from '@/types';
```

---

## 5. Firebase / Firestore 작업 규칙

### 5.1 Firestore 컬렉션 접근
```typescript
// ✅ 올바른 패턴 — 타입 안전 + 헬퍼 사용
import { db } from '@/firebase/config';
import { collection, doc, getDoc } from 'firebase/firestore';
import type { Task } from '@/types';

const taskRef = doc(db, 'tasks', taskId);
const snapshot = await getDoc(taskRef);
const task = snapshot.data() as Task;

// ❌ 잘못된 패턴 — any 사용
const data = (await getDoc(ref)).data() as any;
```

### 5.2 모든 사용자 데이터는 `userId` 필드 필수
- 문서가 어느 사용자 소유인지 명확
- Firestore Rules에서 `request.auth.uid == resource.data.userId` 체크

### 5.3 Timestamp 처리
- 저장: `serverTimestamp()`
- 클라이언트 즉시 표시: `Timestamp.now()` (잠시 후 서버 값으로 갱신됨)
- 절대 `new Date()` 직접 저장 금지 (시간대 이슈)

### 5.4 인덱스
- 복합 쿼리 → `firestore.indexes.json`에 명시
- 자동 생성 인덱스만 의존하지 말 것

### 5.5 Cloud Functions
- TypeScript only
- 함수 1개당 1개 책임 (Single Responsibility)
- 실행 시간 < 30초 권장 (장시간 작업은 큐 사용)
- 모든 함수에 에러 핸들링 + 로깅
- 사용자 입력은 반드시 검증

```typescript
// ✅ 올바른 Cloud Function 패턴
export const classifyInput = onCall(
  { region: 'asia-northeast3', cors: true },
  async (request) => {
    // 1. 인증 체크
    if (!request.auth) throw new HttpsError('unauthenticated', '로그인 필요');

    // 2. 한도 체크
    const limitCheck = await checkUserLimit(request.auth.uid, 'voice');
    if (!limitCheck.allowed) {
      throw new HttpsError('resource-exhausted', '한도 초과', limitCheck);
    }

    // 3. 입력 검증
    const { text } = request.data;
    if (typeof text !== 'string' || text.length > 10000) {
      throw new HttpsError('invalid-argument', '텍스트 형식 오류');
    }

    // 4. 본 작업
    try {
      const result = await callGeminiFlashLite(text);
      return { ok: true, data: result };
    } catch (error) {
      logger.error('classifyInput failed', { uid: request.auth.uid, error });
      throw new HttpsError('internal', '처리 실패');
    }
  }
);
```

---

## 6. AI 호출 규칙

### 6.1 모델 라우팅 엄수

| 작업 | 모델 | 이유 |
|---|---|---|
| 일상/비즈니스 분류 | Flash-Lite | 단순 분류 |
| 키워드/엔티티 추출 | Flash-Lite | 단순 추출 |
| 우선순위 자동 분류 | Flash-Lite | 단순 분류 |
| 감정 태그 | Flash-Lite | 단순 분류 |
| Draft 생성 | Flash | 구조화 필요 |
| 챗봇 응답 | Flash | 자연어 생성 |
| 하루 리포트 | Flash | 깊이 있는 분석 |
| 만다라트 자동 제안 | Flash | 창의성 필요 |
| 다국어 응답 | Flash | 자연스러움 |

### 6.2 모든 AI 호출은 추상화 레이어 통과
```typescript
// ✅ 올바른 패턴
import { callAI } from '@/ai/client';

const result = await callAI({
  tier: 'flash-lite',  // 또는 'flash'
  task: 'classify',
  systemPrompt: PROMPTS.classify,
  userInput: text,
  cacheKey: `classify-${userId}`,
});

// ❌ 잘못된 패턴 — 직접 SDK 호출
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(API_KEY);
const result = await genAI.getGenerativeModel(...);
```

추상화 이유: **나중에 Claude Sonnet 등 다른 모델로 일부 작업 옮길 가능성** (특히 챗봇 톤 부족 시).

### 6.3 시스템 프롬프트 관리
- 모든 프롬프트는 `functions/prompts/` 디렉토리
- 프롬프트는 어드민 콘솔에서 동적 변경 가능 (DB 저장)
- 버전 관리 + A/B 테스트 지원
- 사용자 입력은 시스템 프롬프트와 명확히 분리 (prompt injection 방지)

### 6.4 출력 검증
- AI 출력 JSON은 **Zod 스키마로 검증**
- 검증 실패 시 재시도 1회 → 그래도 실패하면 graceful fallback

```typescript
import { z } from 'zod';

const ClassifyOutputSchema = z.object({
  track: z.enum(['LIFE', 'WORK']),
  trackConfidence: z.number().min(0).max(1),
  entities: z.array(z.object({
    type: z.enum(['TASK', 'PERSON', 'EVENT']),
    raw: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  keywords: z.array(z.string()),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW', 'SOMEDAY']),
  language: z.enum(['ko', 'en', 'ja']),
});

const parsed = ClassifyOutputSchema.safeParse(aiResponse);
if (!parsed.success) {
  // 재시도 또는 fallback
}
```

---

## 7. 보안 규칙

### 7.1 절대 클라이언트에 노출 금지
- ❌ Firebase Admin SDK 키
- ❌ Gemini API 키 (모든 LLM 호출은 Cloud Functions 통해)
- ❌ Whisper API 키
- ❌ Google Calendar OAuth secret
- ❌ Stripe Secret Key
- ❌ RevenueCat Secret Key

### 7.2 Firestore Rules 원칙
- 기본 거부 (default deny)
- 사용자는 자기 데이터만 읽기/쓰기
- 어드민은 Custom Claim으로 별도 권한
- 모든 쓰기는 검증 (필드 타입, 값 범위)

### 7.3 사용자 입력 검증
- Cloud Functions 진입점에서 모든 입력 검증 (Zod)
- SQL Injection 걱정 없음 (Firestore NoSQL) but XSS 방지 위해 특수 문자 sanitize

### 7.4 어드민 보안
- Custom Claim `role: 'admin'` 부여된 계정만 어드민 콘솔 접근
- 2FA 필수
- 모든 어드민 액션 감사 로그 (`admin_logs` 컬렉션)
- IP 화이트리스트 (선택)

---

## 8. 작업 요청 시 Claude Code 행동 규칙

### 8.1 코드 작성 전 체크리스트
새 기능/수정 작업 시작 전 항상 확인:

1. ✅ 관련 PRD 섹션 (`02_PRD_v0.6.md`) 읽기
2. ✅ Firestore 스키마 (`03_Firestore_스키마.md`) 확인
3. ✅ 기존 코드 패턴 확인 (유사 기능)
4. ✅ 사용자 한도 체크 필요 여부 확인
5. ✅ AI 호출 시 Tier 결정 (Flash-Lite vs Flash)
6. ✅ 다국어 지원 필요 여부 (i18n)
7. ✅ 다크모드 지원 필요 여부

### 8.2 의존성 추가 시
- **반드시 사용자 확인 후 추가**
- 사유 명시 (왜 필요한지)
- 대안 검토 (이미 있는 라이브러리로 가능한지)
- 라이선스 확인 (MIT/Apache-2.0/BSD 외에는 신중)

### 8.3 새 Firestore 컬렉션 생성 시
- 반드시 `03_Firestore_스키마.md` 먼저 업데이트
- Firestore Rules 동시 작성
- 인덱스 정의 (`firestore.indexes.json`)

### 8.4 새 Cloud Function 작성 시
- 반드시 `05_API_Spec.md` 먼저 업데이트
- 인증/한도 체크 + 입력 검증 패턴 사용
- 에러 처리 + 로깅
- 단위 테스트 (해당 시)

### 8.5 PR 단위
- 1 PR = 1 기능 또는 1 수정
- PR 제목 형식: `[FR-XXX] 기능명` 또는 `[fix] 버그명`
- 큰 기능은 여러 PR로 분할

### 8.6 모르는 것은 묻기 (가짜 코드 금지)
- 결정사항이 PRD에 없으면 → 물어보기
- 추측으로 구현하지 말 것
- 다음 같은 경우 즉시 묻기:
  - 비즈니스 로직 모호한 경우
  - UI/UX 명세가 없는 경우
  - 두 개 이상의 합리적 해석이 있는 경우

### 8.7 한국어 우선
- 모든 커뮤니케이션 한국어
- 코드 주석 한국어 OK
- 변수/함수명은 영어 (관례)
- UI 텍스트는 i18n (한/영/일)

---

## 9. 테스트 규칙

### 9.1 테스트 우선순위
- **필수**: Cloud Functions (한도 체크, 결제, 보안)
- **권장**: AI 호출 추상화 레이어
- **선택**: UI 컴포넌트 (스냅샷 테스트)

### 9.2 테스트 도구
- 단위 테스트: Vitest (Jest보다 빠름)
- E2E (모바일): Detox 또는 Maestro
- E2E (웹/어드민): Playwright

### 9.3 테스트 작성 규칙
- 한 테스트는 한 가지만 검증
- 한국어 describe/it 가능 (`describe('한도 초과 시', ...)`)
- Firestore는 emulator 사용 (실 DB 영향 X)

---

## 10. 커밋 규칙

### 10.1 커밋 메시지 형식
```
<type>(<scope>): <subject>

<body (선택)>

<footer (선택)>
```

**type**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
**scope**: `mobile` | `admin` | `functions` | `shared` | `docs`
**subject**: 한국어 OK, 명령형, 50자 이내

예시:
```
feat(mobile): 음성 입력 화면 STT 통합 (FR-002)
fix(functions): 한도 체크 시 race condition 수정
docs(prd): Phase 4 결제 정책 추가
```

### 10.2 브랜치 전략
- `main`: 정식 출시
- `develop`: 개발 통합
- `feature/{FR-XXX}`: 기능 개발
- `fix/{이슈번호}`: 버그 수정
- `docs/{주제}`: 문서 작업

---

## 11. 참조 문서

이 프로젝트의 모든 문서는 `docs/` 디렉토리에 있습니다.
Claude Code는 작업 시 관련 문서를 먼저 읽고 진행해야 합니다.

| 문서 | 용도 |
|---|---|
| `01_MVP_정의서_v0.4.md` | 프로젝트 전체 비전, 기술 스택, Phase 계획 |
| `02_PRD_v0.6.md` | 28개 사용자 기능 + 8개 어드민 기능 상세 명세 |
| `03_Firestore_스키마.md` | DB 컬렉션 구조 (Wave 1) |
| `04_폴더구조_코딩컨벤션.md` | 코드 조직 (Wave 1) |
| `05_AI_파이프라인.md` | AI 호출 흐름 (Wave 2) |
| `06_API_Spec.md` | Cloud Functions 엔드포인트 (Wave 2) |
| `07_인증_보안.md` | Firestore Rules + 어드민 권한 (Wave 2) |
| `08_User_Flow.md` | 화면 간 흐름 (Wave 3) |
| `09_Wireframe.md` | UI 디자인 명세 (Wave 3) |
| `10_환경변수.md` | `.env` 가이드 (Wave 4) |
| `11_결제_구독.md` | RevenueCat + IAP (Wave 4) |
| `12_다국어.md` | i18n 가이드 (Wave 4) |
| `13_배포_운영.md` | EAS Build, Vercel 배포 (Wave 4) |
| `14_어드민_운영.md` | 어드민 콘솔 운영 가이드 (Wave 4) |

---

## 12. 결정 완료 사항 요약

> 상세는 각 문서의 "결정 완료 사항" 섹션 참고

- **출시 전략**: v1.0 풀스펙 12~15개월, 4 Phase 단계적
- **모바일 스택**: React Native + Expo + TypeScript
- **어드민 스택**: Next.js + Firebase Admin
- **백엔드**: Firebase 풀스택
- **LLM**: Gemini 2.5 Flash-Lite + Flash 라우팅
- **만다라트**: 4 Depth (Project → Section → Sub-section → Task)
- **우선순위**: 5단계 (URGENT/HIGH/NORMAL/LOW/SOMEDAY)
- **Tier 시스템**: Free / Basic / Pro / Enterprise
- **결제 도입**: Phase 4 정식 출시 시점
- **무료 정책**: 풀기능 + 한도 차등
- **무료 체험**: 14일 Pro

---

## 13. 잔여 결정 사항

> 코드 작업 중 아래 항목 만나면 사용자에게 묻기

1. 프로젝트 코드명 / 정식 명칭
2. 이메일 템플릿 디자인
3. 앱 아이콘 / 스플래시 / 시각 디자인
4. 결제 모델 정확한 수치 (Tier 한도, 가격)
5. 개인정보 처리방침 (한국 PIPA + GDPR)
6. 만다라트 기본 테마 6개 디자인

---

**📌 Claude Code 행동 원칙**
1. 모르는 건 묻는다
2. 추측해서 코드 짜지 않는다
3. 사용자 한도 체크는 절대 빠뜨리지 않는다
4. AI Tier 라우팅 엄수
5. 한국어 우선, 일관된 톤
6. 모든 변경은 관련 문서도 같이 업데이트
