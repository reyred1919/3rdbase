import { db } from '@/lib/db';
import { TeamsTable } from '@/components/admin/TeamsTable';

async function getTeams() {
  return db.team.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      invitations: {
        select: {
          id: true,
          code: true,
          createdAt: true,
          expiresAt: true,
        },
      },
      _count: {
        select: {
          members: true,
          objectives: true,
        },
      },
    },
  });
}

export default async function AdminTeamsPage() {
  const teams = await getTeams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">مدیریت تیم‌ها</h2>
          <p className="text-slate-400">لیست تمام تیم‌های سیستم</p>
        </div>
      </div>

      <TeamsTable teams={teams} />
    </div>
  );
}

