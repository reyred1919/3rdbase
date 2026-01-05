import { requireAdmin } from '@/lib/admin-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';

export default async function AdminSettingsPage() {
  const session = await requireAdmin();

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'مدیر ارشد';
      case 'admin': return 'مدیر';
      case 'viewer': return 'ناظر';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/20 text-purple-400';
      case 'admin': return 'bg-blue-500/20 text-blue-400';
      case 'viewer': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">تنظیمات</h2>
        <p className="text-slate-400">اطلاعات حساب کاربری شما</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              پروفایل
            </CardTitle>
            <CardDescription className="text-slate-400">
              اطلاعات حساب کاربری شما
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-2xl font-bold">
                  {session.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{session.username}</h3>
                <p className="text-slate-400">{session.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              سطح دسترسی
            </CardTitle>
            <CardDescription className="text-slate-400">
              نقش و دسترسی‌های شما در سیستم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge className={`text-sm px-3 py-1 ${getRoleColor(session.role)}`}>
                {getRoleName(session.role)}
              </Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {session.role === 'super_admin' && (
                <>
                  <p className="text-green-400">✓ دسترسی کامل به تمام بخش‌ها</p>
                  <p className="text-green-400">✓ امکان حذف کاربران</p>
                  <p className="text-green-400">✓ مدیریت ادمین‌ها</p>
                </>
              )}
              {session.role === 'admin' && (
                <>
                  <p className="text-green-400">✓ مشاهده و ویرایش کاربران</p>
                  <p className="text-green-400">✓ مشاهده تیم‌ها</p>
                  <p className="text-red-400">✗ امکان حذف کاربران</p>
                </>
              )}
              {session.role === 'viewer' && (
                <>
                  <p className="text-green-400">✓ مشاهده کاربران</p>
                  <p className="text-green-400">✓ مشاهده تیم‌ها</p>
                  <p className="text-red-400">✗ امکان ویرایش</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">اطلاعات سیستم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-slate-400 text-sm">نسخه</p>
              <p className="text-white font-medium">1.0.0</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-slate-400 text-sm">محیط</p>
              <p className="text-white font-medium">
                {process.env.NODE_ENV === 'production' ? 'پروداکشن' : 'توسعه'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-slate-400 text-sm">فریم‌ورک</p>
              <p className="text-white font-medium">Next.js 15</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

