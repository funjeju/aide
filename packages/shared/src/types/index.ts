/**
 * @see docs/03_Firestore_스키마_v0.1.md
 * @see docs/02_PRD_v0.6.md
 */

// ─── Result 타입 ──────────────────────────────────────────────────
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// ─── 공통 열거형 ──────────────────────────────────────────────────
export type Track = 'LIFE' | 'WORK';
export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'SOMEDAY';
export type Status = 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
export type EntityType = 'TASK' | 'PERSON' | 'EVENT';
export type UserTier = 'FREE' | 'BASIC' | 'PRO' | 'ENT';
export type Language = 'ko' | 'en' | 'ja';
export type InputChannel = 'voice' | 'text' | 'import';
export type InputMode = 'LIFE' | 'WORK';

// ─── Firestore Timestamp 호환 타입 ────────────────────────────────
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

// ─── 사용자 ───────────────────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  nickname: string;
  photoURL?: string;
  userTier: UserTier;
  language: Language;
  timezone: string;
  fcmTokens: string[];
  onboardingDone: boolean;
  trialUsed: boolean;
  trialEndsAt?: FirestoreTimestamp;
  googleCalendarConnected: boolean;
  googleCalendarId?: string;
  preferences: UserPreferences;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface UserPreferences {
  defaultTrack: Track;
  notificationEnabled: boolean;
  morningBriefingTime?: string;
  eveningReviewEnabled: boolean;
  language: Language;
}

// ─── 한도 카운터 ──────────────────────────────────────────────────
export interface UserLimits {
  uid: string;
  voiceInputToday: number;
  textInputToday: number;
  aiCallsToday: number;
  projectCount: number;
  memberCount: number;
  lastResetAt: FirestoreTimestamp;
}

// ─── RawData ──────────────────────────────────────────────────────
export interface RawData {
  id: string;
  userId: string;
  channel: InputChannel;
  mode: InputMode;
  rawText?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  language: Language;
  createdAt: FirestoreTimestamp;
}

// ─── ParsedData ───────────────────────────────────────────────────
export interface ParsedData {
  id: string;
  userId: string;
  rawDataId: string;
  entities: ParsedEntity[];
  keywords: string[];
  emotion?: string;
  confidence: number;
  modelVersion: string;
  createdAt: FirestoreTimestamp;
}

export interface ParsedEntity {
  type: EntityType;
  text: string;
  normalized?: string;
  startIndex?: number;
  endIndex?: number;
}

// ─── Draft ────────────────────────────────────────────────────────
export interface Draft {
  id: string;
  userId: string;
  rawDataId: string;
  parsedDataId: string;
  track: Track;
  entityType: EntityType;
  title: string;
  body?: string;
  priority: Priority;
  dueDate?: FirestoreTimestamp;
  startDate?: FirestoreTimestamp;
  tags: string[];
  projectId?: string;
  sectionId?: string;
  personIds: string[];
  aiConfidence: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISCARDED';
  editedByUser: boolean;
  confirmedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Task ─────────────────────────────────────────────────────────
export interface Task {
  id: string;
  userId: string;
  track: Track;
  title: string;
  body?: string;
  priority: Priority;
  status: Status;
  dueDate?: FirestoreTimestamp;
  startDate?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
  tags: string[];
  projectId?: string;
  sectionId?: string;
  subSectionId?: string;
  mandalartTaskId?: string;
  personIds: string[];
  recurringTaskId?: string;
  googleEventId?: string;
  sourceRawDataId?: string;
  sourceDraftId?: string;
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Event ────────────────────────────────────────────────────────
export interface Event {
  id: string;
  userId: string;
  track: Track;
  title: string;
  body?: string;
  startAt: FirestoreTimestamp;
  endAt: FirestoreTimestamp;
  allDay: boolean;
  location?: string;
  personIds: string[];
  googleEventId?: string;
  status: Status;
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Person ───────────────────────────────────────────────────────
export interface Person {
  id: string;
  userId: string;
  name: string;
  relation?: string;
  memo?: string;
  tags: string[];
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Project ──────────────────────────────────────────────────────
export interface Project {
  id: string;
  userId: string;
  track: Track;
  title: string;
  description?: string;
  color?: string;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Section / SubSection ─────────────────────────────────────────
export interface Section {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  order: number;
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface SubSection {
  id: string;
  userId: string;
  projectId: string;
  sectionId: string;
  title: string;
  order: number;
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Mandalart ────────────────────────────────────────────────────
export type MandalartDepth = 1 | 2 | 3 | 4;

export interface MandalartNode {
  id: string;
  userId: string;
  projectId: string;
  depth: MandalartDepth;
  parentId?: string;
  position: number;
  title: string;
  description?: string;
  color?: string;
  linkedTaskIds: string[];
  isCompleted: boolean;
  isDeleted: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Chat ─────────────────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  tokensUsed?: number;
  createdAt: FirestoreTimestamp;
}

// ─── Subscription ─────────────────────────────────────────────────
export type SubscriptionStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CANCELED' | 'TRIAL';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentProvider = 'apple' | 'google' | 'stripe';

export interface Subscription {
  id: string;
  userId: string;
  tier: UserTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  provider: PaymentProvider;
  productId: string;
  originalTransactionId?: string;
  startDate: FirestoreTimestamp;
  endDate: FirestoreTimestamp;
  autoRenew: boolean;
  isTrial: boolean;
  canceledAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Admin ────────────────────────────────────────────────────────
export interface AdminUser {
  uid: string;
  email: string;
  role: 'superadmin' | 'admin' | 'viewer';
  totpSecret?: string;
  totpEnabled: boolean;
  lastLoginAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

export interface AdminLog {
  id: string;
  adminUid: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: FirestoreTimestamp;
}
