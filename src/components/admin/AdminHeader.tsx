'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminHeaderProps {
  admin: {
    username: string;
    email: string;
    role: string;
  };
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      toast({
        title: 'خروج موفق',
        description: 'با موفقیت از پنل مدیریت خارج شدید',
      });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'مشکلی در خروج از سیستم رخ داد',
      });
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'مدیر ارشد';
      case 'admin': return 'مدیر';
      case 'viewer': return 'ناظر';
      default: return role;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden text-slate-400">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white hidden sm:block">
          Okayr Admin
        </h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 text-slate-300 hover:text-white">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-white">
                {admin.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{admin.username}</p>
              <p className="text-xs text-slate-500">{getRoleName(admin.role)}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
          <DropdownMenuLabel className="text-slate-300">
            <div className="flex flex-col">
              <span>{admin.username}</span>
              <span className="text-xs text-slate-500">{admin.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer">
            <User className="ml-2 h-4 w-4" />
            پروفایل
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
          >
            <LogOut className="ml-2 h-4 w-4" />
            خروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

