
import React, { useState, useEffect, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb, Sparkles } from 'lucide-react';
import type { Objective, ObjectiveFormData } from '@/types/okr';
import { getOkrImprovementSuggestionsAction } from '@/lib/data/actions';
import { CONFIDENCE_LEVELS, MAPPED_CONFIDENCE_LEVELS } from '@/lib/constants';
import { checkInFormSchema, type CheckInFormData } from '@/lib/schemas';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from '@/components/ui/progress';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  objective: Objective | null;
  onUpdateObjective: (updatedObjective: ObjectiveFormData) => void;
  isSubmitting: boolean;
}

export function CheckInModal({ isOpen, onClose, objective, onUpdateObjective, isSubmitting }: CheckInModalProps) {
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const { toast } = useToast();

  const { control, handleSubmit, reset, watch } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues: { keyResults: [] },
  });

  useEffect(() => {
    if (objective && isOpen) {
      const initialKrs = objective.keyResults.map(kr => ({
        id: kr.id,
        confidenceLevel: kr.confidenceLevel,
      }));
      reset({ keyResults: initialKrs });
      setAiSuggestions([]); 
    }
  }, [objective, reset, isOpen]);
  
  if (!objective) return null;

  const processCheckIn = (data: CheckInFormData) => {
    const updatedObjectiveData: ObjectiveFormData = {
        ...objective,
        keyResults: objective.keyResults.map(originalKr => {
            const updatedKrData = data.keyResults.find(ukr => ukr.id === originalKr.id);
            return {
                ...originalKr,
                progress: originalKr.progress || 0,
                confidenceLevel: updatedKrData ? updatedKrData.confidenceLevel : originalKr.confidenceLevel,
                initiatives: originalKr.initiatives.map(init => ({ ...init, tasks: init.tasks || [] })),
                risks: originalKr.risks || [],
                assignees: originalKr.assignees || [],
            };
        })
    };
    onUpdateObjective(updatedObjectiveData);
  };

  const handleGetAiSuggestions = async () => {
    if (!objective) return;

    setIsLoadingAiSuggestions(true);
    setAiSuggestions([]);
    
    const currentFormData = watch();
    const currentObjectiveState: Objective = {
      ...objective,
      keyResults: objective.keyResults.map(originalKr => {
        const updatedKrData = currentFormData.keyResults.find(ukr => ukr.id === originalKr.id);
        return updatedKrData ? { ...originalKr, confidenceLevel: updatedKrData.confidenceLevel } : originalKr;
      }),
    };

    try {
      const result = await getOkrImprovementSuggestionsAction(currentObjectiveState);

      if (result && result.suggestions && result.suggestions.length > 0) {
        setAiSuggestions(result.suggestions);
        toast({ title: "پیشنهادهای هوش مصنوعی آماده است!", description: "پیشنهادها را برای بهبود OKRهای خود بررسی کنید.", duration: 5000 });
      } else {
        setAiSuggestions(["در حال حاضر پیشنهاد خاصی وجود ندارد. به کار خوب خود ادامه دهید!"]);
        toast({ title: "پیشنهادهای هوش مصنوعی", description: "در حال حاضر پیشنهاد خاصی وجود ندارد.", duration: 3000 });
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      const errorMessage = "در دریافت پیشنهادها خطایی روی داد. لطفاً دوباره تلاش کنید.";
      setAiSuggestions([errorMessage]);
      toast({ variant: "destructive", title: "خطا", description: errorMessage, duration: 5000 });
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">ثبت پیشرفت هدف</DialogTitle>
          <DialogDescription>
            برای: <span className="font-medium text-foreground">{objective.description}</span> <br/>
            سطح اطمینان نتایج کلیدی خود را به‌روز کنید. پیشرفت به صورت خودکار محاسبه می‌شود. سپس، پیشنهادهای مبتنی بر هوش مصنوعی دریافت کنید.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processCheckIn)}>
          <ScrollArea className="max-h-[calc(70vh-200px)]">
            <div className="space-y-6 pt-3 pr-4 pb-3 pl-1">
              {watch('keyResults').map((kr, index) => {
                const originalKr = objective.keyResults.find(k => k.id === kr.id);
                if (!originalKr) return null;
                return (
                  <div key={kr.id} className="p-4 border rounded-lg bg-card shadow-sm">
                    <h4 className="font-medium mb-3 text-foreground">{originalKr.description}</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">پیشرفت (خودکار)</Label>
                          <span className="text-sm font-semibold">{originalKr.progress}%</span>
                        </div>
                        <Progress value={originalKr.progress} className="h-2" />
                      </div>
                      <div>
                        <Label htmlFor={`krConfidence-${index}`} className="text-sm">سطح اطمینان</Label>
                        <Controller
                          name={`keyResults.${index}.confidenceLevel`}
                          control={control}
                          render={({ field: controllerField }) => (
                            <Select
                              onValueChange={controllerField.onChange}
                              value={controllerField.value}
                              dir="rtl"
                            >
                              <SelectTrigger id={`krConfidence-${index}`} className="mt-1.5">
                                <SelectValue placeholder="انتخاب سطح اطمینان" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONFIDENCE_LEVELS.map(level => (
                                  <SelectItem key={level} value={level}>{MAPPED_CONFIDENCE_LEVELS[level]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {aiSuggestions.length > 0 && (
            <Alert className="mt-6 bg-accent/10 border-accent/40 text-accent-foreground shadow">
              <Sparkles className="h-5 w-5 text-accent ml-3" />
              <AlertTitle className="font-headline text-accent">پیشنهادهای مبتنی بر هوش مصنوعی</AlertTitle>
              <AlertDescription className="text-accent-foreground/90">
                <ul className="list-disc pr-5 space-y-1.5 mt-2 text-sm">
                  {aiSuggestions.map((suggestion, i) => <li key={i}>{suggestion}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        
          <DialogFooter className="mt-8 pt-6 border-t gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting || isLoadingAiSuggestions}>بستن</Button>
            </DialogClose>
            <Button type="submit" variant="default" disabled={isSubmitting || isLoadingAiSuggestions}>
              {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              ذخیره پیشرفت
            </Button>
            <Button type="button" onClick={handleGetAiSuggestions} disabled={isLoadingAiSuggestions || isSubmitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoadingAiSuggestions ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="ml-2 h-4 w-4" />
              )}
              دریافت پیشنهاد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
