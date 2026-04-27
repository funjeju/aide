/**
 * @see docs/04_폴더구조_코딩컨벤션_v0.1.md
 */
import type { Result } from '../types';

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

// Firestore serverTimestamp 대신 사용 금지 — 항상 serverTimestamp() 사용
// 클라이언트 디스플레이용 변환만 허용
export function toDisplayDate(seconds: number): Date {
  return new Date(seconds * 1000);
}

export function formatDateKo(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function isoToFirestoreDate(iso: string | null | undefined): { seconds: number; nanoseconds: number } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return null;
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0 };
}

// 프롬프트 인젝션 방어: 사용자 입력 sanitize
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/\bignore\s+previous\s+instructions?\b/gi, '[filtered]')
    .replace(/\bsystem\s*prompt\b/gi, '[filtered]')
    .replace(/\bDAN\b/g, '[filtered]')
    .slice(0, 5000);
}
