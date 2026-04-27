/**
 * @see docs/14_어드민_운영_v0.1.md (사용자 모니터링)
 */
import { getRecentUsers } from '@/lib/admin-api';

export async function RecentUsers() {
  const users = await getRecentUsers(10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">최근 가입 사용자</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.uid} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                {user.nickname.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-800">{user.nickname}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.userTier === 'PRO' ? 'bg-blue-50 text-blue-700' :
              user.userTier === 'BASIC' ? 'bg-emerald-50 text-emerald-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {user.userTier}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
