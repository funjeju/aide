/**
 * @see docs/07_인증_보안_v0.1.md (어드민 접근 제어)
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { admin } = useAdminAuthStore();

  useEffect(() => {
    if (!admin) {
      router.replace('/auth/login');
    }
  }, [admin, router]);

  if (!admin) return null;
  return <>{children}</>;
}
