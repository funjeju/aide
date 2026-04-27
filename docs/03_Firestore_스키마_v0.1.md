# Firestore 데이터 스키마

**버전:** v0.1
**작성일:** 2026-04-27
**관련 문서:** `02_PRD_v0.6.md`, `CLAUDE.md`

---

## 0. 문서 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| v0.1 | 2026-04-27 | 최초 작성 — PRD v0.6 기반 모든 컬렉션 정의 |

---

## 1. 설계 원칙

### 1.1 데이터 격리
- 모든 사용자 데이터는 `userId` 필드 보유 또는 `users/{uid}/` 서브컬렉션에 위치
- Firestore Rules에서 `request.auth.uid == resource.data.userId` 검증

### 1.2 Flat vs Nested 결정 기준
- **서브컬렉션 (Nested)**: 부모와 함께 조회되는 데이터 (Task의 댓글/첨부 등)
- **루트 컬렉션 (Flat)**: 독립적으로 조회되는 데이터 (Tasks, Events 등)

### 1.3 비정규화 (Denormalization) 허용
- 읽기 성능을 위해 일부 필드는 중복 저장
- 예: `tasks` 문서에 `track` (필터 빠름)
- 변경 시 Cloud Functions trigger로 동기화

### 1.4 시간 처리
- 모든 시간은 Firestore `Timestamp` 타입
- 저장: `serverTimestamp()`
- 절대 `new Date()` 직접 저장 금지

### 1.5 Soft Delete
- 일부 컬렉션은 `deletedAt` 필드로 처리 (휴지통)
- 30일 후 Cloud Functions cron으로 영구 삭제

### 1.6 문서 크기 한계
- Firestore 1MB 한계 준수
- 큰 콘텐츠는 Cloud Storage + URL 참조

### 1.7 한도 사용량
- Atomic increment 사용
- 동시성 이슈 방지

---

## 2. 컬렉션 계층 구조 (전체 맵)

```
firestore-root/
│
├── 🔐 admin_users/{adminId}                    # 어드민 계정
├── 🎚️ tiers/{tierCode}                         # Tier 정의
│
├── 👤 users/{uid}                              # 사용자 메인
│   ├── preferences/main                        # 환경 설정
│   ├── integrations/{provider}                 # 외부 연동
│   ├── locations/{locationId}                  # 등록 위치 (FR-020)
│   ├── habits/{habitId}                        # 학습된 습관
│   ├── insights/main                           # 사용자 패턴 분석
│   └── usage/{date}                            # 한도 사용량
│
├── 📥 rawData/{rawId}                          # 원문 (음성/텍스트)
├── 🤖 parsedData/{parsedId}                    # AI 분석 결과
├── 📝 drafts/{draftId}                         # 임시 Draft
├── ✅ confirmed/{confirmedId}                   # 확정 메타
│
├── 📋 tasks/{taskId}                           # Task (할 일)
│   ├── attachments/{attachmentId}              # 첨부파일
│   ├── comments/{commentId}                    # 댓글/메모
│   └── activities/{activityId}                 # 활동 로그
│
├── 📅 events/{eventId}                         # Event (일정)
├── 👥 persons/{personId}                       # Person (인물)
│
├── 🎯 projects/{projectId}                     # 만다라트 (Depth 1)
├── 📊 sections/{sectionId}                     # Section (Depth 2)
├── 🔢 subSections/{subSectionId}               # Sub-section (Depth 3)
├── ⭐ mandalartTasks/{taskId}                  # 만다라트 Task (Depth 4)
│
├── 😊 emotionTags/{tagId}                      # 감정 태그
│
├── 💬 chats/{chatId}                           # AI 챗봇 대화
│   └── messages/{messageId}                    # 메시지
│
├── 🔁 recurringTasks/{recurringId}             # 반복 Task
│
├── 🤝 shares/{shareId}                         # 공유 항목
│   └── members/{userId}                        # 협업 멤버
├── 🔗 publicLinks/{linkId}                     # 공개 링크
│
├── 📊 dailyReports/{uid}/dates/{date}          # 일간 리포트
├── 📈 reports/{uid}/{period}/{date}            # 주/월/분기/연간
├── 🏠 dashboard/{uid}/today                    # 홈 캐시
│
├── 💳 subscriptions/{subscriptionId}           # 구독
├── 💰 payments/{paymentId}                     # 결제 이력
│
├── 📤 exports/{exportId}                       # 데이터 내보내기
│
├── 🎨 themes/{themeId}                         # 만다라트 테마
├── 📋 mandalartTemplates/{templateId}          # 만다라트 템플릿
│
├── 📢 system_announcements/{id}                # 공지
├── ✉️ email_templates/{templateId}             # 이메일 템플릿
├── 🤖 ai_prompts/{tier}/versions/{versionId}   # AI 프롬프트 버전
├── 📊 system_metrics/{date}                    # 시스템 통계
└── 📜 admin_logs/{logId}                       # 어드민 감사 로그
```

---

## 3. 컬렉션 상세 명세

### 3.1 `users/{uid}` — 사용자 메인

```typescript
interface User {
  // 기본 정보 (Firebase Auth 동기화)
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  provider: 'google.com' | 'apple.com';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;

  // 사용자 추가 정보
  nickname: string;
  customPhotoURL: string | null;

  // Tier 시스템
  userTier: 'FREE' | 'BASIC' | 'PRO' | 'ENT';
  userLimitsOverride: UserLimits | null;
  tierHistory: TierChange[];

  // 알림 시간 (FR-011)
  notificationTimes: {
    morning: string;  // "08:30"
    lunch: string;    // "12:30"
    evening: string;  // "21:00"
  };

  // 동의 사항
  consents: {
    locationTracking: boolean;
    locationConsentAt: Timestamp | null;
    marketing: boolean;
    dataAnalytics: boolean;
  };

  // 상태
  status: 'active' | 'suspended' | 'deleted';
  suspendedAt: Timestamp | null;
  suspendedReason: string | null;
  deletedAt: Timestamp | null;

  // 메타
  appVersion: string;
  platform: 'ios' | 'android' | null;
}

interface UserLimits {
  voicePerCall: number;        // 분
  voicePerDay: number;
  textMaxLength: number;
  projectMax: number;          // -1 = 무제한
  collabMax: number;
  attachmentSizeLimit: number; // MB
  attachmentTotalLimit: number;
}

interface TierChange {
  fromTier: string;
  toTier: string;
  changedAt: Timestamp;
  changedBy: 'system' | 'admin' | 'user' | 'payment';
  reason: string;
}
```

**인덱스**: `userTier ASC, createdAt DESC`, `status ASC, deletedAt DESC`

---

### 3.2 `users/{uid}/preferences/main` — 환경 설정

```typescript
interface Preferences {
  language: 'auto' | 'ko' | 'en' | 'ja';
  theme: 'auto' | 'light' | 'dark';
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1;
  defaultTrack: 'LIFE' | 'WORK';

  notifications: {
    eventReminder: boolean;
    eventReminderMinutes: number[];
    taskDeadline: boolean;
    dailyBriefing: boolean;
    dailyClosing: boolean;
    chatbotMessages: boolean;
    contextReminders: boolean;
    quietHours: { start: string; end: string };
  };

  updatedAt: Timestamp;
}
```

---

### 3.3 `users/{uid}/integrations/{provider}` — 외부 연동

```typescript
interface GoogleCalendarIntegration {
  provider: 'googleCalendar';
  isConnected: boolean;
  connectedAt: Timestamp;
  selectedCalendarIds: string[];

  // 토큰은 Secret Manager 또는 KMS에 별도 저장
  tokenRefId: string;

  // 양방향 동기화 (FR-015)
  webhookChannelId: string | null;
  webhookExpiresAt: Timestamp | null;
  lastSyncedAt: Timestamp;
  syncDirection: 'one_way' | 'two_way';
}
```

---

### 3.4 `users/{uid}/locations/{locationId}` — FR-020

```typescript
interface UserLocation {
  id: string;
  name: string;                    // "집", "회사"
  type: 'home' | 'work' | 'shop' | 'gym' | 'custom';
  latitude: number;
  longitude: number;
  radius: number;                  // 미터, 기본 100
  isActive: boolean;
  createdAt: Timestamp;
}
```

---

### 3.5 `users/{uid}/habits/{habitId}` — FR-022

```typescript
interface UserHabit {
  id: string;
  pattern: 'daily' | 'weekday' | 'weekend' | 'weekly';
  weekDays: number[] | null;       // [1,3,5] = 월수금
  timeOfDay: string;               // "18:30"
  description: string;
  category: string;
  isAutoDetected: boolean;
  isAccepted: boolean;
  detectedAt: Timestamp;
  confidence: number;              // 0.0~1.0
}
```

---

### 3.6 `users/{uid}/insights/main` — FR-022

```typescript
interface UserInsights {
  timePatterns: {
    morningCompletionRate: number;
    afternoonCompletionRate: number;
    eveningCompletionRate: number;
    bestProductivityHours: number[];
  };

  taskPatterns: {
    procrastinatedCategories: string[];
    averageCompletionTime: { [category: string]: number };
    deadlineAccuracy: number;
  };

  personPatterns: {
    [personId: string]: {
      avgResponseTime: number;
      meetingFrequency: number;
    };
  };

  mandalartPatterns: {
    activeProjects: string[];
    stagnantSections: string[];
  };

  lastAnalyzedAt: Timestamp;
}
```

---

### 3.7 `users/{uid}/usage/{date}` — 한도 사용량

```typescript
interface UsageRecord {
  date: string;                    // "2026-04-27" (UTC)
  voiceCount: number;
  voiceTotalSeconds: number;
  textCount: number;
  textTotalChars: number;
  aiCallCount: { flashLite: number; flash: number };
  exportCount: number;
}
```

**TTL**: 90일 후 자동 삭제

---

### 3.8 `rawData/{rawId}` — 원문 보존

```typescript
interface RawData {
  id: string;
  userId: string;
  type: 'voice' | 'text';

  // type === 'voice'
  audioUrl: string | null;
  audioDuration: number | null;
  audioExpiresAt: Timestamp | null;  // 7일 후 삭제 (음성만)
  transcript: string | null;          // STT 결과 영구 보관

  // type === 'text'
  content: string | null;

  // 공통
  language: 'ko' | 'en' | 'ja' | null;
  createdAt: Timestamp;
  source: 'app' | 'web' | 'widget';
}
```

**인덱스**: `userId ASC, createdAt DESC`

---

### 3.9 `parsedData/{parsedId}` — AI 분석 결과

```typescript
interface ParsedData {
  id: string;
  rawDataId: string;
  userId: string;

  track: 'LIFE' | 'WORK';
  trackConfidence: number;

  entities: ParsedEntity[];
  keywords: string[];
  priority: Priority;
  language: 'ko' | 'en' | 'ja';

  model: 'gemini-2.5-flash-lite';
  modelVersion: string;
  processingTimeMs: number;
  processedAt: Timestamp;
}

interface ParsedEntity {
  type: 'TASK' | 'PERSON' | 'EVENT';
  raw: string;
  confidence: number;
}

type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'SOMEDAY';
```

---

### 3.10 `drafts/{draftId}` — 임시 Draft

```typescript
interface Draft {
  id: string;
  parsedDataId: string;
  rawDataId: string;
  userId: string;

  type: 'TASK' | 'PERSON' | 'EVENT';
  data: TaskDraftData | PersonDraftData | EventDraftData;

  status: 'PENDING' | 'EDITED';
  isAIGenerated: boolean;
  isUserEdited: boolean;

  createdAt: Timestamp;
  expiresAt: Timestamp;       // createdAt + 7일
  editedAt: Timestamp | null;
  trashedAt: Timestamp | null;  // 휴지통 (만료 후 7일)
}

interface TaskDraftData {
  title: string;
  description: string | null;
  priority: Priority;
  estimatedMinutes: number | null;
  dueDate: Timestamp | null;
  track: 'LIFE' | 'WORK';
  personIds: string[] | null;
}

interface PersonDraftData {
  name: string;
  role: string | null;
  contact: string | null;
  notes: string | null;
}

interface EventDraftData {
  title: string;
  startAt: Timestamp;
  endAt: Timestamp | null;
  location: string | null;
  attendees: string[] | null;
  notes: string | null;
}
```

**인덱스**:
- `userId ASC, status ASC, createdAt DESC`
- `userId ASC, type ASC, createdAt DESC`
- `expiresAt ASC` (cron용)

---

### 3.11 `confirmed/{confirmedId}` — 확정 메타

```typescript
interface Confirmed {
  id: string;
  draftId: string;
  userId: string;
  type: 'TASK' | 'PERSON' | 'EVENT';
  resourceId: string;            // 생성된 task/person/event ID
  confirmedAt: Timestamp;
}
```

> 실제 데이터는 `tasks`, `events`, `persons`에 분리. 이 컬렉션은 추적용.

---

### 3.12 `tasks/{taskId}` — 할 일

```typescript
interface Task {
  id: string;
  userId: string;

  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  track: 'LIFE' | 'WORK';

  dueDate: Timestamp | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;

  personIds: string[];
  mandalartTaskId: string | null;
  recurringId: string | null;
  draftId: string;
  rawDataId: string;

  // 협업 (Phase 4)
  isShared: boolean;
  shareId: string | null;
  assigneeId: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

type TaskStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
```

**인덱스**:
- `userId ASC, status ASC, dueDate ASC`
- `userId ASC, track ASC, priority ASC`
- `userId ASC, completedAt DESC`
- `mandalartTaskId ASC`
- `recurringId ASC`
- `assigneeId ASC, status ASC`

---

### 3.13 `tasks/{taskId}/attachments/{attachmentId}` — FR-017

```typescript
interface TaskAttachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  uploadedAt: Timestamp;
  deletedAt: Timestamp | null;
}
```

---

### 3.14 `tasks/{taskId}/comments/{commentId}`

```typescript
interface TaskComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: Timestamp;
  editedAt: Timestamp | null;
  deletedAt: Timestamp | null;
}
```

---

### 3.15 `tasks/{taskId}/activities/{activityId}`

```typescript
interface TaskActivity {
  id: string;
  actorId: string;
  action: 'created' | 'updated' | 'completed' | 'reopened' | 'deleted'
        | 'commented' | 'attached' | 'shared' | 'priority_changed';
  before: any | null;
  after: any | null;
  timestamp: Timestamp;
}
```

---

### 3.16 `events/{eventId}` — 일정

```typescript
interface Event {
  id: string;
  userId: string;

  title: string;
  description: string | null;
  location: string | null;
  startAt: Timestamp;
  endAt: Timestamp | null;
  isAllDay: boolean;
  track: 'LIFE' | 'WORK';

  attendeeIds: string[];

  // Google Calendar 연동
  googleEventId: string | null;
  googleCalendarId: string | null;
  syncSource: 'app' | 'google_calendar';
  syncVersion: string | null;        // etag
  lastSyncedAt: Timestamp | null;

  reminderMinutes: number[];

  status: 'DRAFT' | 'CONFIRMED' | 'UPCOMING' | 'PASSED' | 'CANCELED';

  draftId: string | null;
  rawDataId: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
```

**인덱스**:
- `userId ASC, startAt ASC`
- `userId ASC, status ASC, startAt ASC`
- `userId ASC, track ASC, startAt ASC`
- `googleEventId ASC`

---

### 3.17 `persons/{personId}` — 인물

```typescript
interface Person {
  id: string;
  userId: string;

  name: string;
  nickname: string | null;
  role: string | null;
  contact: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
  };
  organization: string | null;
  notes: string | null;
  photoURL: string | null;

  track: 'LIFE' | 'WORK';

  // denormalized
  taskCount: number;
  eventCount: number;
  lastInteractionAt: Timestamp | null;

  draftId: string | null;
  rawDataId: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
```

**인덱스**: `userId ASC, name ASC`, `userId ASC, track ASC, lastInteractionAt DESC`

---

### 3.18 `projects/{projectId}` — 만다라트 Depth 1

```typescript
interface Project {
  id: string;
  userId: string;

  goal: string;
  description: string | null;
  track: 'LIFE' | 'WORK';

  // denormalized 진행률
  progress: number;        // 0~100
  totalTasks: number;
  completedTasks: number;

  themeId: string;
  customColors: { [key: string]: string } | null;

  isShared: boolean;
  shareId: string | null;

  order: number;
  isPinned: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
```

**인덱스**: `userId ASC, isPinned DESC, order ASC`

---

### 3.19 `sections/{sectionId}` — 만다라트 Depth 2

```typescript
interface Section {
  id: string;
  projectId: string;
  userId: string;            // denormalized

  title: string;
  description: string | null;
  iconName: string | null;
  order: number;             // 1~8

  progress: number;
  totalSubSections: number;
  completedSubSections: number;

  isAIGenerated: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**인덱스**: `projectId ASC, order ASC`

---

### 3.20 `subSections/{subSectionId}` — 만다라트 Depth 3

```typescript
interface SubSection {
  id: string;
  sectionId: string;
  projectId: string;         // denormalized
  userId: string;            // denormalized

  title: string;
  description: string | null;
  order: number;             // 1~8

  progress: number;
  totalTasks: number;
  completedTasks: number;

  isAIGenerated: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**인덱스**: `sectionId ASC, order ASC`

---

### 3.21 `mandalartTasks/{taskId}` — 만다라트 Depth 4

```typescript
interface MandalartTask {
  id: string;
  subSectionId: string;
  sectionId: string;         // denormalized
  projectId: string;         // denormalized
  userId: string;            // denormalized

  title: string;
  description: string | null;
  order: number;             // 1~8

  // ToDo Task와 양방향 연결
  linkedTaskId: string | null;
  isCompleted: boolean;

  isAIGenerated: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**인덱스**: `subSectionId ASC, order ASC`, `linkedTaskId ASC`

---

### 3.22 `emotionTags/{tagId}` — FR-013

```typescript
interface EmotionTag {
  id: string;
  rawDataId: string;
  userId: string;

  category: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  label: string;             // '기분좋음', '뿌듯함' 등
  intensity: number;         // 1~5
  emoji: string;

  source: 'AI' | 'USER';

  extractedAt: Timestamp;
  modifiedAt: Timestamp | null;
}
```

**인덱스**: `userId ASC, extractedAt DESC`, `userId ASC, category ASC, extractedAt DESC`

---

### 3.23 `chats/{chatId}` — FR-014

```typescript
interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
  contextVersion: string;
}
```

**인덱스**: `userId ASC, lastMessageAt DESC`

---

### 3.24 `chats/{chatId}/messages/{messageId}`

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;

  // assistant 메시지 메타
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  contextSnapshot: any | null;  // 디버그용

  // 사용자 피드백
  feedback: 'helpful' | 'not_helpful' | 'inappropriate' | null;
}
```

---

### 3.25 `recurringTasks/{recurringId}` — FR-022

```typescript
interface RecurringTask {
  id: string;
  userId: string;

  baseTask: {
    title: string;
    description: string | null;
    priority: Priority;
    track: 'LIFE' | 'WORK';
    estimatedMinutes: number | null;
  };

  recurrenceRule: string;    // RFC 5545 RRULE

  startDate: Timestamp;
  endCondition: {
    type: 'never' | 'until' | 'count';
    until: Timestamp | null;
    count: number | null;
  };

  lastGeneratedDate: Timestamp;

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**인덱스**: `userId ASC, isActive ASC`, `lastGeneratedDate ASC`

---

### 3.26 `shares/{shareId}` — FR-026

```typescript
interface Share {
  id: string;
  resourceType: 'project' | 'section' | 'task' | 'report' | 'timeline';
  resourceId: string;
  ownerId: string;
  memberCount: number;
  createdAt: Timestamp;
}
```

---

### 3.27 `shares/{shareId}/members/{userId}`

```typescript
interface ShareMember {
  userId: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  invitedBy: string;
  invitedAt: Timestamp;
  acceptedAt: Timestamp | null;
  lastViewedAt: Timestamp | null;
  status: 'pending' | 'accepted' | 'rejected' | 'removed';
}
```

**인덱스**: `userId ASC, status ASC`

---

### 3.28 `publicLinks/{linkId}`

```typescript
interface PublicLink {
  id: string;
  resourceType: string;
  resourceId: string;
  ownerId: string;
  passwordHash: string | null;
  expiresAt: Timestamp;
  viewCount: number;
  isActive: boolean;
  createdAt: Timestamp;
}
```

---

### 3.29 `dailyReports/{uid}/dates/{date}` — FR-019

```typescript
interface DailyReport {
  date: string;              // "2026-04-27"
  userId: string;

  emotionSummary: {
    positiveRatio: number;
    neutralRatio: number;
    negativeRatio: number;
    dominantLabels: string[];
  };

  lifeReport: {
    activitySummary: string;
    bestMoment: string | null;
    suggestion: string;
  };

  workReport: {
    summary: string;
    completedCount: number;
    focusMinutes: number;
    achievementRate: number;
    issues: string[];
    top3Tomorrow: string[];
  };

  stats: {
    totalTasks: number;
    completedTasks: number;
    totalEvents: number;
    voiceInputs: number;
    textInputs: number;
  };

  chatbotMessage: string;

  generatedAt: Timestamp;
  generatedBy: 'auto' | 'manual';
  modelVersion: string;
}
```

---

### 3.30 `reports/{uid}/{period}/{date}` — FR-021

`period`: `weekly` | `monthly` | `quarterly` | `yearly`

```typescript
interface PeriodReport {
  period: string;
  date: string;              // "2026-W17", "2026-04", "2026-Q2", "2026"
  userId: string;

  summary: string;
  completedCount: number;
  focusMinutes: number;
  achievementRate: number;

  issues: string[];
  blockers: { description: string; relatedTasks: string[] }[];

  timeDistribution: { [category: string]: number };
  projectProgress: { projectId: string; progress: number }[];

  comparison: {
    completedDelta: number;
    achievementRateDelta: number;
  } | null;

  topActions: string[];

  generatedAt: Timestamp;
  generatedBy: 'auto' | 'manual';
}
```

---

### 3.31 `dashboard/{uid}/today` — FR-012 캐시

```typescript
interface DashboardCache {
  userId: string;
  date: string;
  top3TaskIds: string[];
  todayEventIds: string[];
  nextReminder: { type: string; time: Timestamp; message: string } | null;
  greeting: string;
  chatbotMessage: string | null;
  generatedAt: Timestamp;
  expiresAt: Timestamp;      // 5분 캐시
}
```

---

### 3.32 `subscriptions/{subscriptionId}` — FR-027

```typescript
interface Subscription {
  id: string;
  userId: string;
  tier: 'BASIC' | 'PRO' | 'ENT';
  period: 'monthly' | 'yearly';

  startDate: Timestamp;
  endDate: Timestamp;
  autoRenew: boolean;

  status: 'active' | 'canceled' | 'expired' | 'grace_period' | 'paused';

  platform: 'ios' | 'android' | 'web';
  revenueCatId: string | null;
  appleTransactionId: string | null;
  googlePurchaseToken: string | null;
  stripeSubscriptionId: string | null;

  trialEndsAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  canceledAt: Timestamp | null;
}
```

**인덱스**: `userId ASC, status ASC, endDate DESC`

---

### 3.33 `payments/{paymentId}`

```typescript
interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;

  amount: number;            // 센트
  currency: 'USD' | 'KRW' | 'JPY';
  paidAt: Timestamp;
  receiptId: string;
  status: 'success' | 'failed' | 'refunded' | 'pending';

  platform: 'ios' | 'android' | 'web';
  metadata: any;
}
```

---

### 3.34 `exports/{exportId}` — FR-028

```typescript
interface Export {
  id: string;
  userId: string;

  type: 'mandalart' | 'tasks' | 'reports' | 'timeline' | 'all';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  period: { start: Timestamp; end: Timestamp } | null;

  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;          // 0~100

  downloadUrl: string | null;
  fileSize: number | null;
  expiresAt: Timestamp | null;  // 24시간 후 다운로드 만료

  requestedAt: Timestamp;
  completedAt: Timestamp | null;
  error: string | null;
}
```

---

### 3.35 `tiers/{tierCode}`

```typescript
interface Tier {
  code: 'FREE' | 'BASIC' | 'PRO' | 'ENT';
  name: string;
  description: string;

  limits: UserLimits;

  pricing: {
    monthlyUSD: number;
    yearlyUSD: number;
    monthlyKRW: number;
    yearlyKRW: number;
  };

  features: { [feature: string]: boolean };

  isActive: boolean;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 3.36 `admin_users/{adminId}`

```typescript
interface AdminUser {
  id: string;                // Auth UID
  email: string;
  role: 'super_admin' | 'admin' | 'support';
  totpSecret: string | null;
  ipWhitelist: string[];

  createdAt: Timestamp;
  lastLogin: Timestamp;
  isActive: boolean;
}
```

---

### 3.37 `admin_logs/{logId}`

```typescript
interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;            // 'limit_override', 'user_suspended'...
  targetType: 'user' | 'tier' | 'system';
  targetId: string;
  before: any | null;
  after: any | null;
  reason: string | null;
  ipAddress: string;
  timestamp: Timestamp;
}
```

**인덱스**: `adminId ASC, timestamp DESC`, `action ASC, timestamp DESC`

---

### 3.38 `system_announcements/{id}`

```typescript
interface SystemAnnouncement {
  id: string;
  title: string;
  body: string;              // Markdown
  targetTiers: string[];
  startAt: Timestamp;
  endAt: Timestamp;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
}
```

---

### 3.39 `email_templates/{templateId}`

```typescript
interface EmailTemplate {
  id: string;
  name: string;              // 'welcome', 'payment_success'
  subject: string;
  bodyHTML: string;
  bodyText: string;
  variables: string[];
  language: 'ko' | 'en' | 'ja';
  isActive: boolean;
  updatedAt: Timestamp;
}
```

---

### 3.40 `ai_prompts/{tier}/versions/{versionId}`

`tier`: `flash-lite` | `flash`

```typescript
interface AIPromptVersion {
  id: string;
  tier: 'flash-lite' | 'flash';
  task: string;              // 'classify', 'draft_generation'
  prompt: string;
  isActive: boolean;
  abTestGroup: string | null;
  performanceMetrics: {
    accuracyRate: number | null;
    userSatisfaction: number | null;
    costPerCall: number | null;
  };
  createdAt: Timestamp;
  createdBy: string;
}
```

---

### 3.41 `system_metrics/{date}`

```typescript
interface SystemMetric {
  date: string;              // "2026-04-27"
  dau: number;
  mau: number;
  signupCount: number;
  churnCount: number;
  totalAICost: number;
  mrr: number;
  tierDistribution: { [tier: string]: number };
  generatedAt: Timestamp;
}
```

---

### 3.42 `mandalartTemplates/{templateId}` — FR-A08

```typescript
interface MandalartTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;

  depth1Goal: string;
  depth2Sections: { title: string; iconName: string }[];   // 8개
  depth3SubSections: { sectionIndex: number; items: string[] }[];
  depth4Tasks: { sectionIndex: number; subIndex: number; items: string[] }[];

  usageCount: number;
  isOfficial: boolean;
  language: 'ko' | 'en' | 'ja';

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 3.43 `themes/{themeId}` — FR-025

```typescript
interface Theme {
  id: string;                // 'mint-green', 'lavender-purple'
  name: string;
  category: 'light' | 'dark';

  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };

  iconStyle: 'rounded' | 'sharp' | 'monochrome';

  isPremium: boolean;
  order: number;
}
```

---

## 4. Firestore Rules 개략

> 상세는 별도 문서 `07_인증_보안.md`에서

### 4.1 기본 거부
```
match /{document=**} {
  allow read, write: if false;
}
```

### 4.2 사용자 데이터 패턴
```
match /users/{uid} {
  allow read: if request.auth.uid == uid;
  allow update: if request.auth.uid == uid
                && request.resource.data.userTier == resource.data.userTier;
}
```

### 4.3 컬렉션 데이터 패턴
```
match /tasks/{taskId} {
  allow read: if isOwner() || isShareMember();
  allow create: if request.resource.data.userId == request.auth.uid;
  allow update, delete: if isOwner() || isShareEditor();
}

function isOwner() {
  return resource.data.userId == request.auth.uid;
}

function isShareMember() {
  return resource.data.isShared
      && exists(/databases/$(database)/documents/shares/$(resource.data.shareId)/members/$(request.auth.uid));
}
```

### 4.4 어드민
```
match /admin_users/{adminId} {
  allow read, write: if request.auth.token.role == 'super_admin';
}
```

### 4.5 결제 (Cloud Functions only)
```
match /subscriptions/{id} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if false;     // 클라이언트 직접 쓰기 금지
}
```

---

## 5. firestore.indexes.json (요약)

```json
{
  "indexes": [
    { "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    { "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "track", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "ASCENDING" }
      ]
    },
    { "collectionGroup": "events",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "startAt", "order": "ASCENDING" }
      ]
    },
    { "collectionGroup": "drafts",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    { "collectionGroup": "emotionTags",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "extractedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

> 추가는 개발 중 Firestore가 "missing index" 에러로 알려줌 → 자동 생성 링크 클릭으로 추가.

---

## 6. Cloud Functions 동기화 책임

denormalized 필드는 다음 Cloud Functions로 동기화:

| 트리거 | 동기화 대상 |
|---|---|
| `tasks` 생성/완료 | `mandalartTasks.isCompleted`, `subSections.progress`, `sections.progress`, `projects.progress` |
| `mandalartTasks` 변경 | 동일 |
| `users.userTier` 변경 | 한도 재계산 (필요 시) |
| `tasks` 완료 | `dashboard/{uid}/today` 무효화 |
| `shares.members` 추가 | 사용자 푸시 알림 |
| `subscriptions.status` 변경 | `users.userTier` 자동 변경 |

---

## 7. 데이터 마이그레이션 정책

### 7.1 스키마 변경 시
- 새 필드: 선택 필드로 추가, 기존 데이터 null
- 필드 제거: deprecated 표시 → 90일 후 제거
- 타입 변경: 새 필드명 + 마이그레이션 스크립트

### 7.2 마이그레이션 스크립트
- 위치: `functions/migrations/`
- 버전별 파일 (`v0.1-to-v0.2.ts`)
- 일회성 실행 + 결과 로깅

---

## 8. 사용량 / 비용 추정

### 8.1 문서 크기
- `users/{uid}`: ~2KB
- `tasks/{taskId}`: ~1KB
- `dailyReports/.../{date}`: ~5KB
- `chats/.../messages/{id}`: ~500B

### 8.2 사용자당 월 데이터
- 일 10회 입력 × 30일 = 300건
- raw + parsed + draft + (task or event) ≈ 1MB / 사용자 / 월
- 음성 파일 (7일 후 삭제) 평균 보관 ≈ 25MB

### 8.3 1,000명 사용자
- Firestore: 약 1GB / 월 (< $1)
- Storage: 약 26GB ($0.7)
- 읽기/쓰기: 약 $5~10 / 월

---

## 9. 결정 필요 사항 (NEW)

| # | 항목 | 추천 |
|---|---|---|
| **E1** | Soft delete grace period | 30일 후 영구 삭제 |
| **E2** | `usage` 컬렉션 보관 | 90일 |
| **E3** | `dashboard` 캐시 TTL | 5분 |
| **E4** | denormalized 동기화 방식 | Cloud Functions trigger (실시간) |
| **E5** | 첨부파일 영구 보관 정책 | Task 삭제 시 첨부도 30일 후 삭제 |
| **E6** | Firestore 리전 | `asia-northeast3` (서울) |

---

## 10. 다음 작업

✅ Wave 1 - 1. CLAUDE.md
✅ Wave 1 - 2. Firestore 스키마 (현재)
🔄 **Wave 1 - 3. 폴더 구조 & 코딩 컨벤션** ← 다음
