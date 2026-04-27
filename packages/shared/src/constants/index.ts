/**
 * @see docs/02_PRD_v0.6.md
 * @see docs/09_Wireframe_v0.1.md
 * @see docs/01_MVP_정의서_v0.4.md
 */

import type { Track, Priority, UserTier, Language } from '../types';

// ─── 트랙 ─────────────────────────────────────────────────────────
export const TRACKS: Record<Track, { label: string; color: string }> = {
  LIFE: { label: '일상', color: '#10B981' },
  WORK: { label: '비즈니스', color: '#3B82F6' },
};

// ─── 우선순위 ──────────────────────────────────────────────────────
export const PRIORITIES: Record<Priority, { label: string; color: string; order: number }> = {
  URGENT: { label: '긴급', color: '#EF4444', order: 1 },
  HIGH:   { label: '중요', color: '#F97316', order: 2 },
  NORMAL: { label: '보통', color: '#6B7280', order: 3 },
  LOW:    { label: '낮음', color: '#9CA3AF', order: 4 },
  SOMEDAY:{ label: '언젠가', color: '#D1D5DB', order: 5 },
};

// ─── Tier 한도 ────────────────────────────────────────────────────
export const TIER_LIMITS: Record<UserTier, {
  voiceInputPerDay: number;
  textInputPerDay: number;
  aiCallsPerDay: number;
  projectCount: number;
  memberPerProject: number;
  mandalartDepth: number;
}> = {
  FREE: {
    voiceInputPerDay: 3,
    textInputPerDay: 10,
    aiCallsPerDay: 20,
    projectCount: 1,
    memberPerProject: 1,
    mandalartDepth: 2,
  },
  BASIC: {
    voiceInputPerDay: 10,
    textInputPerDay: 50,
    aiCallsPerDay: 100,
    projectCount: 3,
    memberPerProject: 3,
    mandalartDepth: 3,
  },
  PRO: {
    voiceInputPerDay: 50,
    textInputPerDay: 200,
    aiCallsPerDay: 500,
    projectCount: 20,
    memberPerProject: 10,
    mandalartDepth: 4,
  },
  ENT: {
    voiceInputPerDay: 999999,
    textInputPerDay: 999999,
    aiCallsPerDay: 999999,
    projectCount: 999999,
    memberPerProject: 999999,
    mandalartDepth: 4,
  },
};

// ─── 언어 ─────────────────────────────────────────────────────────
export const LANGUAGES: Record<Language, { label: string; locale: string }> = {
  ko: { label: '한국어', locale: 'ko-KR' },
  en: { label: 'English', locale: 'en-US' },
  ja: { label: '日本語', locale: 'ja-JP' },
};

// ─── Firestore 컬렉션 명 ──────────────────────────────────────────
export const COLLECTIONS = {
  USERS: 'users',
  USER_LIMITS: 'userLimits',
  RAW_DATA: 'rawData',
  PARSED_DATA: 'parsedData',
  DRAFTS: 'drafts',
  TASKS: 'tasks',
  EVENTS: 'events',
  PERSONS: 'persons',
  PROJECTS: 'projects',
  SECTIONS: 'sections',
  SUB_SECTIONS: 'subSections',
  MANDALART_NODES: 'mandalartNodes',
  CHATS: 'chats',
  RECURRING_TASKS: 'recurringTasks',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  TIERS: 'tiers',
  ADMIN_USERS: 'admin_users',
  ADMIN_LOGS: 'admin_logs',
} as const;

// ─── Cloud Functions 지역 ─────────────────────────────────────────
export const FUNCTIONS_REGION = 'asia-northeast3' as const;

// ─── 감정 레이블 ──────────────────────────────────────────────────
export const EMOTIONS = [
  'positive',
  'negative',
  'neutral',
  'stressed',
  'excited',
  'worried',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

// ─── Mandalart 최대 깊이 ──────────────────────────────────────────
export const MANDALART_MAX_DEPTH = 4 as const;
export const MANDALART_GRID_SIZE = 3 as const;

// ─── Draft 상태 ───────────────────────────────────────────────────
export const DRAFT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  DISCARDED: 'DISCARDED',
} as const;
