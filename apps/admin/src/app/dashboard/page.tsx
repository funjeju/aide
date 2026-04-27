/**
 * @see docs/14_어드민_운영_v0.1.md (Phase 1 어드민 대시보드)
 * @see docs/02_PRD_v0.6.md (FR-A05 대시보드)
 */
import { Suspense } from 'react';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentUsers } from '@/components/dashboard/RecentUsers';
import { SystemHealth } from '@/components/dashboard/SystemHealth';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<CardLoading />}>
          <RecentUsers />
        </Suspense>
        <Suspense fallback={<CardLoading />}>
          <SystemHealth />
        </Suspense>
      </div>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
          <div className="h-8 bg-gray-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function CardLoading() {
  return <div className="bg-white rounded-xl border border-gray-200 p-4 h-64 animate-pulse" />;
}
