/**
 * @see docs/08_User_Flow_v0.1.md (FR-002 음성입력, FR-003 텍스트입력)
 */
import { create } from 'zustand';
import { processTextInput, processVoiceInput } from '@aide/firebase';
import type { InputMode } from '@aide/shared';

type InputState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface InputStore {
  mode: InputMode;
  state: InputState;
  draftId: string | null;
  transcript: string | null;
  error: string | null;
  setMode: (mode: InputMode) => void;
  submitText: (text: string) => Promise<void>;
  submitVoice: (audioUrl: string, durationSec: number) => Promise<void>;
  reset: () => void;
}

export const useInputStore = create<InputStore>()((set, get) => ({
  mode: 'LIFE',
  state: 'idle',
  draftId: null,
  transcript: null,
  error: null,

  setMode: (mode) => set({ mode }),

  submitText: async (text) => {
    set({ state: 'processing', error: null });
    const result = await processTextInput({
      text,
      mode: get().mode,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (result.ok) {
      set({ state: 'done', draftId: result.data.draftId });
    } else {
      set({ state: 'error', error: result.error });
    }
  },

  submitVoice: async (audioUrl, durationSec) => {
    set({ state: 'processing', error: null });
    const result = await processVoiceInput({
      audioUrl,
      audioDurationSec: durationSec,
      mode: get().mode,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (result.ok) {
      set({ state: 'done', draftId: result.data.draftId, transcript: result.data.transcript });
    } else {
      set({ state: 'error', error: result.error });
    }
  },

  reset: () => set({ state: 'idle', draftId: null, transcript: null, error: null }),
}));
