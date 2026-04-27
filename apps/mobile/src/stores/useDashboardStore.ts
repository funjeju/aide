/**
 * @see docs/06_API_Spec_v0.1.md (getHomeDashboard)
 */
import { create } from 'zustand';
import { getHomeDashboard } from '@aide/firebase';
import type { Task } from '@aide/shared';

interface DashboardData {
  user: { nickname: string; userTier: string };
  todayTasks: Task[];
  pendingDraftsCount: number;
  pendingDrafts: unknown[];
  top3Recommendations: { taskId: string; reasoning: string; score: number }[];
  stats: { totalToday: number; completedToday: number; completionRate: number };
}

interface DashboardState {
  dashboard: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  dashboard: null,
  loading: false,
  error: null,
  fetchDashboard: async () => {
    set({ loading: true, error: null });
    const today = new Date().toISOString().split('T')[0];
    const result = await getHomeDashboard({ date: today!, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (result.ok) {
      set({ dashboard: result.data as DashboardData, loading: false });
    } else {
      set({ error: result.error, loading: false });
    }
  },
}));
