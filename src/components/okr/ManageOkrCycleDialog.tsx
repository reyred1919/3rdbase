
import React, { useEffect, useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { OkrCycle } from '@/types/okr';
import { okrCycleFormSchema, type OkrCycleFormData } from '@/lib/schemas';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface ManageOkrCycleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OkrCycleFormData) => void;
  initialData?: OkrCycle | null;
  okrCycles: OkrCycle[];
  isSubmitting: boolean;
}

export function ManageOkrCycleDialog({ isOpen, onClose, onSubmit, initialData, okrCycles, isSubmitting }: ManageOkrCycleDialogProps) {
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<OkrCycleFormData>({
    resolver: zodResolver(okrCycleFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        activeCycleId: initialData?.id,
      });
    }
  }, [isOpen, initialData, reset]);

  const processSubmit = async (data: OkrCycleFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">انتخاب چرخه فعال OKR</DialogTitle>
          <DialogDescription>
            چرخه OKR مورد نظر خود را برای نمایش و مدیریت اهداف انتخاب کنید. تمام داده‌ها بر اساس این چرخه فیلتر خواهند شد.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)}>
          <div className="space-y-4 py-4">
             {okrCycles.length > 0 ? (
                <Controller
                  name="activeCycleId"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={String(field.value)}
                      className="grid grid-cols-1 gap-2"
                    >
                      {okrCycles.map((cycle) => (
                        <Label 
                          key={cycle.id} 
                          htmlFor={`cycle-${cycle.id}`} 
                          className="flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-muted/50 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                        >
                          <RadioGroupItem value={String(cycle.id)} id={`cycle-${cycle.id}`} />
                          <span>{cycle.name}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
             ) : (
                <p className="text-center text-muted-foreground p-4 bg-muted rounded-md">
                    هنوز هیچ چرخه OKRی تعریف نشده است.
                </p>
             )}
            {errors.activeCycleId && <p className="text-destructive text-sm mt-1">{errors.activeCycleId.message}</p>}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>انصراف</Button>
            </DialogClose>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting || okrCycles.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
