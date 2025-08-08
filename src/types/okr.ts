
import type { z } from 'zod';
import type { objectiveFormSchema, teamSchema, memberSchema, initiativeSchema, taskSchema, newOkrCycleFormSchema, calendarSettingsSchema, riskSchema, setActiveOkrCycleFormSchema } from '@/lib/schemas';
import { roleEnum } from '../../drizzle/schema';
import type { ConfidenceLevel, InitiativeStatus, RiskStatus, MeetingFrequencyValue } from './constants';

export type Role = z.infer<typeof roleEnum>;

// DB-like types
export interface Member {
  id: number;
  name: string;
  avatarUrl?: string | null;
  teamId: number;
}

export interface Team {
  id: number;
  name: string;
  ownerId: string;
  invitationLink?: string | null;
  members: Member[];
  createdAt: Date;
}

export interface TeamWithMembership extends Team {
    role: Role;
}


export interface Task {
  id: number | string;
  initiativeId: number;
  description: string;
  completed: boolean;
}

export interface Initiative {
  id: number | string;
  keyResultId: number;
  description: string;
  status: InitiativeStatus;
  tasks: Task[];
}

export interface Risk {
    id: number | string;
    keyResultId: number;
    description: string;
    correctiveAction: string;
    status: RiskStatus;
}

export interface KeyResult {
  id: number;
  objectiveId: number;
  description: string;
  progress: number;
  confidenceLevel: ConfidenceLevel;
  initiatives: Initiative[];
  risks: Risk[];
  assignees: Member[];
}

export interface Objective {
  id: number;
  description: string;
  keyResults: KeyResult[];
  teamId: number;
  cycleId: number;
  createdAt: Date;
}

export type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;
export type TeamFormData = z.infer<typeof teamSchema>;
export type MemberFormData = z.infer<typeof memberSchema>;
export type InitiativeFormData = z.infer<typeof initiativeSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type RiskFormData = z.infer<typeof riskSchema>;

// Calendar specific types
export interface OkrCycle {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
}

export type OkrCycleFormData = z.infer<typeof newOkrCycleFormSchema>;
export type SetActiveOkrCycleFormData = z.infer<typeof setActiveOkrCycleFormSchema>;


export interface CalendarSettings {
  frequency: MeetingFrequencyValue;
  checkInDayOfWeek: number;
  evaluationDate?: Date;
}

export type CalendarSettingsFormData = z.infer<typeof calendarSettingsSchema>;


export interface ScheduledMeeting {
    id: string;
    date: Date;
    type: 'check-in' | 'evaluation';
    title: string;
    status: 'past' | 'today' | 'future';
}
