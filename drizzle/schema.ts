import {
  integer,
  primaryKey,
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from '@auth/core/adapters';

// Users and Auth
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  username: varchar('username', { length: 50 }).notNull().unique(),
  hashedPassword: text('hashedPassword'),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);


// OKR-specific tables
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const roleEnum = pgEnum('role', ['admin', 'member']);

export const teamMemberships = pgTable('team_memberships', {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.userId, table.teamId] }),
    }
});


export const okrCycles = pgTable('okr_cycles', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    startDate: date('start_date', { mode: 'date' }).notNull(),
    endDate: date('end_date', { mode: 'date' }).notNull(),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const activeOkrCycles = pgTable('active_okr_cycles', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    cycleId: integer('cycle_id').notNull().references(() => okrCycles.id, { onDelete: 'cascade' }),
});


export const objectives = pgTable('objectives', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  cycleId: integer('cycle_id').notNull().references(() => okrCycles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const confidenceLevelEnum = pgEnum('confidence_level', ['زیاد', 'متوسط', 'کم', 'در معرض خطر']);
export const initiativeStatusEnum = pgEnum('initiative_status', ['شروع نشده', 'در حال انجام', 'تکمیل شده', 'مسدود شده']);
export const riskStatusEnum = pgEnum('risk_status', ['فعال', 'در حال بررسی', 'حل شده']);

export const keyResults = pgTable('key_results', {
  id: serial('id').primaryKey(),
  objectiveId: integer('objective_id')
    .notNull()
    .references(() => objectives.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  progress: integer('progress').notNull().default(0),
  confidenceLevel: confidenceLevelEnum('confidence_level').notNull().default('متوسط'),
});

export const initiatives = pgTable('initiatives', {
  id: serial('id').primaryKey(),
  keyResultId: integer('key_result_id')
    .notNull()
    .references(() => keyResults.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  status: initiativeStatusEnum('initiative_status').notNull().default('شروع نشده'),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  initiativeId: integer('initiative_id')
    .notNull()
    .references(() => initiatives.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  completed: boolean('completed').notNull().default(false),
});

export const risks = pgTable('risks', {
    id: serial('id').primaryKey(),
    keyResultId: integer('key_result_id').notNull().references(() => keyResults.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    correctiveAction: text('corrective_action').notNull(),
    status: riskStatusEnum('risk_status').notNull().default('فعال'),
});


export const members = pgTable('members', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
});

export const keyResultAssignees = pgTable('key_result_assignees', {
    keyResultId: integer('key_result_id').notNull().references(() => keyResults.id, { onDelete: 'cascade' }),
    memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.keyResultId, table.memberId] }),
    }
});

export const invitationLinks = pgTable('invitation_links', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').notNull().unique().references(() => teams.id, { onDelete: 'cascade' }),
    link: text('link').notNull().unique(),
    creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const calendarSettings = pgTable('calendar_settings', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
    frequency: varchar('frequency', { length: 50 }).notNull(),
    checkInDayOfWeek: integer('check_in_day_of_week').notNull(),
    evaluationDate: date('evaluation_date', { mode: 'date' }),
});

// RELATIONS
export const usersRelations = relations(users, ({ one, many }) => ({
    teams: many(teams, { relationName: 'owned_teams' }),
    teamMemberships: many(teamMemberships),
    activeOkrCycle: one(activeOkrCycles, { fields: [users.id], references: [activeOkrCycles.userId] }),
    calendarSettings: one(calendarSettings, { fields: [users.id], references: [calendarSettings.userId] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
    owner: one(users, {
        fields: [teams.ownerId],
        references: [users.id],
        relationName: 'owned_teams',
    }),
    teamMemberships: many(teamMemberships),
    objectives: many(objectives),
    members: many(members),
}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
    team: one(teams, {
        fields: [teamMemberships.teamId],
        references: [teams.id],
    }),
    user: one(users, {
        fields: [teamMemberships.userId],
        references: [users.id],
    }),
}));

export const okrCyclesRelations = relations(okrCycles, ({ one }) => ({
    owner: one(users, {
        fields: [okrCycles.ownerId],
        references: [users.id],
    }),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
    team: one(teams, {
        fields: [objectives.teamId],
        references: [teams.id],
    }),
    cycle: one(okrCycles, {
        fields: [objectives.cycleId],
        references: [okrCycles.id],
    }),
    keyResults: many(keyResults),
}));

export const keyResultsRelations = relations(keyResults, ({ one, many }) => ({
    objective: one(objectives, {
        fields: [keyResults.objectiveId],
        references: [objectives.id],
    }),
    initiatives: many(initiatives),
    risks: many(risks),
    keyResultAssignees: many(keyResultAssignees),
}));

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
    keyResult: one(keyResults, {
        fields: [initiatives.keyResultId],
        references: [keyResults.id],
    }),
    tasks: many(tasks),
}));

export const risksRelations = relations(risks, ({ one }) => ({
    keyResult: one(keyResults, {
        fields: [risks.keyResultId],
        references: [keyResults.id],
    }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    initiative: one(initiatives, {
        fields: [tasks.initiativeId],
        references: [initiatives.id],
    }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
    team: one(teams, {
        fields: [members.teamId],
        references: [teams.id],
    }),
    keyResultAssignees: many(keyResultAssignees),
}));

export const keyResultAssigneesRelations = relations(keyResultAssignees, ({ one }) => ({
    keyResult: one(keyResults, {
        fields: [keyResultAssignees.keyResultId],
        references: [keyResults.id],
    }),
    member: one(members, {
        fields: [keyResultAssignees.memberId],
        references: [members.id],
    }),
}));

export const calendarSettingsRelations = relations(calendarSettings, ({ one }) => ({
    user: one(users, {
        fields: [calendarSettings.userId],
        references: [users.id],
    }),
}));

export const activeOkrCyclesRelations = relations(activeOkrCycles, ({ one }) => ({
    user: one(users, {
        fields: [activeOkrCycles.userId],
        references: [users.id],
    }),
    cycle: one(okrCycles, {
        fields: [activeOkrCycles.cycleId],
        references: [okrCycles.id],
    }),
}));
