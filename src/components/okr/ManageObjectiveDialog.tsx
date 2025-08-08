
import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import type { Objective, ObjectiveFormData, Member, Team, TeamWithMembership } from '@/types/okr';
import { objectiveFormSchema } from '@/lib/schemas';
import { CONFIDENCE_LEVELS, INITIATIVE_STATUSES, DEFAULT_KEY_RESULT, type ConfidenceLevel, RISK_STATUSES } from '@/lib/constants';
import { MultiSelect } from '@/components/ui/multi-select';
import { ScrollArea } from '@/components/ui/scroll-area';


interface ManageObjectiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ObjectiveFormData) => void;
  initialData?: Objective | null;
  teams: TeamWithMembership[];
  cycleId: number;
  isSubmitting: boolean;
}

type KeyResultFormData = ObjectiveFormData['keyResults'][number];

const getInitialKeyResultsForForm = (objective: Objective | null | undefined): KeyResultFormData[] => {
  const defaultKrTemplate: KeyResultFormData = { 
    description: '',
    progress: 0,
    confidenceLevel: 'متوسط' as ConfidenceLevel,
    initiatives: [],
    risks: [],
    assignees: [],
  };
  const minKrs = 1;
  let krsToUse: KeyResultFormData[] = [];

  if (objective && objective.keyResults && objective.keyResults.length > 0) {
    krsToUse = objective.keyResults.map(kr => ({ 
      id: kr.id,
      description: kr.description,
      progress: kr.progress ?? 0,
      confidenceLevel: kr.confidenceLevel,
      initiatives: kr.initiatives ? kr.initiatives.map(init => ({...init, tasks: init.tasks || []})) : [],
      risks: kr.risks ? kr.risks.map(r => ({...r})) : [],
      assignees: kr.assignees || [],
    }));
  }
  
  while (krsToUse.length < minKrs) {
    krsToUse.push({ ...defaultKrTemplate }); 
  }
  return krsToUse;
};


export function ManageObjectiveDialog({ isOpen, onClose, onSubmit, initialData, teams, cycleId, isSubmitting }: ManageObjectiveDialogProps) {
  const form = useForm<ObjectiveFormData>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: {
      description: '',
      keyResults: getInitialKeyResultsForForm(null),
    }
  });

  const { fields: krFields, append: appendKr, remove: removeKr } = useFieldArray({
    control: form.control,
    name: 'keyResults',
  });

  const selectedTeamId = form.watch('teamId');
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (isOpen) {
      const defaultValues = initialData
        ? { ...initialData, keyResults: getInitialKeyResultsForForm(initialData) }
        : { description: '', teamId: teams[0]?.id, keyResults: getInitialKeyResultsForForm(null), cycleId };
      form.reset(defaultValues);
    }
  }, [isOpen, initialData, teams, cycleId, form]);
  
  useEffect(() => {
    if (selectedTeamId) {
      const team = teams.find(t => t.id === selectedTeamId);
      setTeamMembers(team ? team.members : []);
    } else {
      setTeamMembers([]);
    }
  }, [selectedTeamId, teams]);

  const processSubmit = (data: ObjectiveFormData) => {
    onSubmit(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline">{initialData ? 'ویرایش هدف' : 'افزودن هدف جدید'}</DialogTitle>
          <DialogDescription>
            هدف خود و نتایج کلیدی و اقدامات قابل اندازه‌گیری آن را تعریف کنید. این هدف به چرخه فعال فعلی اختصاص داده می‌شود.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(processSubmit)}>
          <ScrollArea className="max-h-[calc(80vh-150px)]">
            <div className="space-y-6 pt-3 pr-6 pb-3 pl-2">
              <div>
                <Label htmlFor="objectiveDescription" className="font-semibold text-base">شرح هدف</Label>
                <Textarea
                  id="objectiveDescription"
                  {...form.register('description')}
                  className="mt-1"
                  rows={3}
                  placeholder="مثال: ایجاد تحول در تجربه پشتیبانی مشتری"
                />
                {form.formState.errors.description && <p className="text-destructive text-sm mt-1">{form.formState.errors.description.message}</p>}
              </div>

              <div>
                  <Label htmlFor="teamId" className="font-semibold text-base">تیم مسئول</Label>
                  <Controller
                      name="teamId"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={String(field.value)} disabled={teams.length === 0}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="انتخاب تیم" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map(team => (
                              <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  {form.formState.errors.teamId && <p className="text-destructive text-sm mt-1">{form.formState.errors.teamId.message}</p>}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">نتایج کلیدی</h3>
                {krFields.map((krItem, krIndex) => (
                  <Card key={krItem.id || krIndex} className="mb-4 p-4 border rounded-lg shadow-sm bg-card">
                    <CardContent className="p-0 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label htmlFor={`keyResults.${krIndex}.description`} className="font-medium text-foreground">
                          نتیجه کلیدی #{krIndex + 1}
                        </Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeKr(krIndex)} 
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          disabled={krFields.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        id={`keyResults.${krIndex}.description`}
                        {...form.register(`keyResults.${krIndex}.description`)}
                        placeholder="مثال: کاهش میانگین زمان پاسخگویی به میزان ۲۰٪"
                        rows={2}
                      />
                      {form.formState.errors.keyResults?.[krIndex]?.description && <p className="text-destructive text-sm">{form.formState.errors.keyResults[krIndex]?.description?.message}</p>}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`keyResults.${krIndex}.confidenceLevel`}>سطح اطمینان</Label>
                          <Controller
                            name={`keyResults.${krIndex}.confidenceLevel`}
                            control={form.control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="انتخاب سطح اطمینان" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONFIDENCE_LEVELS.map(level => (
                                    <SelectItem key={level} value={level}>{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {form.formState.errors.keyResults?.[krIndex]?.confidenceLevel && <p className="text-destructive text-sm">{form.formState.errors.keyResults[krIndex]?.confidenceLevel?.message}</p>}
                        </div>
                        <div>
                          <Label>مسئولین</Label>
                          <Controller
                              name={`keyResults.${krIndex}.assignees`}
                              control={form.control}
                              render={({ field }) => (
                                  <MultiSelect
                                      options={teamMembers}
                                      selected={field.value || []}
                                      onChange={field.onChange}
                                      className="mt-1"
                                      placeholder="انتخاب مسئولین..."
                                      disabled={!selectedTeamId}
                                  />
                              )}
                          />
                          {form.formState.errors.keyResults?.[krIndex]?.assignees && <p className="text-destructive text-sm mt-1">{form.formState.errors.keyResults?.[krIndex]?.assignees?.message}</p>}
                        </div>
                      </div>

                      <InitiativesArrayField control={form.control} krIndex={krIndex} register={form.register} errors={form.formState.errors} />
                      <RisksArrayField control={form.control} krIndex={krIndex} register={form.register} errors={form.formState.errors} />
                    </CardContent>
                  </Card>
                ))}
                {form.formState.errors.keyResults?.root && <p className="text-destructive text-sm mt-1">{form.formState.errors.keyResults.root.message}</p>}
                {form.formState.errors.keyResults && !form.formState.errors.keyResults.root && typeof form.formState.errors.keyResults.message === 'string' && <p className="text-destructive text-sm mt-1">{form.formState.errors.keyResults.message}</p>}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => appendKr({ description: '', confidenceLevel: 'متوسط', assignees: [], risks: [], initiatives: []})}
                  className="mt-2 w-full"
                  disabled={krFields.length >= 7}
                >
                  <PlusCircle className="w-4 h-4 ml-2" /> افزودن نتیجه کلیدی
                </Button>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-8 pt-6 border-t sticky bottom-0 bg-background py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>انصراف</Button>
            </DialogClose>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              ذخیره هدف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InitiativesArrayField({ control, krIndex, register, errors }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `keyResults.${krIndex}.initiatives`,
  });

  return (
    <div className="mt-4 pt-4 border-t border-border/60 border-dashed">
      <h4 className="text-md font-medium mb-3 text-foreground">اقدامات</h4>
      {fields.map((item, initiativeIndex) => (
        <div key={item.id} className="p-3 mb-3 border rounded-md bg-muted/30 space-y-2 shadow-sm">
          <div className="flex justify-between items-center">
             <Label htmlFor={`keyResults.${krIndex}.initiatives.${initiativeIndex}.description`} className="text-sm font-normal text-muted-foreground">
              اقدام #{initiativeIndex + 1}
            </Label>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(initiativeIndex)} className="text-destructive hover:bg-destructive/10 h-7 w-7">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Input
            id={`keyResults.${krIndex}.initiatives.${initiativeIndex}.description`}
            {...register(`keyResults.${krIndex}.initiatives.${initiativeIndex}.description`)}
            placeholder="مثال: پیاده‌سازی جریان جدید چت‌بات"
            className="text-sm bg-card"
          />
          {errors.keyResults?.[krIndex]?.initiatives?.[initiativeIndex]?.description && <p className="text-destructive text-xs mt-1">{errors.keyResults[krIndex]?.initiatives[initiativeIndex]?.description?.message}</p>}
          
          <Controller
            name={`keyResults.${krIndex}.initiatives.${initiativeIndex}.status`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="text-sm h-9 bg-card">
                  <SelectValue placeholder="انتخاب وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  {INITIATIVE_STATUSES.map(status => (
                    <SelectItem key={status} value={status} className="text-sm">{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.keyResults?.[krIndex]?.initiatives?.[initiativeIndex]?.status && <p className="text-destructive text-xs mt-1">{errors.keyResults[krIndex]?.initiatives[initiativeIndex]?.status?.message}</p>}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', status: 'شروع نشده', tasks: [] })} className="mt-1 w-full">
        <PlusCircle className="w-4 h-4 ml-2" /> افزودن اقدام
      </Button>
    </div>
  );
}

function RisksArrayField({ control, krIndex, register, errors }: any) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `keyResults.${krIndex}.risks`,
    });

    return (
        <div className="mt-4 pt-4 border-t border-border/60 border-dashed">
            <h4 className="text-md font-medium mb-3 text-foreground">ریسک‌ها و اقدامات اصلاحی</h4>
            {fields.map((item, riskIndex) => (
                <div key={item.id} className="p-3 mb-3 border rounded-md bg-red-500/10 border-destructive/20 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                        <Label htmlFor={`keyResults.${krIndex}.risks.${riskIndex}.description`} className="text-sm font-normal text-destructive">
                            ریسک #{riskIndex + 1}
                        </Label>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(riskIndex)} className="text-destructive hover:bg-destructive/10 h-7 w-7">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    
                    <Textarea
                        id={`keyResults.${krIndex}.risks.${riskIndex}.description`}
                        {...register(`keyResults.${krIndex}.risks.${riskIndex}.description`)}
                        placeholder="شرح ریسک"
                        className="text-sm bg-card"
                        rows={2}
                    />
                    {errors.keyResults?.[krIndex]?.risks?.[riskIndex]?.description && <p className="text-destructive text-xs mt-1">{errors.keyResults[krIndex].risks[riskIndex].description.message}</p>}

                     <Textarea
                        id={`keyResults.${krIndex}.risks.${riskIndex}.correctiveAction`}
                        {...register(`keyResults.${krIndex}.risks.${riskIndex}.correctiveAction`)}
                        placeholder="شرح اقدام اصلاحی"
                        className="text-sm bg-card"
                        rows={2}
                    />
                    {errors.keyResults?.[krIndex]?.risks?.[riskIndex]?.correctiveAction && <p className="text-destructive text-xs mt-1">{errors.keyResults[krIndex].risks[riskIndex].correctiveAction.message}</p>}

                    <Controller
                        name={`keyResults.${krIndex}.risks.${riskIndex}.status`}
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="text-sm h-9 bg-card">
                                    <SelectValue placeholder="انتخاب وضعیت ریسک" />
                                </SelectTrigger>
                                <SelectContent>
                                    {RISK_STATUSES.map(status => (
                                        <SelectItem key={status} value={status} className="text-sm">{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.keyResults?.[krIndex]?.risks?.[riskIndex]?.status && <p className="text-destructive text-xs mt-1">{errors.keyResults[krIndex].risks[riskIndex].status.message}</p>}
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', correctiveAction: '', status: 'فعال' })} className="mt-1 w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <PlusCircle className="w-4 h-4 ml-2" /> افزودن ریسک
            </Button>
        </div>
    );
}

