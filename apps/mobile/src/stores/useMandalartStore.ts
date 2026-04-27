/**
 * @see docs/03_Firestore_스키마_v0.1.md (mandalartNodes)
 */
import { create } from 'zustand';
import type { Project } from '@aide/shared';

interface MandalartState {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
}

export const useMandalartStore = create<MandalartState>()((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
}));
