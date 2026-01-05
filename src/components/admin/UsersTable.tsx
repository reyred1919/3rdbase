'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, Search, UserCheck, UserX, Pencil, Trash2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  is_active: boolean;
  createdAt: Date;
  memberships: {
    team: {
      id: number;
      name: string;
    };
    role: string;
  }[];
}

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        ));
        toast({
          title: 'موفق',
          description: `کاربر ${!currentStatus ? 'فعال' : 'غیرفعال'} شد`,
        });
        router.refresh();
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'مشکلی در بروزرسانی کاربر رخ داد',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          mobile: editingUser.mobile,
        }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === editingUser.id ? editingUser : u
        ));
        toast({
          title: 'موفق',
          description: 'اطلاعات کاربر بروزرسانی شد',
        });
        setIsEditDialogOpen(false);
        router.refresh();
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'مشکلی در بروزرسانی کاربر رخ داد',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
        toast({
          title: 'موفق',
          description: 'کاربر حذف شد',
        });
        router.refresh();
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'مشکلی در حذف کاربر رخ داد',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 text-right">کاربر</TableHead>
              <TableHead className="text-slate-400 text-right">ایمیل</TableHead>
              <TableHead className="text-slate-400 text-right">موبایل</TableHead>
              <TableHead className="text-slate-400 text-right">تیم‌ها</TableHead>
              <TableHead className="text-slate-400 text-right">وضعیت</TableHead>
              <TableHead className="text-slate-400 text-right">تاریخ ثبت‌نام</TableHead>
              <TableHead className="text-slate-400 text-right w-[80px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  کاربری یافت نشد
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary text-sm font-medium">
                          {user.firstName?.charAt(0) || user.username.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-slate-500 text-xs">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">{user.email || '-'}</TableCell>
                  <TableCell className="text-slate-300">{user.mobile || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.memberships.length > 0 ? (
                        user.memberships.map((m) => (
                          <Badge
                            key={m.team.id}
                            variant="secondary"
                            className="bg-slate-700 text-slate-300 text-xs"
                          >
                            {m.team.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.is_active
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      }
                    >
                      {user.is_active ? 'فعال' : 'در انتظار'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
                        >
                          <Pencil className="ml-2 h-4 w-4" />
                          ویرایش
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="ml-2 h-4 w-4" />
                              غیرفعال کردن
                            </>
                          ) : (
                            <>
                              <UserCheck className="ml-2 h-4 w-4" />
                              فعال کردن
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>ویرایش کاربر</DialogTitle>
            <DialogDescription className="text-slate-400">
              اطلاعات کاربر را ویرایش کنید
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">نام</Label>
                  <Input
                    value={editingUser.firstName || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, firstName: e.target.value })
                    }
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">نام خانوادگی</Label>
                  <Input
                    value={editingUser.lastName || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, lastName: e.target.value })
                    }
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">ایمیل</Label>
                <Input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">موبایل</Label>
                <Input
                  value={editingUser.mobile || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, mobile: e.target.value })
                  }
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  انصراف
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

