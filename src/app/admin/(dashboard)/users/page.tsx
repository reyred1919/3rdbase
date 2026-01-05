import { db } from '@/lib/db';
import { UsersTable } from '@/components/admin/UsersTable';

async function getUsers() {
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: {
        include: {
          team: true,
        },
      },
    },
  });
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">مدیریت کاربران</h2>
          <p className="text-slate-400">لیست تمام کاربران سیستم</p>
        </div>
      </div>

      <UsersTable users={users} />
    </div>
  );
}

