
import type { z } from 'zod';
import type { objectiveFormSchema, teamSchema, memberSchema, initiativeSchema, taskSchema, newOkrCycleFormSchema, calendarSettingsSchema, riskSchema, setActiveOkrCycleFormSchema } from '@/lib/schemas';
import type { Role, ConfidenceLevel, InitiativeStatus, RiskStatus, MeetingFrequencyValue } from './constants';
import type { User as PrismaUser, Team as PrismaTeam, Member as PrismaMember, OkrCycle as PrismaOkrCycle, Initiative as PrismaInitiative, KeyResult as PrismaKeyResult, Objective as PrismaObjective, Risk as PrismaRisk, Task as PrismaTask, CalendarSettings as PrismaCalendarSettings } from '@prisma/client';

export type { Role, ConfidenceLevel, InitiativeStatus, RiskStatus, MeetingFrequencyValue };

// Re-exporting Prisma types for consistency
export type User = PrismaUser;
export type Team = PrismaTeam;
export type Member = PrismaMember;
export type OkrCycle = PrismaOkrCycle;
export type Initiative = PrismaInitiative & { tasks: Task[] };
export type KeyResult = PrismaKeyResult & { initiatives: Initiative[], risks: Risk[], assignees: Member[] };
export type Objective = PrismaObjective & { keyResults: KeyResult[] };
export type Risk = PrismaRisk;
export type Task = PrismaTask;
export type CalendarSettings = PrismaCalendarSettings;


export interface TeamWithMembership extends Team {
    role: Role;
    invitationLink?: string | null;
    members: Member[];
    owner: {
        firstName: string | null;
        lastName: string | null;
    }
}

// Form-specific types inferred from Zod schemas
export type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;
export type TeamFormData = z.infer<typeof teamSchema>;
export type MemberFormData = z.infer<typeof memberSchema>;
export type InitiativeFormData = z.infer<typeof initiativeSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type RiskFormData = z.infer<typeof riskSchema>;
export type OkrCycleFormData = z.infer<typeof newOkrCycleFormSchema>;
export type SetActiveOkrCycleFormData = z.infer<typeof setActiveOkrCycleFormSchema>;
export type CalendarSettingsFormData = z.infer<typeof calendarSettingsSchema>;


// UI-specific types
export interface ScheduledMeeting {
    id: string;
    date: Date;
    type: 'check-in' | 'evaluation';
    title: string;
    status: 'past' | 'today' | 'future';
}
