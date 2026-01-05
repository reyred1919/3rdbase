'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings,
  Shield
} from 'lucide-react';

const navItems = [
  {
    title: 'داشبورد',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'کاربران',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'تیم‌ها',
    href: '/admin/teams',
    icon: Building2,
  },
  {
    title: 'تنظیمات',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-64 border-l border-slate-800 bg-slate-900 hidden lg:block">
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-white">پنل مدیریت</span>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

