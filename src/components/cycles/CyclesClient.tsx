
'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Loader2, Calendar } from 'lucide-react';
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
import { format } from 'date-fns';
import { faIR } from 'date-fns/locale';

import type { OkrCycle, OkrCycleFormData } from '@/types/okr';
import { getOkrCycles, createOkrCycle, updateOkrCycle, deleteOkrCycle } from '@/lib/data/actions';

const ManageCycleDialog = dynamic(() => import('@/components/cycles/ManageCycleDialog').then(mod => mod.ManageCycleDialog), {
  loading: () => <div className="p-4">در حال بارگذاری فرم...</div>,
});


export function CyclesClient() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  const [cycles, setCycles] = useState<OkrCycle[]>([]);
  const [isManageCycleDialogOpen, setIsManageCycleDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<OkrCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (status === 'authenticated') {
        const cyclesData = await getOkrCycles();
        setCycles(cyclesData);
      }
    } catch (error) {
      console.error("Failed to fetch cycles:", error);
      toast({ variant: 'destructive', title: 'خطا در بارگذاری چرخه‌ها' });
    } finally {
      setIsLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCycleClick = () => {
    setEditingCycle(null);
    setIsManageCycleDialogOpen(true);
  };

  const handleEditCycle = (cycle: OkrCycle) => {
    setEditingCycle(cycle);
    setIsManageCycleDialogOpen(true);
  };

  const handleDeleteCycle = async (cycleId: number) => {
    startTransition(async () => {
        try {
            await deleteOkrCycle(cycleId);
            toast({ title: "چرخه حذف شد" });
            await fetchData();
        } catch(error) {
            console.error("Delete cycle error:", error);
            toast({ variant: 'destructive', title: 'خطا در حذف چرخه', description: (error as Error).message });
        }
    });
  }

  const handleSaveCycle = async (data: OkrCycleFormData) => {
    startTransition(async () => {
      try {
        if (editingCycle) {
          await updateOkrCycle({ id: editingCycle.id, ...data });
          toast({ title: "چرخه به‌روزرسانی شد" });
        } else {
          await createOkrCycle(data);
          toast({ title: "چرخه جدید اضافه شد" });
        }
        setIsManageCycleDialogOpen(false);
        setEditingCycle(null);
        await fetchData(); // Refresh data
      } catch (error) {
        toast({ variant: 'destructive', title: 'خطا در ذخیره چرخه' });
        console.error("Save cycle error:", error);
      }
    });
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-16 h-16 text-primary mb-6 animate-spin" />
        <h1 className="text-2xl font-semibold text-muted-foreground">در حال بارگذاری چرخه‌ها...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold font-headline text-foreground">مدیریت چرخه‌های OKR</h2>
          <p className="text-muted-foreground text-sm mt-1">چرخه‌های زمانی هدف‌گذاری تیم خود را تعریف و مدیریت کنید.</p>
        </div>
        <Button onClick={handleAddCycleClick} className="bg-primary hover:bg-primary/90" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
          <Plus className="w-4 h-4 ml-2" />
          افزودن چرخه جدید
        </Button>
      </div>

      {cycles.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center bg-card rounded-lg shadow-md mt-8">
            <Calendar className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 font-headline text-foreground">هنوز چرخه‌ای تعریف نشده است</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                با افزودن اولین چرخه زمانی (مثلاً: سه ماهه چهارم ۲۰۲۴)، برنامه‌ریزی اهداف خود را شروع کنید.
            </p>
            <Button onClick={handleAddCycleClick} size="lg">
                <Plus className="w-5 h-5 ml-2" />
                افزودن اولین چرخه
            </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cycles.map(cycle => (
            <Card key={cycle.id}>
              <CardHeader>
                <CardTitle>{cycle.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 pt-1">
                  <Calendar className="w-4 h-4" />
                  {format(cycle.startDate, 'd MMMM yyyy', { locale: faIR })} - {format(cycle.endDate, 'd MMMM yyyy', { locale: faIR })}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                  <Button variant="outline" size="sm" onClick={() => handleEditCycle(cycle)}>
                      <Edit className="w-4 h-4 ml-2" />
                      ویرایش
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>آیا از حذف این چرخه مطمئن هستید؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                  این عمل غیرقابل بازگشت است. تمام اهداف و اطلاعات مرتبط با این چرخه حذف خواهند شد.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>لغو</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCycle(cycle.id)}>
                                  حذف
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {isManageCycleDialogOpen && (
        <ManageCycleDialog
          isOpen={isManageCycleDialogOpen}
          onClose={() => setIsManageCycleDialogOpen(false)}
          onSubmit={handleSaveCycle}
          initialData={editingCycle}
          isSubmitting={isPending}
        />
      )}
    </>
  );
}
