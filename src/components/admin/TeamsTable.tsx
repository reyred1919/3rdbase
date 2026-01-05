'use client';

import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, Target, Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: number;
  name: string;
  createdAt: Date;
  owner: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
  memberships: {
    user: {
      id: number;
      username: string;
      firstName: string | null;
      lastName: string | null;
    };
    role: string;
  }[];
  invitations: {
    id: number;
    code: string;
    createdAt: Date;
    expiresAt: Date | null;
  }[];
  _count: {
    members: number;
    objectives: number;
  };
}

interface TeamsTableProps {
  teams: Team[];
}

export function TeamsTable({ teams }: TeamsTableProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(search.toLowerCase()) ||
      team.owner.username.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'کپی شد',
      description: 'کد دعوت در کلیپ‌بورد کپی شد',
    });
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'مدیر';
      case 'member': return 'عضو';
      case 'viewer': return 'ناظر';
      default: return role;
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
              <TableHead className="text-slate-400 text-right">نام تیم</TableHead>
              <TableHead className="text-slate-400 text-right">مالک</TableHead>
              <TableHead className="text-slate-400 text-right">اعضا</TableHead>
              <TableHead className="text-slate-400 text-right">اهداف</TableHead>
              <TableHead className="text-slate-400 text-right">کد دعوت</TableHead>
              <TableHead className="text-slate-400 text-right">تاریخ ایجاد</TableHead>
              <TableHead className="text-slate-400 text-right w-[80px]">جزئیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  تیمی یافت نشد
                </TableCell>
              </TableRow>
            ) : (
              filteredTeams.map((team) => (
                <TableRow key={team.id} className="border-slate-700 hover:bg-slate-800/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Users className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="text-white font-medium">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-white">
                        {team.owner.firstName} {team.owner.lastName}
                      </p>
                      <p className="text-slate-500 text-xs">@{team.owner.username}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-300">{team.memberships.length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-300">{team._count.objectives}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {team.invitations.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                          {team.invitations[0].code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-white"
                          onClick={() => copyToClipboard(team.invitations[0].code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {new Date(team.createdAt).toLocaleDateString('fa-IR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white"
                      onClick={() => {
                        setSelectedTeam(team);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              جزئیات تیم و اعضا
            </DialogDescription>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-4">
              {/* Team Info */}
              <Card className="bg-slate-700/30 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">اطلاعات تیم</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">مالک:</span>
                    <span className="text-white mr-2">
                      {selectedTeam.owner.firstName} {selectedTeam.owner.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">تاریخ ایجاد:</span>
                    <span className="text-white mr-2">
                      {new Date(selectedTeam.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">تعداد اعضا:</span>
                    <span className="text-white mr-2">{selectedTeam.memberships.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">تعداد اهداف:</span>
                    <span className="text-white mr-2">{selectedTeam._count.objectives}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Members */}
              <Card className="bg-slate-700/30 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">اعضای تیم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedTeam.memberships.map((membership) => (
                      <div
                        key={membership.user.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-600/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary text-xs">
                              {membership.user.firstName?.charAt(0) || membership.user.username.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white text-sm">
                              {membership.user.firstName} {membership.user.lastName}
                            </p>
                            <p className="text-slate-500 text-xs">@{membership.user.username}</p>
                          </div>
                        </div>
                        <Badge
                          className={
                            membership.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }
                        >
                          {getRoleName(membership.role)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Invitation Codes */}
              {selectedTeam.invitations.length > 0 && (
                <Card className="bg-slate-700/30 border-slate-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">کدهای دعوت</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTeam.invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-600/30"
                        >
                          <code className="text-sm text-slate-300">{invitation.code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white"
                            onClick={() => copyToClipboard(invitation.code)}
                          >
                            <Copy className="h-3 w-3 ml-1" />
                            کپی
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

