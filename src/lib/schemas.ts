
import { z } from 'zod';
import { CONFIDENCE_LEVELS, INITIATIVE_STATUSES, RISK_STATUSES, MEETING_FREQUENCIES, PERSIAN_WEEK_DAYS } from './constants';
import { roleEnum } from '../../drizzle/schema';

// Base ID schema for reusability
const idSchema = z.union([z.string(), z.number()]).optional();

export const memberSchema = z.object({
  id: z.union([z.string(), z.number()]), // ID can be string from form, will be number in DB
  name: z.string().min(1, "نام عضو الزامی است.").max(100, "نام عضو بیش از حد طولانی است."),
  avatarUrl: z.string().url("آدرس آواتار نامعتبر است.").optional().nullable(),
});

export const teamSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "نام تیم الزامی است.").max(100, "نام تیم بیش از حد طولانی است."),
  members: z.array(z.object({ // Simplified for form usage
      id: z.string().optional(), // field array ID from react-hook-form
      name: z.string().min(1, "نام عضو الزامی است."),
      avatarUrl: z.string().optional(),
  })).optional().default([]),
});
export type TeamFormData = z.infer<typeof teamSchema>;

export const taskSchema = z.object({
  id: idSchema,
  description: z.string().min(1, "شرح وظیفه الزامی است.").max(200, "شرح وظیفه بیش از حد طولانی است."),
  completed: z.boolean().default(false),
});
export type TaskFormData = z.infer<typeof taskSchema>;

export const initiativeSchema = z.object({
  id: idSchema,
  keyResultId: z.number().optional(),
  description: z.string().min(1, "شرح اقدام الزامی است").max(300, "شرح اقدام بیش از حد طولانی است"),
  status: z.enum(INITIATIVE_STATUSES, { required_error: "وضعیت اقدام الزامی است." }),
  tasks: z.array(taskSchema).default([]),
});
export type InitiativeFormData = z.infer<typeof initiativeSchema>;

export const riskSchema = z.object({
  id: idSchema,
  keyResultId: z.number().optional(),
  description: z.string().min(1, "شرح ریسک الزامی است.").max(300, "شرح ریسک بیش از حد طولانی است."),
  correctiveAction: z.string().min(1, "اقدام اصلاحی الزامی است.").max(300, "شرح اقدام اصلاحی بیش از حد طولانی است."),
  status: z.enum(RISK_STATUSES, { required_error: "وضعیت ریسک الزامی است." }),
});
export type RiskFormData = z.infer<typeof riskSchema>;


export const keyResultSchema = z.object({
  id: z.number().optional(),
  objectiveId: z.number().optional(),
  description: z.string().min(1, "شرح نتیجه کلیدی الزامی است").max(300, "شرح نتیجه کلیدی بیش از حد طولانی است"),
  progress: z.number().min(0).max(100).default(0).optional(),
  confidenceLevel: z.enum(CONFIDENCE_LEVELS),
  initiatives: z.array(initiativeSchema).default([]),
  risks: z.array(riskSchema).default([]),
  assignees: z.array(memberSchema).optional().default([]),
});

export const objectiveFormSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, "شرح هدف الزامی است").max(500, "شرح هدف بیش از حد طولانی است"),
  teamId: z.coerce.number({ required_error: "انتخاب تیم مسئول الزامی است.", invalid_type_error: "تیم نامعتبر است." }),
  cycleId: z.number({ required_error: "چرخه هدف‌گذاری برای این هدف مشخص نشده است." }),
  keyResults: z.array(keyResultSchema)
    .min(1, "حداقل یک نتیجه کلیدی الزامی است")
    .max(7, "حداکثر هفت نتیجه کلیدی مجاز است"),
});
export type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;


export const checkInFormSchema = z.object({
  keyResults: z.array(z.object({
    id: z.number(),
    confidenceLevel: z.enum(CONFIDENCE_LEVELS),
  }))
});
export type CheckInFormData = z.infer<typeof checkInFormSchema>;


export const newOkrCycleFormSchema = z.object({
  name: z.string().min(3, { message: "نام چرخه باید حداقل ۳ کاراکتر باشد." }),
  startDate: z.date({ required_error: "تاریخ شروع الزامی است." }),
  endDate: z.date({ required_error: "تاریخ پایان الزامی است." }),
}).refine(data => data.endDate > data.startDate, {
  message: "تاریخ پایان باید بعد از تاریخ شروع باشد.",
  path: ["endDate"],
});
export type OkrCycleFormData = z.infer<typeof newOkrCycleFormSchema>;


export const setActiveOkrCycleFormSchema = z.object({
    activeCycleId: z.coerce.number({ required_error: "انتخاب چرخه الزامی است." }),
});
export type SetActiveOkrCycleFormData = z.infer<typeof setActiveOkrCycleFormSchema>;


const meetingFrequencyValues = MEETING_FREQUENCIES.map(f => f.value) as [string, ...string[]];
const persianWeekDayValues = PERSIAN_WEEK_DAYS.map(d => d.value) as [number, ...number[]];

export const calendarSettingsSchema = z.object({
  frequency: z.enum(meetingFrequencyValues, {
    required_error: "فرکانس جلسات الزامی است.",
  }),
  checkInDayOfWeek: z.coerce.number({
    required_error: "روز جلسات هفتگی الزامی است.",
    invalid_type_error: "روز انتخاب شده برای جلسات نامعتبر است."
  }).refine(val => persianWeekDayValues.includes(val)),
  evaluationDate: z.date({
    required_error: "تاریخ جلسه ارزیابی الزامی است.",
    invalid_type_error: "تاریخ جلسه ارزیابی نامعتبر است."
  }).optional(),
});
export type CalendarSettingsFormData = z.infer<typeof calendarSettingsSchema>;
