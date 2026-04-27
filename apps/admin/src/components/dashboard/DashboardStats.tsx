/**
 * @see docs/14_어드민_운영_v0.1.md (일일 모니터링 지표)
 */
import { getAdminStats } from '@/lib/admin-api';

export async function DashboardStats() {
  const stats = await getAdminStats();

  const CARDS = [
    { label: '총 사용자', value: stats.totalUsers.toLocaleString(), change: `+${stats.newUsersToday}`, color: 'text-blue-600' },
    { label: 'DAU', value: stats.dau.toLocaleString(), change: `${stats.dauChange > 0 ? '+' : ''}${stats.dauChange}%`, color: 'text-emerald-600' },
    { label: 'AI 호출 (오늘)', value: stats.aiCallsToday.toLocaleString(), change: `$${stats.aiCostToday.toFixed(2)}`, color: 'text-purple-600' },
    { label: '에러율', value: `${stats.errorRate.toFixed(2)}%`, change: stats.errorRate < 1 ? '정상' : '⚠️ 확인 필요', color: stats.errorRate < 1 ? 'text-emerald-600' : 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          <p className="text-xs text-gray-400 mt-1">{card.change}</p>
        </div>
      ))}
    </div>
  );
}
