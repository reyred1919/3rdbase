import { requireAdmin } from '@/lib/admin-auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />
      <div className="lg:pr-64">
        <AdminHeader admin={session} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

