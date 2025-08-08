
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { addDays, startOfDay } from 'date-fns';

import type { OkrCycle, OkrCycleFormData } from '@/types/okr';
import { newOkrCycleFormSchema } from '@/lib/schemas';


interface ManageCycleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OkrCycleFormData) => void;
  initialData?: OkrCycle | null;
  isSubmitting: boolean;
}

export function ManageCycleDialog({ isOpen, onClose, onSubmit, initialData, isSubmitting }: ManageCycleDialogProps) {
  
  const form = useForm<OkrCycleFormData>({
    resolver: zodResolver(newOkrCycleFormSchema),
    defaultValues: {
      name: '',
      startDate: undefined,
      endDate: undefined,
    }
  });

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = form;

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            reset({
                name: initialData.name,
                startDate: new Date(initialData.startDate),
                endDate: new Date(initialData.endDate),
            });
        } else {
             reset({
                name: '',
                startDate: startOfDay(new Date()),
                endDate: addDays(new Date(), 90),
            });
        }
    }
  }, [isOpen, initialData, reset]);

  const startDate = watch('startDate');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{initialData ? 'ویرایش چرخه OKR' : 'ایجاد چرخه OKR جدید'}</DialogTitle>
          <DialogDescription>
            یک بازه زمانی برای هدف‌گذاری تعریف کنید.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">نام چرخه</Label>
              <Input
                id="name"
                placeholder="مثلا: سه ماهه چهارم ۲۰۲۴"
                {...form.register('name')}
                className="mt-1"
              />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                    <Label htmlFor="startDate">تاریخ شروع</Label>
                    <DatePicker
                        date={watch('startDate')}
                        setDate={(date) => setValue('startDate', date, { shouldValidate: true })}
                        placeholderText="انتخاب تاریخ"
                        className="mt-1"
                    />
                    {errors.startDate && <p className="text-destructive text-sm mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                    <Label htmlFor="endDate">تاریخ پایان</Label>
                    <DatePicker
                        date={watch('endDate')}
                        setDate={(date) => setValue('endDate', date, { shouldValidate: true })}
                        placeholderText="انتخاب تاریخ"
                        className="mt-1"
                        disabled={(date) => !!startDate && (addDays(startDate, 1) > date)}
                    />
                    {errors.endDate && <p className="text-destructive text-sm mt-1">{errors.endDate.message}</p>}
                </div>
            </div>
             {errors.root && <p className="text-destructive text-sm mt-1">{errors.root.message}</p>}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>انصراف</Button>
            </DialogClose>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'ذخیره تغییرات' : 'ایجاد چرخه'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
