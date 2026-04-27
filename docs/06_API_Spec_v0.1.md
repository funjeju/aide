# API Specification (Cloud Functions)

**버전:** v0.1
**작성일:** 2026-04-27
**관련 문서:** `05_AI_파이프라인_v0.1.md`, `03_Firestore_스키마_v0.1.md`, `CLAUDE.md`

---

## 0. 문서 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| v0.1 | 2026-04-27 | 최초 작성 — 모든 Phase 함수 명세 |

---

## 1. 개요

### 1.1 목적
모든 Cloud Functions의 엔드포인트, 요청/응답 스키마, 에러 코드를 정의한다.

### 1.2 함수 분류

| 종류 | 트리거 | 사용 케이스 |
|---|---|---|
| **HTTPS Callable** | 클라이언트 직접 호출 | AI 처리, Draft 확정 등 (인증 자동) |
| **HTTP Function** | URL 호출 | Webhook 수신 (Apple, Google) |
| **Firestore Trigger** | DB 변경 | Denormalize, 권한 갱신, 푸시 |
| **Scheduled (Cron)** | 시간 기반 | 일간 리포트, 정리 작업 |
| **Auth Trigger** | 사용자 생성/삭제 | 초기화, 정리 |

### 1.3 공통 사항

- **리전**: `asia-northeast3` (서울)
- **언어**: TypeScript
- **인증**: Firebase Auth 자동 (Callable) / 헤더 검증 (HTTP)
- **Cold start 최소화**: `minInstances: 1` (HIGH 우선순위만)
- **타임아웃**: 60초 기본 (긴 작업은 540초까지)
- **최대 인스턴스**: 100 기본 (스케일)

---

## 2. 공통 패턴

### 2.1 Callable 함수 표준 응답

```typescript
// 성공
interface SuccessResponse<T> {
  ok: true;
  data: T;
  requestId: string;
}

// 실패
interface ErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;          // 사용자 친화적 (i18n 키 또는 번역됨)
    detail?: any;
  };
  requestId: string;
}

type ErrorCode =
  | 'unauthenticated'         // 로그인 필요
  | 'permission_denied'       // 권한 없음
  | 'not_found'               // 리소스 없음
  | 'invalid_argument'        // 입력 형식 오류
  | 'limit_exceeded'          // 한도 초과
  | 'resource_exhausted'      // API 한도 (Gemini)
  | 'internal'                // 서버 오류
  | 'unavailable'             // 일시 장애
  | 'deadline_exceeded';      // 타임아웃
```

### 2.2 표준 함수 패턴

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';

export const myFunction = onCall(
  {
    region: 'asia-northeast3',
    cors: true,
    maxInstances: 100,
    timeoutSeconds: 60,
  },
  async (request) => {
    const requestId = uuidv4();

    // 1. 인증
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다');
    }

    // 2. 입력 검증 (Zod)
    const parsed = InputSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    // 3. 한도 체크 (필요 시)
    const limit = await checkUserLimit(request.auth.uid, 'someAction');
    if (!limit.allowed) {
      throw new HttpsError('resource-exhausted', '한도 초과', { upgradeTo: 'PRO' });
    }

    // 4. 본 작업
    try {
      const result = await doWork(request.auth.uid, parsed.data);
      return { ok: true, data: result, requestId };
    } catch (error) {
      logger.error('myFunction failed', { uid: request.auth.uid, requestId, error });
      throw new HttpsError('internal', '처리 중 오류가 발생했어요');
    }
  }
);
```

---

## 3. Phase 1 (Alpha) — 핵심 함수

### 3.1 사용자 / 인증

#### 🔹 `onUserCreated` (Auth Trigger)

**트리거**: Firebase Auth 사용자 생성
**목적**: 사용자 초기화

```typescript
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // 1. users/{uid} 문서 생성
  await db.doc(`users/${user.uid}`).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider: user.providerData[0]?.providerId,
    nickname: user.displayName ?? '사용자',
    userTier: 'FREE',                 // 기본 Free
    userLimitsOverride: null,
    tierHistory: [],
    notificationTimes: { morning: '08:30', lunch: '12:30', evening: '21:00' },
    consents: { /* 기본값 */ },
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
  });

  // 2. preferences 초기화
  await db.doc(`users/${user.uid}/preferences/main`).set({ /* 기본값 */ });

  // 3. 환영 이메일 발송
  await sendWelcomeEmail(user.email);

  // 4. Analytics 이벤트
  logger.log('User created', { uid: user.uid });
});
```

#### 🔹 `onUserDeleted` (Auth Trigger)

**목적**: 사용자 데이터 익명화 / 정리 (30일 후)

```typescript
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  // 즉시 삭제는 위험 → soft delete + 30일 grace period
  await db.doc(`users/${user.uid}`).update({
    status: 'deleted',
    deletedAt: FieldValue.serverTimestamp(),
  });
  // 실제 영구 삭제는 cron `scheduledHardDeleteAccounts`
});
```

---

### 3.2 음성 / 텍스트 입력

#### 🔹 `processVoiceInput` (Callable)

**FR**: FR-002
**입력**: 업로드된 음성 파일 → STT → 분류 → Draft

```typescript
// 요청
interface ProcessVoiceInput {
  audioStorageUrl: string;            // Cloud Storage 경로
  duration: number;                   // 초
  language?: 'ko' | 'en' | 'ja';     // 선택
}

// 응답
interface ProcessVoiceOutput {
  rawDataId: string;
  parsedDataId: string;
  draftIds: string[];                 // 생성된 Draft ID들
  emotionTagId: string | null;
}
```

**흐름**:
1. 한도 체크 (`voicePerCall`, `voicePerDay`)
2. STT 호출 (디바이스 또는 Whisper)
3. `rawData` 저장 (audioExpiresAt = now + 7일)
4. **병렬 호출**:
   - 분류 (Flash-Lite) → `parsedData` 저장
   - 감정 추출 (Flash-Lite) → `emotionTags` 저장
5. Draft 생성 (Flash) → `drafts` 저장
6. 사용량 카운트 증가

**한도 체크**:
- `voicePerCall` (분 단위)
- `voicePerDay` (회 단위)

**에러 코드**:
- `limit_exceeded`: 한도 초과
- `invalid_audio`: 음성 파일 형식 오류
- `stt_failed`: STT 변환 실패

---

#### 🔹 `processTextInput` (Callable)

**FR**: FR-003

```typescript
// 요청
interface ProcessTextInput {
  text: string;
  language?: 'ko' | 'en' | 'ja';
}

// 응답
interface ProcessTextOutput {
  rawDataId: string;
  parsedDataId: string;
  draftIds: string[];
  emotionTagId: string | null;
}
```

**흐름**: 음성 입력과 동일하나 STT 단계 생략

**한도 체크**: `textMaxLength`

---

### 3.3 Draft 처리

#### 🔹 `updateDraft` (Callable)

**FR**: FR-006

```typescript
interface UpdateDraftInput {
  draftId: string;
  data: Partial<TaskDraftData | PersonDraftData | EventDraftData>;
}

interface UpdateDraftOutput {
  draftId: string;
  data: any;                          // 갱신된 Draft data
}
```

**검증**: Draft 소유자 확인, 만료 여부

---

#### 🔹 `confirmDraft` (Callable)

**FR**: FR-007

```typescript
interface ConfirmDraftInput {
  draftId: string;
}

interface ConfirmDraftOutput {
  resourceId: string;                 // 생성된 task/person/event ID
  resourceType: 'TASK' | 'PERSON' | 'EVENT';
}
```

**흐름**:
1. Draft 조회 + 소유자 확인
2. type에 따라 `tasks`, `persons`, `events` 컬렉션에 생성
3. `confirmed/{id}` 추적용 문서 생성
4. Draft 삭제 (soft)
5. type === 'EVENT' → Google Calendar 동기화 (FR-010)
6. type === 'TASK' && 만다라트 연결 → 만다라트 진행률 갱신

---

#### 🔹 `bulkConfirmDrafts` (Callable)

**FR**: FR-006 (다중 선택)

```typescript
interface BulkConfirmDraftsInput {
  draftIds: string[];                 // 최대 10개
}

interface BulkConfirmDraftsOutput {
  succeeded: { draftId: string; resourceId: string; resourceType: string }[];
  failed: { draftId: string; reason: string }[];
}
```

---

### 3.4 만다라트

#### 🔹 `suggestMandalartSections` (Callable)

**FR**: FR-009 (Depth 2 자동 제안)

```typescript
interface SuggestSectionsInput {
  projectId: string;
  goal: string;
  track: 'LIFE' | 'WORK';
}

interface SuggestSectionsOutput {
  sections: { title: string; iconName: string; description: string }[];  // 8개
}
```

**AI**: Flash, `mandalart-suggest-v1` 프롬프트
**한도**: Project 한도 체크 (`projectMax`)

---

#### 🔹 `suggestMandalartSubSections` (Callable)

**FR**: FR-009 (Depth 3)

```typescript
interface SuggestSubSectionsInput {
  sectionId: string;
}

interface SuggestSubSectionsOutput {
  subSections: { title: string; description: string }[];  // 8개
}
```

---

#### 🔹 `suggestMandalartTasks` (Callable)

**FR**: FR-009 (Depth 4)

```typescript
interface SuggestMandalartTasksInput {
  subSectionId: string;
}

interface SuggestMandalartTasksOutput {
  tasks: { title: string; description: string }[];  // 8개
}
```

---

#### 🔹 `linkMandalartTaskToTodo` (Callable)

**FR**: FR-009 (만다라트 Task ↔ ToDo Task 연결)

```typescript
interface LinkInput {
  mandalartTaskId: string;
  todoTaskId: string | null;          // null이면 unlink
}
```

---

#### 🔹 `onTaskCompleted` (Firestore Trigger)

**목적**: ToDo Task 완료 시 만다라트 진행률 자동 갱신

```typescript
export const onTaskCompleted = onDocumentUpdated(
  'tasks/{taskId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before?.status !== 'DONE' && after?.status === 'DONE') {
      if (after.mandalartTaskId) {
        // mandalartTask isCompleted 갱신
        await db.doc(`mandalartTasks/${after.mandalartTaskId}`)
          .update({ isCompleted: true });

        // 상위 진행률 캐스케이드 갱신
        await updateMandalartProgress(after.mandalartTaskId);
      }
    }
  }
);
```

---

### 3.5 캘린더

#### 🔹 `connectGoogleCalendar` (Callable)

**FR**: FR-010

```typescript
interface ConnectGoogleCalendarInput {
  authCode: string;                   // OAuth authorization code
  redirectUri: string;
}

interface ConnectGoogleCalendarOutput {
  isConnected: true;
  calendars: { id: string; summary: string; primary: boolean }[];
}
```

**흐름**:
1. OAuth code → access/refresh token 교환
2. token을 Secret Manager에 저장
3. 사용자 캘린더 목록 조회
4. `users/{uid}/integrations/googleCalendar` 저장

---

#### 🔹 `disconnectGoogleCalendar` (Callable)

```typescript
// 입력 없음
// 응답
interface DisconnectOutput {
  ok: true;
}
```

---

#### 🔹 `syncEventToGoogle` (내부 호출 - Trigger 기반)

**FR**: FR-010 단방향 동기화

`events` 생성/업데이트 시 자동 호출 (Firestore Trigger)

```typescript
export const onEventWrite = onDocumentWritten(
  'events/{eventId}',
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after.deletedAt) {
      // 삭제 → Google Calendar에서도 삭제
      return;
    }
    if (after.syncSource === 'app') {
      await pushEventToGoogleCalendar(after);
    }
  }
);
```

---

### 3.6 알림 / 푸시

#### 🔹 `sendPushNotification` (내부 함수)

```typescript
async function sendPushNotification(
  uid: string,
  payload: { title: string; body: string; data?: any }
): Promise<void>
```

**FCM 사용**, 사용자 토큰은 `users/{uid}/devices/{deviceId}`에서 조회

---

### 3.7 홈 대시보드

#### 🔹 `getHomeDashboard` (Callable)

**FR**: FR-012

```typescript
// 입력
interface GetHomeInput {
  forceRefresh?: boolean;             // 캐시 무시
}

// 응답
interface GetHomeOutput {
  greeting: string;
  top3Tasks: TaskSummary[];
  todayEvents: EventSummary[];
  nextReminder: { type: string; time: string; message: string } | null;
  chatbotMessage: string | null;
  mandalartHighlights: { projectId: string; progress: number; title: string }[];
}
```

**흐름**:
1. `dashboard/{uid}/today` 캐시 확인 (5분 TTL)
2. 캐시 있고 forceRefresh=false → 반환
3. 데이터 수집 + Top 3 추천 (Flash) + 챗봇 메시지 생성
4. 캐시 저장 + 반환

---

## 4. Phase 2 (Beta 1) 함수

### 4.1 챗봇 (FR-014)

#### 🔹 `chatbotMessage` (Callable)

```typescript
interface ChatbotMessageInput {
  chatId: string | null;              // null이면 새 채팅 시작
  message: string;
}

interface ChatbotMessageOutput {
  chatId: string;
  messageId: string;
  response: string;
  suggestions: string[] | null;
  emotionDetected: 'positive' | 'neutral' | 'negative' | null;
}
```

**흐름**:
1. 한도 체크 (`aiCall.flash`)
2. 사용자 컨텍스트 로드 (1일 1회 캐시 + 최근 메시지)
3. Flash 호출
4. 메시지 저장 (`chats/{chatId}/messages/`)
5. 응답 반환

**Cron 보조**: `scheduledContextSummary` (매일 자정 컨텍스트 요약 갱신)

---

### 4.2 캘린더 양방향 (FR-015)

#### 🔹 `googleCalendarWebhook` (HTTP)

```typescript
// HTTP POST, X-Goog-Channel-ID 헤더로 채널 식별
// Google Calendar Push Notification 수신
```

**흐름**:
1. 헤더 검증 (`X-Goog-Channel-ID`, `X-Goog-Resource-State`)
2. 채널 ID로 사용자 찾기
3. 변경 사항 조회 (Google Calendar API `events.list`)
4. 충돌 처리 + Firestore 동기화

---

#### 🔹 `scheduledRenewCalendarWebhook` (Cron)

**스케줄**: 매일 자정
**목적**: 만료 임박 webhook 채널 갱신 (TTL 1주일)

---

### 4.3 첨부파일 (FR-017)

#### 🔹 `uploadTaskAttachment` (Callable)

```typescript
interface UploadAttachmentInput {
  taskId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}

interface UploadAttachmentOutput {
  attachmentId: string;
  uploadUrl: string;                  // Pre-signed URL for direct upload
  expiresAt: string;
}
```

**흐름**:
1. Task 소유자 확인
2. 한도 체크 (파일 크기, Task당 개수, 총 저장)
3. Storage Pre-signed URL 발급
4. `tasks/{taskId}/attachments/{id}` 메타 저장 (status: 'pending')
5. 클라이언트가 직접 업로드
6. 업로드 완료 후 `confirmAttachmentUpload` 호출

---

#### 🔹 `confirmAttachmentUpload` (Callable)

업로드 완료 알림 + 썸네일 생성 큐잉

---

### 4.4 비즈니스 리포트 (FR-018)

#### 🔹 `generateBusinessReport` (Callable)

```typescript
interface GenerateReportInput {
  period: 'daily' | 'weekly';
  date: string;                       // "2026-04-27" 또는 "2026-W17"
  forceRefresh?: boolean;
}

interface GenerateReportOutput {
  reportId: string;
  report: PeriodReport;
}
```

**흐름**:
1. 캐시 확인 (`reports/{uid}/{period}/{date}`)
2. 캐시 있고 강제 새로고침 아니면 반환
3. 데이터 수집 (해당 기간 WORK 트랙 활동)
4. Flash 호출 (`business-report-v1`)
5. 캐시 저장 + 반환

---

### 4.5 감정 태그 (FR-013)

`processVoiceInput`/`processTextInput` 내부에서 자동 호출 (별도 endpoint 없음)

#### 🔹 `updateEmotionTag` (Callable)

사용자가 AI 자동 태그를 수정할 때

```typescript
interface UpdateEmotionInput {
  tagId: string;
  category: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  label: string;
  intensity: number;
}
```

---

## 5. Phase 3 (Beta 2) 함수

### 5.1 하루 리포트 (FR-019)

#### 🔹 `scheduledDailyReport` (Cron)

**스케줄**: 매일 사용자 지정 시간 (기본 21:00 KST)

```typescript
export const scheduledDailyReport = onSchedule(
  { schedule: '0 21 * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3' },
  async () => {
    const users = await getActiveUsers();
    for (const user of users) {
      await generateDailyReportForUser(user.uid);
      await sendPushNotification(user.uid, {
        title: '오늘의 리포트가 도착했어요',
        body: '하루를 돌아보고 내일을 준비해 보세요',
      });
    }
  }
);
```

#### 🔹 `getDailyReport` (Callable)

```typescript
interface GetDailyReportInput {
  date: string;                       // "2026-04-27"
}

interface GetDailyReportOutput {
  report: DailyReport;
  exists: boolean;
}
```

---

### 5.2 맥락 기반 리마인드 (FR-020)

#### 🔹 `registerLocation` (Callable)

```typescript
interface RegisterLocationInput {
  name: string;
  type: 'home' | 'work' | 'shop' | 'gym' | 'custom';
  latitude: number;
  longitude: number;
  radius: number;
}
```

#### 🔹 `triggerContextReminder` (HTTP - 디바이스에서 호출)

위치 진입 시 디바이스가 호출 → 관련 Task 알림 생성

---

### 5.3 학습 / 패턴 (FR-022)

#### 🔹 `scheduledUserInsightsAnalysis` (Cron)

**스케줄**: 주 1회 (매주 월요일 03:00 KST)

```typescript
async function analyzeUserInsights(uid: string) {
  // 시간대별 완료율, Task 패턴, 만다라트 정체 영역 등 분석
  // → users/{uid}/insights/main 갱신
}
```

---

### 5.4 반복 Task (FR-022)

#### 🔹 `createRecurringTask` (Callable)

```typescript
interface CreateRecurringTaskInput {
  baseTask: TaskTemplate;
  recurrenceRule: string;             // RRULE
  endCondition: { type: 'never' | 'until' | 'count'; until?: string; count?: number };
}

interface CreateRecurringTaskOutput {
  recurringId: string;
  firstInstanceTaskId: string;        // 첫 인스턴스 즉시 생성
}
```

#### 🔹 `updateRecurringTask` (Callable)

```typescript
interface UpdateRecurringTaskInput {
  recurringId: string;
  scope: 'instance' | 'future' | 'all';
  changes: Partial<TaskTemplate>;
  instanceDate?: string;              // scope === 'instance'일 때
}
```

#### 🔹 `scheduledGenerateRecurringInstances` (Cron)

**스케줄**: 매일 00:01 KST
**목적**: 향후 30일치 반복 Task 인스턴스 생성

---

## 6. Phase 4 (정식 출시) 함수

### 6.1 협업 (FR-026)

#### 🔹 `shareResource` (Callable)

```typescript
interface ShareResourceInput {
  resourceType: 'project' | 'section' | 'task' | 'report' | 'timeline';
  resourceId: string;
  members: { email: string; role: 'editor' | 'commenter' | 'viewer' }[];
  message?: string;                   // 초대 메시지
}

interface ShareResourceOutput {
  shareId: string;
  invitedCount: number;
  failedCount: number;
}
```

**한도 체크**: `collabMax`

---

#### 🔹 `acceptShareInvitation` (Callable)

```typescript
interface AcceptShareInput {
  shareId: string;
}
```

---

#### 🔹 `updateShareMemberRole` (Callable)

Owner 또는 자신 권한 변경

```typescript
interface UpdateMemberRoleInput {
  shareId: string;
  memberId: string;
  newRole: 'editor' | 'commenter' | 'viewer';
}
```

---

#### 🔹 `removeShareMember` (Callable)

---

#### 🔹 `createPublicLink` (Callable)

```typescript
interface CreatePublicLinkInput {
  resourceType: string;
  resourceId: string;
  expiresInDays: number;              // 1, 7, 30, 0(무제한)
  password?: string;                  // 옵션
}

interface CreatePublicLinkOutput {
  linkId: string;
  url: string;                        // https://app.example.com/p/{linkId}
}
```

---

#### 🔹 `getPublicLinkResource` (HTTP)

공개 링크 통한 리소스 조회 (인증 안 된 사용자)

```typescript
// GET /api/public/{linkId}?password=...
```

---

### 6.2 결제 (FR-027)

#### 🔹 `createSubscription` (Callable)

```typescript
interface CreateSubscriptionInput {
  tier: 'BASIC' | 'PRO' | 'ENT';
  period: 'monthly' | 'yearly';
  platform: 'ios' | 'android' | 'web';
  receiptData: string;                // IAP 영수증 또는 Stripe session ID
}

interface CreateSubscriptionOutput {
  subscriptionId: string;
  status: 'active' | 'pending';
}
```

**흐름**:
1. 영수증 검증 (Apple/Google/Stripe)
2. RevenueCat 등록
3. `subscriptions` 문서 생성
4. `users.userTier` 업데이트 (Trigger 통해)

---

#### 🔹 `cancelSubscription` (Callable)

자동 갱신 OFF (즉시 취소 X — 결제 기간 동안 유지)

---

#### 🔹 `revenueCatWebhook` (HTTP)

```typescript
// POST /webhooks/revenuecat
// Authorization: Bearer {webhook_secret}
```

**처리 이벤트**: 구독 시작/갱신/취소/환불/grace period

---

#### 🔹 `onSubscriptionStatusChange` (Firestore Trigger)

```typescript
export const onSubscriptionStatusChange = onDocumentUpdated(
  'subscriptions/{id}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before.status !== after.status) {
      // status에 따라 users.userTier 자동 변경
      const newTier = determineUserTier(after);
      await db.doc(`users/${after.userId}`).update({
        userTier: newTier,
        tierHistory: FieldValue.arrayUnion({
          fromTier: before.tier,
          toTier: newTier,
          changedAt: FieldValue.serverTimestamp(),
          changedBy: 'payment',
          reason: `Subscription status: ${after.status}`,
        }),
      });
    }
  }
);
```

---

### 6.3 데이터 내보내기 (FR-028)

#### 🔹 `requestExport` (Callable)

```typescript
interface RequestExportInput {
  type: 'mandalart' | 'tasks' | 'reports' | 'timeline' | 'all';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  period?: { start: string; end: string };
}

interface RequestExportOutput {
  exportId: string;
  status: 'pending' | 'processing';
  estimatedSeconds: number;
}
```

**흐름**:
1. 한도 체크 (월 횟수)
2. `exports/{exportId}` 문서 생성 (status: pending)
3. Cloud Tasks 큐에 작업 추가 (`processExport`)
4. 비동기 처리 → 완료 시 푸시 + 이메일

---

#### 🔹 `processExport` (Cloud Tasks worker)

큰 데이터 처리는 Cloud Tasks로 비동기

---

#### 🔹 `getExportStatus` (Callable)

```typescript
interface GetExportStatusInput {
  exportId: string;
}

interface GetExportStatusOutput {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  expiresAt?: string;
}
```

---

## 7. 어드민 함수 (Phase별 점진)

### 7.1 어드민 인증

#### 🔹 `adminLogin` (Callable)

```typescript
interface AdminLoginInput {
  email: string;
  totpCode: string;                   // 2FA
}

interface AdminLoginOutput {
  customToken: string;                // Firebase Custom Token
  role: 'super_admin' | 'admin' | 'support';
}
```

> 어드민 콘솔은 Firebase Custom Claims 사용. Custom Token으로 클라이언트 로그인.

---

### 7.2 사용자 관리

#### 🔹 `adminGetUsers` (Callable)

```typescript
interface AdminGetUsersInput {
  query?: string;                     // 이메일/닉네임/UID
  filters?: { tier?: string; status?: string; createdAfter?: string };
  cursor?: string;                    // 페이지네이션
  limit?: number;                     // 기본 20, 최대 100
}

interface AdminGetUsersOutput {
  users: UserSummary[];
  nextCursor: string | null;
  total: number;
}
```

**보안**: `request.auth.token.role` 검증

---

#### 🔹 `adminGetUserDetail` (Callable)

```typescript
interface AdminGetUserDetailInput {
  uid: string;
}

interface AdminGetUserDetailOutput {
  user: User;
  statistics: {
    totalTasks: number;
    totalEvents: number;
    voiceCount30d: number;
    textCount30d: number;
    aiCost30d: number;
    loginHistory: { date: string; ip: string }[];
  };
}
```

---

#### 🔹 `adminUpdateUserLimits` (Callable)

**FR**: FR-A03

```typescript
interface AdminUpdateLimitsInput {
  uid: string;
  limits: UserLimits | null;          // null이면 override 해제
  reason: string;
}

interface AdminUpdateLimitsOutput {
  ok: true;
}
```

**감사 로그**: `admin_logs` 자동 기록

---

#### 🔹 `adminChangeUserTier` (Callable)

```typescript
interface AdminChangeTierInput {
  uid: string;
  newTier: 'FREE' | 'BASIC' | 'PRO' | 'ENT';
  reason: string;
  durationDays?: number;              // 임시 변경 (예: 14일 Pro 부여)
}
```

---

#### 🔹 `adminSuspendUser` (Callable)

```typescript
interface AdminSuspendInput {
  uid: string;
  reason: string;
  duration: 'temporary' | 'permanent';
  durationDays?: number;
}
```

---

### 7.3 Tier 관리

#### 🔹 `adminUpdateTier` (Callable)

**FR**: FR-A04

```typescript
interface AdminUpdateTierInput {
  tierCode: string;
  changes: Partial<Tier>;
  applyMode: 'immediate' | 'new_users_only' | 'on_renewal';
}

interface AdminUpdateTierOutput {
  ok: true;
  affectedUsers: number;              // 영향 받는 사용자 수
}
```

---

### 7.4 콘텐츠 관리

#### 🔹 `adminCreateAnnouncement` (Callable)
#### 🔹 `adminUpdateEmailTemplate` (Callable)
#### 🔹 `adminUpdateAIPrompt` (Callable)

```typescript
interface AdminUpdateAIPromptInput {
  tier: 'flash-lite' | 'flash';
  task: string;
  newPrompt: string;
  abTestGroup?: 'A' | 'B';
}

interface AdminUpdateAIPromptOutput {
  versionId: string;
  isActive: boolean;
}
```

---

### 7.5 통계

#### 🔹 `adminGetSystemMetrics` (Callable)

**FR**: FR-A05

```typescript
interface AdminGetMetricsInput {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
}

interface AdminGetMetricsOutput {
  dau: TimeSeries;
  mau: TimeSeries;
  signups: TimeSeries;
  churn: TimeSeries;
  revenue: TimeSeries;
  aiCost: TimeSeries;
  tierDistribution: { [tier: string]: number };
}
```

---

#### 🔹 `scheduledDailyMetrics` (Cron)

**스케줄**: 매일 01:00 KST
**목적**: `system_metrics/{date}` 집계

---

## 8. Cron 함수 종합

| 이름 | 스케줄 | 목적 |
|---|---|---|
| `scheduledDailyReport` | `0 21 * * *` | 사용자별 하루 리포트 생성 |
| `scheduledContextSummary` | `0 0 * * *` | 챗봇 컨텍스트 요약 갱신 |
| `scheduledGenerateRecurringInstances` | `1 0 * * *` | 반복 Task 인스턴스 생성 |
| `scheduledCleanupExpiredDrafts` | `0 1 * * *` | 만료 Draft 처리 |
| `scheduledAudioFileCleanup` | `0 2 * * *` | 7일 지난 음성 파일 삭제 |
| `scheduledRenewCalendarWebhook` | `0 3 * * *` | Google Calendar webhook 갱신 |
| `scheduledHardDeleteAccounts` | `0 4 * * *` | 30일 지난 삭제 계정 영구 삭제 |
| `scheduledDailyMetrics` | `0 1 * * *` | 시스템 통계 집계 |
| `scheduledUserInsightsAnalysis` | `0 3 * * 1` | 매주 월요일 사용자 패턴 분석 |
| `scheduledExportCleanup` | `0 5 * * *` | 24시간 지난 export 파일 삭제 |

---

## 9. Webhook 함수

| 이름 | 메소드 | 용도 |
|---|---|---|
| `googleCalendarWebhook` | POST | Google Calendar 변경 통지 |
| `revenueCatWebhook` | POST | 구독/결제 이벤트 |
| `appleAppStoreWebhook` | POST | Apple 결제 알림 (백업) |
| `googlePlayWebhook` | POST | Google Play 결제 알림 (백업) |

### Webhook 보안

- 모든 webhook은 서명 검증
- Apple: JWS 검증
- Google: ID 토큰 검증
- RevenueCat: shared secret

---

## 10. 에러 코드 종합

| 코드 | HTTP | 의미 | 사용자 메시지 (한국어) |
|---|---|---|---|
| `unauthenticated` | 401 | 로그인 필요 | "로그인이 필요해요" |
| `permission_denied` | 403 | 권한 없음 | "이 작업을 수행할 권한이 없어요" |
| `not_found` | 404 | 리소스 없음 | "요청한 정보를 찾을 수 없어요" |
| `invalid_argument` | 400 | 입력 형식 오류 | "입력 형식이 올바르지 않아요" |
| `failed_precondition` | 400 | 조건 불충족 | "지금 이 작업을 할 수 없어요" |
| `out_of_range` | 400 | 범위 초과 | "값이 허용 범위를 벗어났어요" |
| `limit_exceeded` | 429 | Tier 한도 초과 | "한도에 도달했어요. 업그레이드를 고려해보세요" |
| `resource_exhausted` | 429 | 시스템 자원 한도 | "잠시 후 다시 시도해주세요" |
| `unavailable` | 503 | 일시 장애 | "서비스가 일시적으로 불안정해요" |
| `deadline_exceeded` | 504 | 타임아웃 | "처리 시간이 초과됐어요" |
| `internal` | 500 | 서버 오류 | "처리 중 오류가 발생했어요" |
| `cancelled` | 499 | 취소됨 | "요청이 취소됐어요" |

---

## 11. 호출 흐름 예시 (음성 입력 전체)

```
[Client]                              [Cloud Functions]                    [External]
   │                                          │                                 │
   │── 1. 마이크 권한 요청 ──→                │                                 │
   │                                          │                                 │
   │── 2. 녹음 → m4a 파일 ──→ Cloud Storage ──┤                                 │
   │   (users/{uid}/voice/{rawId}.m4a)        │                                 │
   │                                          │                                 │
   │── 3. processVoiceInput call ───→         │                                 │
   │   { audioStorageUrl, duration }          │                                 │
   │                                          │                                 │
   │                                       checkUserLimit                       │
   │                                          │                                 │
   │                                       STT 호출 ─────────→ 디바이스 또는 Whisper
   │                                          │                                 │
   │                                       rawData 저장                        │
   │                                          │                                 │
   │                                       parallel:                           │
   │                                       ├── classifyInput ──→ Gemini Flash-Lite
   │                                       │   parsedData 저장                 │
   │                                       └── extractEmotion ──→ Gemini Flash-Lite
   │                                           emotionTags 저장                │
   │                                          │                                 │
   │                                       generateDraft ──→ Gemini Flash      │
   │                                       drafts 저장 (3개)                   │
   │                                          │                                 │
   │                                       사용량 카운트 +                      │
   │                                          │                                 │
   │←── { rawDataId, parsedDataId, ─────      │                                 │
   │      draftIds: [...], emotionTagId }     │                                 │
   │                                          │                                 │
   │── 4. Draft 검토 화면 표시                │                                 │
   │                                          │                                 │
   │── 5. confirmDraft ────────→              │                                 │
   │                                       Draft 조회                           │
   │                                       tasks/persons/events 생성           │
   │                                       Draft soft delete                   │
   │                                          │                                 │
   │                                       (type === 'EVENT'면)                │
   │                                       Trigger: onEventWrite               │
   │                                       Google Calendar 동기화 ────→ Google Calendar API
   │                                          │                                 │
   │←── { resourceId, resourceType }          │                                 │
   │                                          │                                 │
   │── 6. 핀 고정 애니메이션 + 토스트         │                                 │
```

---

## 12. 보안 / 인증 정리

### 12.1 일반 사용자 함수
- Callable 함수: `request.auth.uid` 자동 검증
- HTTP 함수: `Authorization: Bearer {idToken}` 헤더 + 검증

### 12.2 어드민 함수
- 추가 검증: `request.auth.token.role in ['admin', 'super_admin', 'support']`
- 모든 어드민 액션은 `admin_logs` 자동 기록

### 12.3 Webhook
- 서명 검증 필수 (각 서비스의 공식 SDK 사용)
- 무인증 호출 차단

---

## 13. Rate Limiting

### 13.1 함수별 제한

| 함수 | RPM (분당) | 정책 |
|---|---|---|
| `processVoiceInput` | 10 | 사용자별 |
| `processTextInput` | 30 | 사용자별 |
| `chatbotMessage` | 20 | 사용자별 |
| `confirmDraft` | 60 | 사용자별 |
| Webhook 함수 | 1000 | 글로벌 |
| 어드민 함수 | 무제한 | 어드민 인증 검증 |

### 13.2 초과 시
- HTTP 429 응답
- 사용자에게 "잠시 후 다시 시도해주세요"
- 어드민 알림 (지속 초과 시 — 봇 의심)

---

## 14. 결정 필요 사항

| # | 항목 | 추천 |
|---|---|---|
| **H1** | 함수 타임아웃 기본값 | 60초 (긴 작업은 함수별 540초까지) |
| **H2** | Cold start 최소화 (minInstances) | HIGH 우선순위 (`processVoiceInput`, `chatbotMessage`)만 1개씩 |
| **H3** | RPM 한도 | 위 표 가정값 (실제 사용자 데이터로 조정) |
| **H4** | Cloud Tasks 큐 사용 | 큰 export, AI 분석 등 30초 이상 작업 |
| **H5** | 함수 버전 관리 | onCall에서 `apiVersion` 헤더 받기 (롤아웃 단계별) |
| **H6** | 모니터링 | Firebase Console + Sentry (Cloud Functions 통합) |

---

## 15. 다음 작업

✅ Wave 2 - 1. AI 파이프라인 설계서
✅ Wave 2 - 2. API Specification (현재)
🔄 **Wave 2 - 3. 인증 & 보안 설계서** ← 다음
   - Firestore Security Rules 풀 버전
   - 어드민 Custom Claims
   - 협업 권한 모델
   - OAuth 토큰 관리
