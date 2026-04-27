/**
 * @see docs/07_인증_보안_v0.1.md (어드민 인증)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  uid: string;
}

interface AdminAuthState {
  admin: AdminUser | null;
  setAdmin: (admin: AdminUser | null) => void;
  clear: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      setAdmin: (admin) => set({ admin }),
      clear: () => set({ admin: null }),
    }),
    { name: 'aide-admin-auth' }
  )
);
