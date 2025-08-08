
'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
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

function ManageTeamDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: TeamFormData) => void;
  initialData?: TeamWithMembership | null;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: '', members: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({ name: initialData.name, members: initialData.members });
      } else {
        reset({ name: '', members: [] });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (data: TeamFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'ویرایش تیم' : 'ایجاد تیم جدید'}</DialogTitle>
          <DialogDescription>
            نام تیم را مشخص کرده و اعضای آن را اضافه کنید. شما به صورت خودکار ادمین این تیم خواهید شد.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="team-name">نام تیم</Label>
              <Input id="team-name" {...register('name')} className="mt-1" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label>اعضای تیم</Label>
              <div className="space-y-2 mt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...register(`members.${index}.name`)}
                      placeholder={`نام عضو #${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-9 w-9"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ name: '', avatarUrl: '' })}
              >
                <Plus className="h-4 w-4 ml-2" />
                افزودن عضو
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>لغو</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function InvitationLinkDisplay({ link }: { link: string | null | undefined }) {
  const [copied, setCopied] = useState(false);

  if (!link) {
    return (
        <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md text-center">
            لینک دعوت برای این تیم در دسترس نیست.
        </p>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 p-3 border-dashed border-2 border-primary/30 rounded-lg bg-primary/5">
        <Label className="text-xs font-semibold text-primary">لینک دعوت اختصاصی تیم</Label>
        <div className="flex items-center gap-2 mt-2">
            <Input
                readOnly
                value={link}
                className="text-xs bg-white/50 text-primary-dark truncate"
            />
            <Button size="icon" variant="ghost" onClick={handleCopy} className="h-9 w-9 flex-shrink-0 text-primary hover:bg-primary/10">
                {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
            </Button>
        </div>
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

  const handleAddTeam = () => {
    setEditingTeam(null);
    setIsManageTeamDialogOpen(true);
  };

  const handleEditTeam = (team: TeamWithMembership) => {
    setEditingTeam(team);
    setIsManageTeamDialogOpen(true);
  };
  
  const handleDeleteTeamWrapper = async (teamId: number) => {
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
  };

  const handleSaveTeam = async (teamData: TeamFormData) => {
     if (!session?.user?.id) {
        toast({ title: "خطا", description: "برای ساخت یا ویرایش تیم باید وارد شوید.", variant: 'destructive' });
        return;
      }
    
    startTransition(async () => {
       try {
        if (editingTeam) {
          await updateTeam({ ...editingTeam, ...teamData });
          toast({ title: "تیم به‌روزرسانی شد" });
        } else {
          await addTeam({ name: teamData.name }, session.user.id);
          toast({ title: "تیم جدید ساخته شد" });
        }
        setIsManageTeamDialogOpen(false);
        setEditingTeam(null);
        await fetchTeams();
      } catch (error) {
         toast({ title: "خطا", description: "ذخیره اطلاعات تیم با مشکل مواجه شد.", variant: 'destructive' });
      }
    });
  };

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
        <Button onClick={handleAddTeam}>
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
                 {team.role === 'admin' && <InvitationLinkDisplay link={team.invitationLink} />}
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

