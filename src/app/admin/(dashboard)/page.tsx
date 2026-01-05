import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, UserCheck, UserX } from 'lucide-react';

async function getStats() {
  const [totalUsers, activeUsers, inactiveUsers, totalTeams] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { is_active: true } }),
    db.user.count({ where: { is_active: false } }),
    db.team.count(),
  ]);

  return { totalUsers, activeUsers, inactiveUsers, totalTeams };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      title: 'کل کاربران',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'کاربران فعال',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'در انتظار تأیید',
      value: stats.inactiveUsers,
      icon: UserX,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'تیم‌ها',
      value: stats.totalTeams,
      icon: Building2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">داشبورد</h2>
        <p className="text-slate-400">خلاصه وضعیت سیستم</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Users */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">آخرین ثبت‌نام‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentUsers />
        </CardContent>
      </Card>
    </div>
  );
}

async function RecentUsers() {
  const users = await db.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      is_active: true,
      createdAt: true,
    },
  });

  if (users.length === 0) {
    return <p className="text-slate-500 text-center py-4">هنوز کاربری ثبت‌نام نکرده است</p>;
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-medium">
                {user.firstName?.charAt(0) || user.username.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-slate-500 text-sm">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.is_active
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {user.is_active ? 'فعال' : 'در انتظار'}
            </span>
            <span className="text-slate-500 text-xs">
              {new Date(user.createdAt).toLocaleDateString('fa-IR')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

