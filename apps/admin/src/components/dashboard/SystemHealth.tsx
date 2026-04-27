/**
 * @see docs/14_어드민_운영_v0.1.md (시스템 상태 모니터링)
 */
import { getSystemHealth } from '@/lib/admin-api';

export async function SystemHealth() {
  const health = await getSystemHealth();

  const ITEMS = [
    { label: 'Firestore', status: health.firestore },
    { label: 'Cloud Functions', status: health.functions },
    { label: 'Firebase Auth', status: health.auth },
    { label: 'Firebase Storage', status: health.storage },
    { label: 'Gemini AI', status: health.gemini },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">시스템 상태</h3>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-600">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.status === 'ok' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className={`text-xs font-medium ${item.status === 'ok' ? 'text-emerald-600' : item.status === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                {item.status === 'ok' ? '정상' : item.status === 'warning' ? '주의' : '오류'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
