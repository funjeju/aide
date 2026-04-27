/**
 * @see docs/14_어드민_운영_v0.1.md (어드민 네비게이션)
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { signOut } from '@aide/firebase';

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: '📊' },
  { href: '/dashboard/users', label: '사용자 관리', icon: '👥' },
  { href: '/dashboard/limits', label: '한도 관리', icon: '⚡' },
  { href: '/dashboard/ai-costs', label: 'AI 비용', icon: '🤖' },
  { href: '/dashboard/logs', label: '시스템 로그', icon: '📋' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { clear } = useAdminAuthStore();

  async function handleSignOut() {
    await signOut();
    clear();
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 로고 */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-sm font-bold text-gray-900">Aide Admin</span>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 py-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <span>🚪</span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
