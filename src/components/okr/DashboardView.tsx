
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Objective, OkrCycle } from '@/types/okr';
import type { ConfidenceLevel } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Clock, ArrowRight, GanttChartSquare, Smile, Meh, Frown, AlertTriangle, ChevronsRight, Loader2 } from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';
import { faIR } from 'date-fns/locale';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getObjectives, getActiveOkrCycle } from '@/lib/data/actions';

const getProgressIndicatorClass = (progress: number): string => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
};

const getProgressColorClass = (progress: number): string => {
    if (progress >= 75) return 'text-green-600';
    if (progress >= 40) return 'text-yellow-600';
    return 'text-red-600';
};

const getProgressIcon = (progress: number) => {
    const className = `w-7 h-7 flex-shrink-0 ${getProgressColorClass(progress)}`;
    if (progress >= 75) return <TrendingUp className={className} />;
    if (progress >= 40) return <ChevronsRight className={className} />;
    return <AlertTriangle className={className} />;
};


export function DashboardView() {
  const { data: session, status } = useSession();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [activeCycle, setActiveCycle] = useState<OkrCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [objectivesData, cycleData] = await Promise.all([
            getObjectives(),
            getActiveOkrCycle(),
          ]);
          setObjectives(objectivesData);
          if (cycleData) {
            setActiveCycle({
              ...cycleData,
              startDate: new Date(cycleData.startDate),
              endDate: new Date(cycleData.endDate),
            });
          }
        } catch (error) {
          console.error("Failed to load dashboard data", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
    if (status === 'unauthenticated') {
        setIsLoading(false);
    }
  }, [status]);

  const summaryStats = useMemo(() => {
    let totalProgressSum = 0;
    let totalKeyResultsCount = 0;

    const confidenceValueMapping: Record<ConfidenceLevel, number> = {
        'زیاد': 3,
        'متوسط': 2,
        'کم': 1,
        'در معرض خطر': 0,
    };
    
    const confidenceMeta: Record<ConfidenceLevel, { icon: React.ElementType, colorClass: string }> = {
        'زیاد': { icon: Smile, colorClass: 'text-green-600' },
        'متوسط': { icon: Meh, colorClass: 'text-yellow-600' },
        'کم': { icon: Frown, colorClass: 'text-orange-500' },
        'در معرض خطر': { icon: AlertTriangle, colorClass: 'text-red-600' },
    };

    const objectivesWithProgress: { id: string | number; description: string; progress: number }[] = [];
    const confidenceCounts: Record<ConfidenceLevel, number> = { 'زیاد': 0, 'متوسط': 0, 'کم': 0, 'در معرض خطر': 0 };

    objectives.forEach(obj => {
      let totalKrProgress = 0;
      let keyResultsCountInObj = obj.keyResults.length;
      
      obj.keyResults.forEach(kr => {
        totalProgressSum += kr.progress;
        totalKeyResultsCount++;
        confidenceCounts[kr.confidenceLevel]++;
        totalKrProgress += kr.progress;
      });
      
      const objectiveProgress = keyResultsCountInObj > 0 ? totalKrProgress / keyResultsCountInObj : 0;
      objectivesWithProgress.push({
        id: obj.id,
        description: obj.description,
        progress: Math.round(objectiveProgress),
      });
    });

    const averageProgress = totalKeyResultsCount > 0 ? totalProgressSum / totalKeyResultsCount : 0;

    let remainingDays: number | null = null;
    let cycleElapsedPercentage: number = 0;
    if (activeCycle && activeCycle.startDate && activeCycle.endDate) {
      const today = new Date(); today.setHours(0,0,0,0);
      const cycleEndDate = new Date(activeCycle.endDate); cycleEndDate.setHours(0,0,0,0);
      const cycleStartDate = new Date(activeCycle.startDate); cycleStartDate.setHours(0,0,0,0);

      remainingDays = differenceInCalendarDays(cycleEndDate, today);
      if (remainingDays < 0) remainingDays = 0;

      const totalCycleDuration = differenceInCalendarDays(cycleEndDate, cycleStartDate);
      if (totalCycleDuration > 0) {
        const elapsedCycleDuration = differenceInCalendarDays(today, cycleStartDate);
        cycleElapsedPercentage = Math.min(100, Math.max(0, (elapsedCycleDuration / totalCycleDuration) * 100));
      } else if (today >= cycleEndDate) {
        cycleElapsedPercentage = 100;
      }
    }
    
    let dominantConfidence: ConfidenceLevel = 'متوسط';
    if(totalKeyResultsCount > 0) {
        dominantConfidence = (Object.keys(confidenceCounts) as ConfidenceLevel[]).reduce((a, b) => confidenceCounts[a] > confidenceCounts[b] ? a : b);
    }
    const dominantConfidenceMeta = confidenceMeta[dominantConfidence];


    return {
      totalObjectives: objectives.length,
      totalKeyResults: totalKeyResultsCount,
      averageProgress: parseFloat(averageProgress.toFixed(1)),
      remainingDays,
      cycleElapsedPercentage: Math.round(cycleElapsedPercentage),
      cycleDates: activeCycle ? { 
        start: format(activeCycle.startDate, "d MMMM", { locale: faIR }), 
        end: format(activeCycle.endDate, "d MMMM yyyy", { locale: faIR }) 
      } : null,
      cycleName: activeCycle?.name,
      dominantConfidence: {
        label: dominantConfidence,
        Icon: dominantConfidenceMeta.icon,
        colorClass: dominantConfidenceMeta.colorClass
      },
      objectivesWithProgress,
    };
  }, [objectives, activeCycle]);

  if (isLoading || status === 'loading') {
     return (
       <div className="flex flex-col items-center justify-center h-[60vh]">
         <Loader2 className="w-16 h-16 text-primary mb-6 animate-spin" />
         <h1 className="text-2xl font-semibold text-muted-foreground">در حال بارگذاری داشبورد...</h1>
       </div>
     );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-semibold font-headline text-foreground">داشبورد خلاصه وضعیت OKR</h2>
            {summaryStats.cycleName ? 
              <p className="text-muted-foreground text-sm mt-1">نمایش داده‌ها برای چرخه: <span className="font-semibold text-primary">{summaryStats.cycleName}</span></p>
              : <p className="text-destructive text-sm mt-1">هیچ چرخه فعالی انتخاب نشده است. لطفاً از صفحه مدیریت اهداف یک چرخه را فعال کنید.</p>
            }
        </div>
        <Button asChild>
          <Link href="/objectives">
            مدیریت اهداف
            <ArrowRight className="w-4 h-4 mr-2" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">خلاصه اهداف و نتایج</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="flex items-end gap-4 pt-2">
                <div>
                    <div className="text-2xl font-bold">{summaryStats.totalObjectives}</div>
                    <p className="text-xs text-muted-foreground">اهداف</p>
                </div>
                <div className="h-8 w-px bg-border self-center"></div>
                <div>
                    <div className="text-2xl font-bold">{summaryStats.totalKeyResults}</div>
                    <p className="text-xs text-muted-foreground">نتایج کلیدی</p>
                </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">میانگین پیشرفت کل</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.averageProgress}%</div>
            <Progress value={summaryStats.averageProgress} className="h-2 mt-2" indicatorClassName={getProgressIndicatorClass(summaryStats.averageProgress)} />
          </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">سطح اطمینان غالب</CardTitle>
                {summaryStats.dominantConfidence && <summaryStats.dominantConfidence.Icon className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${summaryStats.dominantConfidence?.colorClass}`}>
                    {summaryStats.dominantConfidence?.label}
                </div>
                <p className="text-xs text-muted-foreground">بر اساس ارزیابی‌های نتایج کلیدی</p>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">نمای زمانی چرخه</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
                <div className="text-lg font-bold">
                    {summaryStats.remainingDays !== null ? `${summaryStats.remainingDays} روز` : 'نامشخص'}
                </div>
                <div className="text-sm text-muted-foreground">
                    {summaryStats.remainingDays !== null ? 'باقیمانده' : 'چرخه تنظیم نشده'}
                </div>
            </div>
            {summaryStats.cycleDates && (
                 <>
                    <Progress value={summaryStats.cycleElapsedPercentage} className="h-2 my-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>شروع: {summaryStats.cycleDates.start}</span>
                        <span>پایان: {summaryStats.cycleDates.end}</span>
                    </div>
                </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2"><GanttChartSquare className="w-5 h-5 text-primary"/> نمای کلی پیشرفت اهداف</CardTitle>
            <CardDescription>پیشرفت هر هدف بر اساس میانگین پیشرفت نتایج کلیدی آن محاسبه شده است.</CardDescription>
        </CardHeader>
        <CardContent>
            {summaryStats.objectivesWithProgress.length > 0 ? (
                <div className="space-y-4">
                    {summaryStats.objectivesWithProgress.map(obj => (
                        <div key={obj.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors duration-200">
                            {getProgressIcon(obj.progress)}
                            <div className="flex-grow">
                                <p className="font-medium text-foreground truncate mb-1.5">{obj.description}</p>
                                <Progress value={obj.progress} className="h-2.5" indicatorClassName={getProgressIndicatorClass(obj.progress)} />
                            </div>
                            <span className={`text-xl font-bold w-16 text-right ${getProgressColorClass(obj.progress)}`}>{obj.progress}%</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">هنوز هدفی برای این چرخه تعریف نشده است.</p>
                    <Button asChild variant="link" className="mt-2">
                        <Link href="/objectives">همین حالا یک هدف اضافه کنید</Link>
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
