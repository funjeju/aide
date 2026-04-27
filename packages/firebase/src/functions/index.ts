/**
 * @see docs/06_API_Spec_v0.1.md
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../config';
import { FUNCTIONS_REGION } from '@aide/shared';
import type {
  ProcessTextInputRequest,
  ProcessVoiceInputRequest,
  UpdateDraftRequest,
  ConfirmDraftRequest,
  BulkConfirmDraftsRequest,
  SuggestMandalartSectionsRequest,
  ConnectGoogleCalendarRequest,
  Result,
} from '@aide/shared';

export function getFirebaseFunctions() {
  return getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
}

function callFn<Req, Res>(name: string) {
  return async (data: Req): Promise<Result<Res>> => {
    try {
      const fn = httpsCallable<Req, Res>(getFirebaseFunctions(), name);
      const result = await fn(data);
      return { ok: true, data: result.data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : `${name} 호출 실패` };
    }
  };
}

export const processTextInput = callFn<ProcessTextInputRequest, { draftId: string }>('processTextInput');
export const processVoiceInput = callFn<ProcessVoiceInputRequest, { draftId: string; transcript: string }>('processVoiceInput');
export const updateDraft = callFn<UpdateDraftRequest, { ok: boolean }>('updateDraft');
export const confirmDraft = callFn<ConfirmDraftRequest, { taskId: string }>('confirmDraft');
export const bulkConfirmDrafts = callFn<BulkConfirmDraftsRequest, { taskIds: string[] }>('bulkConfirmDrafts');
export const suggestMandalartSections = callFn<SuggestMandalartSectionsRequest, { suggestions: { title: string; description?: string }[] }>('suggestMandalartSections');
export const suggestMandalartSubSections = callFn<{ nodeId: string; sectionTitle: string; centralTheme: string }, { suggestions: { title: string }[] }>('suggestMandalartSubSections');
export const suggestMandalartTasks = callFn<{ nodeId: string; subSectionTitle: string; sectionTitle: string; centralTheme: string }, { suggestions: { title: string }[] }>('suggestMandalartTasks');
export const connectGoogleCalendar = callFn<ConnectGoogleCalendarRequest, { connected: boolean; calendarId: string }>('connectGoogleCalendar');
export const getHomeDashboard = callFn<{ date: string; timezone: string }, unknown>('getHomeDashboard');
