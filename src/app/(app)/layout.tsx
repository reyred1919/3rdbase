
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Target, LayoutDashboard, ListChecks, CalendarDays, History, Users, RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { state } = useSidebar();
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { href: '/objectives', label: 'مدیریت اهداف', icon: Target },
    { href: '/cycles', label: 'مدیریت چرخه‌ها', icon: RefreshCw },
    { href: '/teams', label: 'مدیریت تیم‌ها', icon: Users },
    { href: '/tasks', label: 'مدیریت وظیفه‌ها', icon: ListChecks },
    { href: '/calendar', label: 'تقویم', icon: CalendarDays },
    { href: '/timeline', label: 'زمان‌نمای چرخه OKR', icon: History },
  ];

  return (
    <>
      <Sidebar collapsible="icon" side="right">
        <SidebarHeader className="p-4 items-center border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <Image src="https://placehold.co/40x40.png" alt="لوگو برنامه" width={36} height={36} className="rounded-full" data-ai-hint="لوگو دایره" />
            {state === 'expanded' && <span className="text-lg font-semibold text-sidebar-foreground">ردیاب OKR</span>}
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.label, side: 'left', className: 'font-body' }}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-grow">
          {children}
        </main>
         <footer className="py-4 text-center text-sm text-muted-foreground border-t mt-auto">
           ردیاب OKR &copy; {new Date().getFullYear()} - روی آنچه مهم است تمرکز کنید.
        </footer>
      </SidebarInset>
    </>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </SessionProvider>
  );
}
