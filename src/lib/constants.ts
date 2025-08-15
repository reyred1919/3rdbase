
import { Role } from "@prisma/client";

export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'AT_RISK'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export const MAPPED_CONFIDENCE_LEVELS: Record<ConfidenceLevel, string> = {
  HIGH: 'زیاد',
  MEDIUM: 'متوسط',
  LOW: 'کم',
  AT_RISK: 'در معرض خطر',
};


export const INITIATIVE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as const;
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];
export const MAPPED_INITIATIVE_STATUSES: Record<InitiativeStatus, string> = {
    NOT_STARTED: 'شروع نشده',
    IN_PROGRESS: 'در حال انجام',
    COMPLETED: 'تکمیل شده',
    BLOCKED: 'مسدود شده',
};

export const RISK_STATUSES = ['ACTIVE', 'UNDER_REVIEW', 'RESOLVED'] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];
export const MAPPED_RISK_STATUSES: Record<RiskStatus, string> = {
    ACTIVE: 'فعال',
    UNDER_REVIEW: 'در حال بررسی',
    RESOLVED: 'حل شده',
};


export const ROLES = Object.values(Role);
export type { Role };


export const DEFAULT_KEY_RESULT = { 
  description: '', 
  progress: 0, 
  confidenceLevel: 'MEDIUM' as ConfidenceLevel, 
  initiatives: [],
  risks: [],
  assignees: [],
};

export const MEETING_FREQUENCIES = [
  { label: 'هفتگی', value: 'weekly' },
  { label: 'دو هفته یکبار', value: 'bi-weekly' },
  { label: 'ماهی یکبار', value: 'monthly' },
] as const;
export type MeetingFrequencyValue = (typeof MEETING_FREQUENCIES)[number]['value'];

export const PERSIAN_WEEK_DAYS = [
  { label: 'شنبه', value: 6 },     // Corresponds to getDay() === 6 for Saturday
  { label: 'یکشنبه', value: 0 },   // Corresponds to getDay() === 0 for Sunday
  { label: 'دوشنبه', value: 1 },   // Corresponds to getDay() === 1 for Monday
  { label: 'سه‌شنبه', value: 2 },  // Corresponds to getDay() === 2 for Tuesday
  { label: 'چهارشنبه', value: 3 }, // Corresponds to getDay() === 3 for Wednesday
  { label: 'پنج‌شنبه', value: 4 }, // Corresponds to getDay() === 4 for Thursday
  // Friday is usually not a meeting day
] as const;
export type PersianWeekDayValue = (typeof PERSIAN_WEEK_DAYS)[number]['value'];
