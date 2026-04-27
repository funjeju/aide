/**
 * @see docs/04_폴더구조_코딩컨벤션_v0.1.md (Zustand 패턴)
 * @see docs/07_인증_보안_v0.1.md
 */
import { create } from 'zustand';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, loading: false }),
}));
