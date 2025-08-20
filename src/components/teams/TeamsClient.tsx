
'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Team, TeamFormData, TeamWithMembership } from '@/types/okr';
import { teamSchema } from '@/lib/schemas';
import { Plus, Trash2, Edit, Users, Loader2, Clipboard, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSession } from 'next-auth/react';
import { getTeams, addTeam, updateTeam, deleteTeam } from '@/lib/data/actions';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';


const ManageTeamDialog = dynamic(() => import('@/components/teams/ManageTeamDialog').then(mod => mod.ManageTeamDialog), {
  loading: () => <p>در حال بارگذاری...</p>,
  ssr: false,
});


function InvitationLinkDisplay({ code }: { code: string | null | undefined }) {
  const [copied, setCopied] = useState(false);

  if (!code) {
    return (
        <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md text-center">
            کد دعوتی برای این تیم یافت نشد.
        </p>
    );
  }

  const signupUrl = `${window.location.origin}/signup?code=${code}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
    const handleCopyLink = () => {
    navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 p-3 border-dashed border-2 border-primary/30 rounded-lg bg-primary/5">
        <Label className="text-xs font-semibold text-primary">کد دعوت اختصاصی تیم</Label>
        <div className="flex items-center gap-2 mt-2">
            <Input
                readOnly
                value={code}
                className="text-center font-mono tracking-widest text-lg bg-white/50 text-primary-dark"
            />
            <Button size="icon" variant="ghost" onClick={handleCopyCode} className="h-9 w-9 flex-shrink-0 text-primary hover:bg-primary/10">
                {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
            </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
            این کد را به اشتراک بگذارید یا 
            <Button variant="link" className="p-0 h-auto mx-1" onClick={handleCopyLink}>لینک دعوت</Button>
            را کپی کنید.
        </p>
    </div>
  );
}


export function TeamsClient() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithMembership | null>(null);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    if (status !== 'authenticated') {
        setIsLoading(false);
        return;
    }
    try {
      setIsLoading(true);
      const userTeams = await getTeams();
      setTeams(userTeams);
    } catch (error) {
      toast({ title: 'خطا', description: 'دریافت اطلاعات تیم‌ها با مشکل مواجه شد.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [status, toast]);


  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleAddTeam = useCallback(() => {
    setEditingTeam(null);
    setIsManageTeamDialogOpen(true);
  }, []);

  const handleEditTeam = useCallback((team: TeamWithMembership) => {
    setEditingTeam(team);
    setIsManageTeamDialogOpen(true);
  }, []);
  
  const handleDeleteTeamWrapper = useCallback(async (teamId: number) => {
    startTransition(async () => {
      try {
          const result = await deleteTeam(teamId);
          if(result.success) {
              await fetchTeams();
              toast({ title: "تیم حذف شد", description: "تیم مورد نظر با موفقیت حذف شد." });
          } else {
              toast({ title: "خطا در حذف تیم", description: result.message, variant: "destructive" });
          }
      } catch(error) {
          toast({ title: "خطا در حذف تیم", description: (error as Error).message, variant: "destructive" });
      }
    });
  }, [fetchTeams, toast]);

  const handleSaveTeam = useCallback(async (teamData: TeamFormData) => {
    startTransition(async () => {
       try {
        if (teamData.id) {
          await updateTeam({ id: teamData.id, ...teamData });
          toast({ title: "تیم به‌روزرسانی شد" });
        } else {
          await addTeam(teamData);
          toast({ title: "تیم جدید ساخته شد" });
        }
        setIsManageTeamDialogOpen(false);
        setEditingTeam(null);
        await fetchTeams();
      } catch (error) {
         toast({ title: "خطا", description: "ذخیره اطلاعات تیم با مشکل مواجه شد.", variant: 'destructive' });
      }
    });
  }, [fetchTeams, toast]);

  if (isLoading || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-16 h-16 text-primary mb-6 animate-spin" />
        <h1 className="text-2xl font-semibold text-muted-foreground">در حال بارگذاری تیم‌ها...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold font-headline text-foreground">مدیریت تیم‌ها</h2>
        <Button onClick={handleAddTeam} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Plus className="h-4 w-4 ml-2" /> ایجاد تیم جدید
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center bg-card rounded-lg shadow-md mt-8">
            <Users className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">هنوز تیمی ایجاد نشده است</h2>
            <p className="text-muted-foreground mb-6">با ایجاد اولین تیم خود، مدیریت همکاری را شروع کنید.</p>
            <Button onClick={handleAddTeam} size="lg">
                <Plus className="w-5 h-5 ml-2" /> ایجاد اولین تیم
            </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {teams.map(team => (
            <Card key={team.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    {team.name}
                  </span>
                   <div className="flex items-center gap-2">
                     <Badge variant={team.role === 'admin' ? 'default' : 'secondary'}>{team.role}</Badge>
                     {team.role === 'admin' && (
                        <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditTeam(team)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">ویرایش</span>
                            </Button>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">حذف</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از حذف این تیم مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    این عمل غیرقابل بازگشت است. تمام اهداف و اطلاعات مرتبط با این تیم حذف خواهند شد.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>لغو</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTeamWrapper(team.id)}>
                                    حذف
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </>
                     )}
                   </div>
                </CardTitle>
                <CardDescription>{team.members.length} عضو</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 {team.members.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {team.members.map(member => (
                            <div key={member.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} data-ai-hint="چهره پروفایل" />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-secondary-foreground">{member.name}</span>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">این تیم هنوز عضوی ندارد.</p>
                 )}
                 {team.role === 'admin' && <InvitationLinkDisplay code={team.invitationLink} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isManageTeamDialogOpen && (
        <ManageTeamDialog
          isOpen={isManageTeamDialogOpen}
          onClose={() => setIsManageTeamDialogOpen(false)}
          onSave={handleSaveTeam}
          initialData={editingTeam}
          isSubmitting={isPending}
        />
      )}
    </>
  );
}
