
import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { initiativeSchema } from '@/lib/schemas';
import type { Initiative, InitiativeFormData } from '@/types/okr';
import { INITIATIVE_STATUSES } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageInitiativeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initiative: Initiative;
  onSave: (updatedInitiative: InitiativeFormData) => void;
  isSubmitting: boolean;
}

export function ManageInitiativeDialog({ isOpen, onClose, initiative, onSave, isSubmitting }: ManageInitiativeDialogProps) {
  const form = useForm<InitiativeFormData>({
    resolver: zodResolver(initiativeSchema),
  });

  const { control, register, handleSubmit, reset, formState: { errors }, watch } = form;

  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
    control,
    name: 'tasks',
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        ...initiative,
        tasks: initiative.tasks || [],
      });
    }
  }, [isOpen, initiative, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">مدیریت اقدام و وظایف</DialogTitle>
          <DialogDescription>
            شرح و وضعیت اقدام را ویرایش کرده و وظایف زیرمجموعه آن را مدیریت کنید.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)}>
            <ScrollArea className="max-h-[calc(70vh-150px)]">
              <div className="space-y-6 pt-4 pr-4 pl-2 pb-2">
                <div>
                  <Label htmlFor="initiative-description" className="font-semibold">شرح اقدام</Label>
                  <Textarea
                    id="initiative-description"
                    {...register('description')}
                    className="mt-1"
                    rows={3}
                  />
                  {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
                </div>

                <div>
                  <Label htmlFor="initiative-status" className="font-semibold">وضعیت اقدام</Label>
                  <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger id="initiative-status" className="mt-1">
                                  <SelectValue placeholder="انتخاب وضعیت" />
                              </SelectTrigger>
                              <SelectContent>
                                  {INITIATIVE_STATUSES.map(status => (
                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      )}
                  />
                  {errors.status && <p className="text-destructive text-sm mt-1">{errors.status.message}</p>}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">وظایف (Tasks)</h4>
                  <div className="space-y-3">
                    {taskFields.map((task, index) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                          <Controller
                              name={`tasks.${index}.completed`}
                              control={control}
                              render={({ field }) => (
                                  <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      id={`task-completed-${index}`}
                                  />
                              )}
                          />
                        <div className="flex-grow">
                          <Input
                            {...register(`tasks.${index}.description`)}
                            placeholder={`شرح وظیفه #${index + 1}`}
                            className={`bg-card text-sm ${watch(`tasks.${index}.completed`) ? 'line-through text-muted-foreground' : ''}`}
                          />
                          {errors.tasks?.[index]?.description && <p className="text-destructive text-xs mt-1">{errors.tasks[index]?.description?.message}</p>}
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeTask(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {errors.tasks?.root && <p className="text-destructive text-sm mt-1">{errors.tasks.root.message}</p>}
                  <Button type="button" variant="outline" className="w-full mt-4" onClick={() => appendTask({ description: '', completed: false })}>
                      <PlusCircle className="w-4 h-4 ml-2"/>
                      افزودن وظیفه
                  </Button>
                </div>
              </div>
            </ScrollArea>
          
          <DialogFooter className="mt-8 pt-6 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>انصراف</Button>
            </DialogClose>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
