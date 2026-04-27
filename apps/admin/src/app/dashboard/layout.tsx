/**
 * @see docs/14_어드민_운영_v0.1.md (어드민 레이아웃)
 */
import { AdminGuard } from '@/components/layout/AdminGuard';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AdminGuard>
  );
}
