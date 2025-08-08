
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  addMonths,
  addWeeks,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  setDay,
  startOfDay,
} from 'date-fns';
import { faIR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarDays, ListFilter, Save, CheckCircle, Star, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";

import type { OkrCycle, CalendarSettings, ScheduledMeeting } from '@/types/okr';
import { calendarSettingsSchema, type CalendarSettingsFormData } from '@/lib/schemas';
import { MEETING_FREQUENCIES, PERSIAN_WEEK_DAYS } from '@/lib/constants';
import { getActiveOkrCycle, saveCalendarSettings, getCalendarSettings } from '@/lib/data/actions';


function isPast(date: Date): boolean {
  return isBefore(endOfDay(date), startOfDay(new Date()));
}

export function CalendarView() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeCycle, setActiveCycle] = useState<OkrCycle | null>(null);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { control, handleSubmit, reset, watch, formState: { errors }, setValue } = useForm<CalendarSettingsFormData>({
    resolver: zodResolver(calendarSettingsSchema),
    defaultValues: {
      frequency: 'weekly',
      checkInDayOfWeek: 6, 
    }
  });
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [cycleData, settingsData] = await Promise.all([
          getActiveOkrCycle(),
          getCalendarSettings(),
        ]);
        
        if (cycleData) {
          setActiveCycle({
            ...cycleData,
            startDate: new Date(cycleData.startDate),
            endDate: new Date(cycleData.endDate),
          });
        }

        if (settingsData) {
          const parsedSettings = {
            ...settingsData,
            evaluationDate: settingsData.evaluationDate ? new Date(settingsData.evaluationDate) : undefined,
          };
          setCalendarSettings(parsedSettings);
          reset(parsedSettings);
        }
      } catch (error) {
        console.error("Failed to load calendar data", error);
        toast({ variant: 'destructive', title: 'خطا در بارگذاری داده‌ها' });
      } finally {
        setIsLoading(false);
        setIsMounted(true);
      }
    };

    loadData();
  }, [reset, toast]);


  const handleSaveSettings = async (data: CalendarSettingsFormData) => {
    try {
      await saveCalendarSettings(data);
      const newSettings: CalendarSettings = {
        ...data,
        evaluationDate: data.evaluationDate ? new Date(data.evaluationDate) : undefined,
      };
      setCalendarSettings(newSettings);
      toast({
        title: "تنظیمات ذخیره شد",
        description: "تنظیمات تقویم جلسات شما با موفقیت ذخیره شد.",
      });
    } catch(e) {
       toast({
        variant: "destructive",
        title: "خطا در ذخیره سازی",
        description: "مشکلی در ذخیره تنظیمات تقویم رخ داده است.",
      });
    }
  };

  const scheduledMeetings = useMemo((): ScheduledMeeting[] => {
    if (!activeCycle || !calendarSettings) return [];

    const meetings: ScheduledMeeting[] = [];
    const { startDate, endDate } = activeCycle;
    const { frequency, checkInDayOfWeek, evaluationDate } = calendarSettings;

    let currentDate = startOfDay(startDate);
    let meetingIdCounter = 0;

    if (frequency && checkInDayOfWeek !== undefined) {
      let firstCheckIn = setDay(currentDate, checkInDayOfWeek, { locale: faIR, weekStartsOn: 6 });
      if (isBefore(firstCheckIn, currentDate)) {
        firstCheckIn = addWeeks(firstCheckIn, 1);
      }

      currentDate = startOfDay(firstCheckIn);

      while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
        meetings.push({
          id: `check-in-${meetingIdCounter++}`,
          date: currentDate,
          type: 'check-in',
          title: `جلسه Check-in`,
          status: isPast(currentDate) ? 'past' : (isToday(currentDate) ? 'today' : 'future'),
        });

        let nextMeetingDateCandidate: Date | null = null;
        if (frequency === 'weekly') {
          nextMeetingDateCandidate = addWeeks(currentDate, 1);
        } else if (frequency === 'bi-weekly') {
          nextMeetingDateCandidate = addWeeks(currentDate, 2);
        } else if (frequency === 'monthly') {
          nextMeetingDateCandidate = addMonths(currentDate, 1);
        } else {
          break;
        }
        if (nextMeetingDateCandidate && (isBefore(nextMeetingDateCandidate, endDate) || isSameDay(nextMeetingDateCandidate, endDate))) {
          currentDate = startOfDay(nextMeetingDateCandidate);
        } else {
          break;
        }
      }
    }

    if (evaluationDate && (isBefore(evaluationDate, endDate) || isSameDay(evaluationDate, endDate)) && (isAfter(evaluationDate, startDate) || isSameDay(evaluationDate, startDate)) ) {
      meetings.push({
        id: 'evaluation-meeting',
        date: startOfDay(evaluationDate),
        type: 'evaluation',
        title: 'جلسه ارزیابی نهایی OKR',
        status: isPast(evaluationDate) ? 'past' : (isToday(evaluationDate) ? 'today' : 'future'),
      });
    }

    return meetings.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [activeCycle, calendarSettings]);

  if (isLoading || !isMounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-16 h-16 text-primary mb-6 animate-spin" />
        <h1 className="text-2xl font-semibold text-muted-foreground">در حال بارگذاری تقویم...</h1>
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <Image
            src="https://placehold.co/300x200.png"
            alt="تقویم خالی"
            width={300}
            height={200}
            className="mb-8 rounded-lg shadow-xl"
            data-ai-hint="تقویم هشدار"
        />
        <h1 className="text-3xl font-bold font-headline text-foreground mb-4">تقویم جلسات OKR</h1>
        <Alert variant="destructive" className="max-w-md text-center">
          <AlertTitle className="font-semibold">چرخه OKR فعال نیست</AlertTitle>
          <AlertDescription>
            برای استفاده از تقویم، ابتدا باید یک چرخه OKR در صفحه <Link href="/objectives" className="font-medium text-primary hover:underline">مدیریت اهداف</Link> فعال کنید.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <Card className="w-full md:w-1/3 lg:w-1/4 shadow-lg self-start sticky top-6">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <ListFilter className="w-6 h-6 text-primary" />
            تنظیمات جلسات OKR
          </CardTitle>
          <CardDescription>فرکانس و روز جلسات Check-in و تاریخ جلسه ارزیابی را مشخص کنید.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(handleSaveSettings)}>
          <CardContent className="space-y-6">
            <div>
              <Label className="font-medium">فرکانس جلسات Check-in</Label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="mt-2 grid grid-cols-1 gap-2"
                  >
                    {MEETING_FREQUENCIES.map((freq) => (
                      <Label key={freq.value} htmlFor={`freq-${freq.value}`} className="flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-muted/50 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                        <RadioGroupItem value={freq.value} id={`freq-${freq.value}`} />
                        <span>{freq.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
              {errors.frequency && <p className="text-destructive text-sm mt-1">{errors.frequency.message}</p>}
            </div>

            <div>
              <Label htmlFor="checkInDayOfWeek" className="font-medium">روز جلسات Check-in</Label>
              <Controller
                name="checkInDayOfWeek"
                control={control}
                render={({ field }) => (
                  <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value !== undefined ? String(field.value) : undefined}
                  >
                    <SelectTrigger id="checkInDayOfWeek" className="mt-1">
                      <SelectValue placeholder="انتخاب روز هفته" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSIAN_WEEK_DAYS.map(day => (
                        <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.checkInDayOfWeek && <p className="text-destructive text-sm mt-1">{errors.checkInDayOfWeek.message}</p>}
            </div>

            <div>
              <Label htmlFor="evaluationDate" className="font-medium">تاریخ جلسه ارزیابی نهایی</Label>
              <Controller
                name="evaluationDate"
                control={control}
                render={({ field }) => (
                   <DatePicker
                      date={field.value}
                      setDate={field.onChange}
                      placeholderText="انتخاب تاریخ ارزیابی"
                      className="mt-1"
                      disabled={(date) =>
                          !activeCycle ||
                          isBefore(date, startOfDay(activeCycle.startDate)) ||
                          isAfter(date, endOfDay(activeCycle.endDate))
                      }
                    />
                )}
              />
              {errors.evaluationDate && <p className="text-destructive text-sm mt-1">{errors.evaluationDate.message}</p>}
               <p className="text-xs text-muted-foreground mt-1">جلسه ارزیابی باید در طول چرخه OKR باشد.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 ml-2" />
              ذخیره تنظیمات
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="w-full md:w-2/3 lg:w-3/4 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            زمان‌بندی جلسات
          </CardTitle>
          {activeCycle && (
            <CardDescription>
              چرخه فعلی: {format(activeCycle.startDate, "d MMMM yyyy", { locale: faIR })} تا {format(activeCycle.endDate, "d MMMM yyyy", { locale: faIR })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {scheduledMeetings.length > 0 ? (
             <div className="space-y-4">
              {scheduledMeetings.map(meeting => {
                const isPastMeeting = meeting.status === 'past';
                const isTodayMeeting = meeting.status === 'today';
                const Icon = meeting.type === 'check-in' ? CheckCircle : Star;
                
                return (
                  <div
                    key={meeting.id}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                      isPastMeeting ? "bg-muted/50 text-muted-foreground" : "bg-card",
                      isTodayMeeting && "border-primary bg-primary/10"
                    )}
                  >
                    <Icon className={cn(
                      "h-8 w-8 flex-shrink-0",
                      isPastMeeting ? "text-muted-foreground" : (meeting.type === 'check-in' ? "text-green-500" : "text-yellow-500"),
                      isTodayMeeting && "text-primary"
                    )} />
                    <div className="flex-grow">
                      <p className={cn("font-semibold", isPastMeeting ? "text-muted-foreground" : "text-foreground")}>
                        {meeting.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(meeting.date, "eeee، d MMMM yyyy", { locale: faIR })}
                      </p>
                    </div>
                    <Badge
                      variant={isPastMeeting ? "outline" : "default"}
                      className={cn(
                        isPastMeeting && "border-gray-400",
                        isTodayMeeting && "bg-primary text-primary-foreground",
                        !isPastMeeting && !isTodayMeeting && "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {meeting.status === 'past' ? 'برگزار شده' : (meeting.status === 'today' ? 'امروز' : 'آینده')}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Image
                  src="https://placehold.co/300x200.png"
                  alt="بدون جلسه"
                  width={250}
                  height={160}
                  className="mb-6 rounded-md shadow-md mx-auto"
                  data-ai-hint="تقویم خالی یادداشت"
              />
              <p className="text-muted-foreground">هیچ جلسه‌ای برنامه‌ریزی نشده است.</p>
              <p className="text-sm text-muted-foreground mt-1">لطفاً تنظیمات جلسات را در پنل کنار مشخص کنید تا لیست جلسات ساخته شود.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
