/**
 * @see docs/06_API_Spec_v0.1.md
 * @see docs/04_폴더구조_코딩컨벤션_v0.1.md
 *
 * Phase 1 Alpha Cloud Functions 진입점
 * Region: asia-northeast3 (서울)
 */

// ── Triggers ─────────────────────────────────────────────────────
export { onUserCreated } from './triggers/onUserCreated';
export { onUserDeleted } from './triggers/onUserDeleted';

// ── Callable: 입력 처리 ───────────────────────────────────────────
export { processTextInput } from './callable/processTextInput';
export { processVoiceInput } from './callable/processVoiceInput';

// ── Callable: Draft 액션 ──────────────────────────────────────────
export { updateDraft, confirmDraft, bulkConfirmDrafts } from './callable/draftActions';

// ── Callable: 만다라트 ────────────────────────────────────────────
export {
  suggestMandalartSections,
  suggestMandalartSubSections,
  suggestMandalartTasks,
  linkMandalartTaskToTodo,
} from './callable/mandalart';

// ── Callable: 대시보드 ────────────────────────────────────────────
export { getHomeDashboard } from './callable/dashboard';
