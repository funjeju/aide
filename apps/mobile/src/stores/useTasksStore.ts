/**
 * @see docs/03_Firestore_스키마_v0.1.md (tasks 컬렉션)
 */
import { create } from 'zustand';
import { subscribeQuery, where, orderBy } from '@aide/firebase';
import { getFirebaseAuth } from '@aide/firebase';
import { COLLECTIONS } from '@aide/shared';
import type { Task } from '@aide/shared';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  subscribeTasks: () => () => void;
}

export const useTasksStore = create<TasksState>()((set) => ({
  tasks: [],
  loading: true,
  subscribeTasks: () => {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return () => {};

    set({ loading: true });
    const unsubscribe = subscribeQuery<Task>(
      COLLECTIONS.TASKS,
      [
        where('userId', '==', uid),
        where('isDeleted', '==', false),
        where('status', 'in', ['CONFIRMED', 'IN_PROGRESS']),
        orderBy('priority'),
      ],
      (tasks) => set({ tasks, loading: false })
    );
    return unsubscribe;
  },
}));
