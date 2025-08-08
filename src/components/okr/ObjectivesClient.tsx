
'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import type { Objective, ObjectiveFormData, OkrCycle, SetActiveOkrCycleFormData, TeamWithMembership } from '@/types/okr';
import { ObjectiveCard } from '@/components/okr/ObjectiveCard';
import { EmptyState } from '@/components/okr/EmptyState';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Plus, Settings2, Loader2 } from 'lucide-react';
import { getObjectives, saveObjective, deleteObjective, getTeams, getOkrCycles, getActiveOkrCycle, setActiveOkrCycle } from '@/lib/data/actions';

const ManageObjectiveDialog = dynamic(() => import('@/components/okr/ManageObjectiveDialog').then(mod => mod.ManageObjectiveDialog), {
  loading: () => <div className="p-4">در حال بارگذاری فرم...</div>,
});
const CheckInModal = dynamic(() => import('@/components/okr/CheckInModal').then(mod => mod.CheckInModal), {
  loading: () => <div className="p-4">در حال بارگذاری...</div>,
});
const ManageOkrCycleDialog = dynamic(() => import('@/components/okr/ManageOkrCycleDialog').then(mod => mod.ManageOkrCycleDialog), {
  loading: () => <div className="p-4">در حال بارگذاری...</div>,
});

export function ObjectivesClient() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [isManageObjectiveDialogOpen, setIsManageObjectiveDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [currentObjectiveForCheckIn, setCurrentObjectiveForCheckIn] = useState<Objective | null>(null);
  const [activeCycle, setActiveCycle] = useState<OkrCycle | null>(null);
  const [allCycles, setAllCycles] = useState<OkrCycle[]>([]);
  const [isManageCycleDialogOpen, setIsManageCycleDialogOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
        const [objectivesData, teamsData, cyclesData, activeCycleData] = await Promise.all([
            getObjectives(),
            getTeams(),
            getOkrCycles(),
            getActiveOkrCycle(),
        ]);
        setObjectives(objectivesData);
        setTeams(teamsData);
        setAllCycles(cyclesData);
        setActiveCycle(activeCycleData);
    } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ variant: 'destructive', title: 'خطا در بارگذاری داده‌ها' });
    } finally {
        setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
     if (status === 'unauthenticated') {
      setIsLoadingData(false);
    }
  }, [status, fetchData]);


  const handleAddObjectiveClick = () => {
    if (!activeCycle) {
        toast({
            title: "چرخه OKR انتخاب نشده است",
            description: "لطفا ابتدا یک چرخه فعال را از طریق دکمه 'تنظیم چرخه OKR' انتخاب کنید.",
            variant: "destructive"
        });
        return;
    }
    setEditingObjective(null);
    setIsManageObjectiveDialogOpen(true);
  };

  const handleEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    setIsManageObjectiveDialogOpen(true);
  };

  const handleManageObjectiveSubmit = async (data: ObjectiveFormData) => {
    startTransition(async () => {
      try {
        await saveObjective(data);
        toast({ title: data.id ? "هدف به‌روزرسانی شد" : "هدف اضافه شد" });
        setIsManageObjectiveDialogOpen(false);
        setEditingObjective(null);
        await fetchData(); // Refresh data
      } catch (error) {
        toast({ variant: 'destructive', title: 'خطا در ذخیره هدف' });
        console.error("Save objective error:", error);
      }
    });
  };
  
  const handleOpenCheckInModal = (objective: Objective) => {
    setCurrentObjectiveForCheckIn(objective);
    setIsCheckInModalOpen(true);
  };

  const handleUpdateObjectiveAfterCheckIn = async (updatedObjectiveData: ObjectiveFormData) => {
     startTransition(async () => {
      try {
        await saveObjective(updatedObjectiveData);
        toast({ title: "ثبت پیشرفت ذخیره شد" });
        setIsCheckInModalOpen(false);
        await fetchData(); // Refresh data
      } catch (error) {
        toast({ variant: 'destructive', title: 'خطا در به‌روزرسانی هدف' });
      }
    });
  };

  const handleManageCycleSubmit = async (data: SetActiveOkrCycleFormData) => {
    startTransition(async () => {
      try {
        await setActiveOkrCycle(data.activeCycleId);
        toast({ title: "چرخه فعال OKR به‌روزرسانی شد" });
        setIsManageCycleDialogOpen(false);
        await fetchData();
      } catch (error) {
        toast({ variant: 'destructive', title: 'خطا در ذخیره چرخه' });
      }
    });
  };
  
  const teamsMap = new Map(teams.map(team => [team.id, team.name]));

  if (status === 'loading' || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-16 h-16 text-primary mb-6 animate-spin" />
        <h1 className="text-2xl font-semibold text-muted-foreground">در حال بارگذاری اطلاعات...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-semibold font-headline text-foreground">مدیریت اهداف OKR</h2>
            {activeCycle && <p className="text-muted-foreground text-sm mt-1">چرخه فعال: <span className="font-semibold text-primary">{activeCycle.name}</span></p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsManageCycleDialogOpen(true)} variant="outline">
            <Settings2 className="w-4 h-4 ml-2" />
            تنظیم چرخه OKR
          </Button>
          <Button onClick={handleAddObjectiveClick} className="bg-primary hover:bg-primary/90" disabled={teams.length === 0 || !activeCycle || isPending}>
            {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            <Plus className="w-4 h-4 ml-2" />
            افزودن هدف
          </Button>
        </div>
      </div>

       {teams.length === 0 ? (
         <div className="text-center py-10 px-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-800">ابتدا یک تیم بسازید</h3>
          <p className="text-amber-700 mt-2">برای افزودن اهداف، ابتدا باید حداقل یک تیم در بخش «مدیریت تیم‌ها» تعریف کنید.</p>
        </div>
      ) : !activeCycle ? (
        <div className="text-center py-10 px-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-800">یک چرخه OKR انتخاب کنید</h3>
          <p className="text-blue-700 mt-2">برای مشاهده و افزودن اهداف، لطفاً یک چرخه فعال را از طریق دکمه «تنظیم چرخه OKR» انتخاب کنید.</p>
        </div>
      ) : objectives.length === 0 ? (
        <EmptyState onAddObjective={handleAddObjectiveClick} />
      ) : (
        <div className="space-y-8 mt-6">
          {objectives.map(obj => (
            <ObjectiveCard
              key={obj.id}
              objective={obj}
              teamName={teamsMap.get(obj.teamId)}
              onEdit={handleEditObjective}
              onCheckIn={handleOpenCheckInModal}
            />
          ))}
        </div>
      )}
      
      {isManageObjectiveDialogOpen && activeCycle && <ManageObjectiveDialog
        isOpen={isManageObjectiveDialogOpen}
        onClose={() => { setIsManageObjectiveDialogOpen(false); setEditingObjective(null); }}
        onSubmit={handleManageObjectiveSubmit}
        initialData={editingObjective}
        teams={teams}
        cycleId={activeCycle.id}
        isSubmitting={isPending}
      />}

      {isCheckInModalOpen && currentObjectiveForCheckIn && (
        <CheckInModal
          isOpen={isCheckInModalOpen}
          onClose={() => setIsCheckInModalOpen(false)}
          objective={currentObjectiveForCheckIn}
          onUpdateObjective={handleUpdateObjectiveAfterCheckIn}
          isSubmitting={isPending}
        />
      )}

      {isManageCycleDialogOpen && <ManageOkrCycleDialog
        isOpen={isManageCycleDialogOpen}
        onClose={() => setIsManageCycleDialogOpen(false)}
        onSubmit={handleManageCycleSubmit}
        initialData={activeCycle}
        okrCycles={allCycles}
        isSubmitting={isPending}
      />}
    </>
  );
}
