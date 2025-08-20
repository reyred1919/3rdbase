
'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import type { TeamFormData, TeamWithMembership } from '@/types/okr';
import { teamSchema } from '@/lib/schemas';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ManageTeamDialog({
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
        reset({ 
          id: initialData.id,
          name: initialData.name, 
          members: initialData.members.map(m => ({...m, id: m.id.toString()})) // Ensure id is string for form
        });
      } else {
        reset({ name: '', members: [{ name: '', avatarUrl: '' }] });
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
          <ScrollArea className="max-h-[calc(70vh-150px)]">
            <div className="space-y-4 py-4 pr-4 pl-2">
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
                        disabled={fields.length <= 1 && !initialData}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.members && <p className="text-sm text-destructive mt-1">{errors.members.message}</p>}
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
          </ScrollArea>
          <DialogFooter className="pt-4 mt-4 border-t">
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
