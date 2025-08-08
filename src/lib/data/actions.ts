
'use server';

import { db } from '@/lib/db';
import * as schema from '../../../drizzle/schema';
import { auth } from '@/lib/auth';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import type { Objective, Team, OkrCycle, ObjectiveFormData, TeamFormData, CalendarSettings, CalendarSettingsFormData, TeamWithMembership, Member, KeyResult, OkrCycleFormData } from '@/types/okr';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

async function getUserIdOrThrow(): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Not authenticated');
    }
    return session.user.id;
}


// --- Objective, KR, Initiative, Task, Risk ---
// A comprehensive function to retrieve a single objective with all its nested relations
async function getObjectiveById(objectiveId: number): Promise<Objective> {
    const objectiveRecord = await db.query.objectives.findFirst({
        where: eq(schema.objectives.id, objectiveId),
        with: {
            keyResults: {
                with: {
                    initiatives: { with: { tasks: true } },
                    risks: true,
                    keyResultAssignees: { with: { member: true } }
                }
            }
        }
    });

    if (!objectiveRecord) throw new Error("Objective not found");

    return {
        ...objectiveRecord,
        keyResults: objectiveRecord.keyResults.map(kr => ({
            ...kr,
            assignees: kr.keyResultAssignees.map(kra => kra.member)
        }))
    };
}


export async function getObjectives(): Promise<Objective[]> {
    const userId = await getUserIdOrThrow();
    
    // Find the active cycle for the user
    const activeCycle = await db.query.activeOkrCycles.findFirst({
        where: eq(schema.activeOkrCycles.userId, userId),
        columns: { cycleId: true }
    });

    if (!activeCycle) {
        return []; // No active cycle, no objectives to show
    }

    const teamMemberships = await db.query.teamMemberships.findMany({
        where: eq(schema.teamMemberships.userId, userId),
        columns: { teamId: true }
    });

    const teamIds = teamMemberships.map(tm => tm.teamId);

    if (teamIds.length === 0) {
        return [];
    }

    const objectiveRecords = await db.query.objectives.findMany({
        where: and(
            eq(schema.objectives.cycleId, activeCycle.cycleId),
            inArray(schema.objectives.teamId, teamIds)
        ),
        with: {
            keyResults: {
                with: {
                    initiatives: { with: { tasks: true }, orderBy: (initiatives, { asc }) => [asc(initiatives.id)] },
                    risks: { orderBy: (risks, { asc }) => [asc(risks.id)] },
                    keyResultAssignees: { with: { member: true } }
                },
                orderBy: (keyResults, { asc }) => [asc(keyResults.id)],
            }
        },
        orderBy: (objectives, { desc }) => [desc(objectives.createdAt)],
    });

    return objectiveRecords.map(obj => ({
        ...obj,
        keyResults: obj.keyResults.map(kr => ({
            ...kr,
            assignees: kr.keyResultAssignees.map(kra => kra.member)
        }))
    }));
}


export async function saveObjective(data: ObjectiveFormData): Promise<Objective> {
    const userId = await getUserIdOrThrow();

    const savedObjectiveId = await db.transaction(async (tx) => {
        let currentObjectiveId: number;

        if (data.id) { // UPDATE
            const [updatedObjective] = await tx.update(schema.objectives)
                .set({ description: data.description, teamId: data.teamId, cycleId: data.cycleId })
                .where(eq(schema.objectives.id, data.id))
                .returning({ id: schema.objectives.id });
            currentObjectiveId = updatedObjective.id;
        } else { // CREATE
            const [newObjective] = await tx.insert(schema.objectives)
                .values({ description: data.description, teamId: data.teamId, cycleId: data.cycleId })
                .returning({ id: schema.objectives.id });
            currentObjectiveId = newObjective.id;
        }

        const existingKrs = await tx.query.keyResults.findMany({ where: eq(schema.keyResults.objectiveId, currentObjectiveId), columns: { id: true } });
        const existingKrIds = existingKrs.map(kr => kr.id);
        const incomingKrIds = data.keyResults.filter(kr => kr.id).map(kr => kr.id as number);
        const krsToDelete = existingKrIds.filter(id => !incomingKrIds.includes(id));
        if (krsToDelete.length > 0) {
            await tx.delete(schema.keyResults).where(inArray(schema.keyResults.id, krsToDelete));
        }

        for (const krData of data.keyResults) {
            await saveKeyResult(tx, { ...krData, objectiveId: currentObjectiveId });
        }
        
        return currentObjectiveId;
    });

    revalidatePath('/objectives');
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
    
    return getObjectiveById(savedObjectiveId);
}

// Helper for saving a key result and its children within a transaction
async function saveKeyResult(tx: any, krData: KeyResult & { objectiveId: number }) {
    let currentKrId: number;
    const krRecord = {
        objectiveId: krData.objectiveId,
        description: krData.description,
        confidenceLevel: krData.confidenceLevel,
        progress: calculateKrProgress(krData),
    };

    if (krData.id) {
        await tx.update(schema.keyResults).set(krRecord).where(eq(schema.keyResults.id, krData.id));
        currentKrId = krData.id;
    } else {
        const [newKr] = await tx.insert(schema.keyResults).values(krRecord).returning({ id: schema.keyResults.id });
        currentKrId = newKr.id;
    }

    // Sync assignees
    await tx.delete(schema.keyResultAssignees).where(eq(schema.keyResultAssignees.keyResultId, currentKrId));
    if (krData.assignees && krData.assignees.length > 0) {
        await tx.insert(schema.keyResultAssignees).values(krData.assignees.map((a: Member) => ({
            keyResultId: currentKrId,
            memberId: a.id
        })));
    }
    
    // Sync initiatives
    const existingInitiatives = await tx.query.initiatives.findMany({ where: eq(schema.initiatives.keyResultId, currentKrId), columns: { id: true } });
    const existingInitIds = existingInitiatives.map(i => i.id);
    const incomingInitIds = krData.initiatives.filter(i => i.id).map(i => i.id as number);
    const initsToDelete = existingInitIds.filter(id => !incomingInitIds.includes(id));
    if (initsToDelete.length > 0) {
        await tx.delete(schema.initiatives).where(inArray(schema.initiatives.id, initsToDelete));
    }
    
    for (const initiativeData of krData.initiatives) {
        let currentInitId: number;
        const initRecord = { keyResultId: currentKrId, description: initiativeData.description, status: initiativeData.status };

        if (initiativeData.id) {
            await tx.update(schema.initiatives).set(initRecord).where(eq(schema.initiatives.id, initiativeData.id));
            currentInitId = initiativeData.id as number;
        } else {
            const [newInit] = await tx.insert(schema.initiatives).values(initRecord).returning({ id: schema.initiatives.id });
            currentInitId = newInit.id;
        }

        // Sync tasks
        await tx.delete(schema.tasks).where(eq(schema.tasks.initiativeId, currentInitId));
        if (initiativeData.tasks && initiativeData.tasks.length > 0) {
            await tx.insert(schema.tasks).values(initiativeData.tasks.map(t => ({ initiativeId: currentInitId, description: t.description, completed: t.completed })));
        }
    }

     // Sync risks
    const existingRisks = await tx.query.risks.findMany({ where: eq(schema.risks.keyResultId, currentKrId), columns: { id: true } });
    const existingRiskIds = existingRisks.map(r => r.id);
    const incomingRiskIds = krData.risks.filter(r => r.id).map(r => r.id as number);
    const risksToDelete = existingRiskIds.filter(id => !incomingRiskIds.includes(id));
    if (risksToDelete.length > 0) {
        await tx.delete(schema.risks).where(inArray(schema.risks.id, risksToDelete));
    }

    for (const riskData of krData.risks) {
        const riskRecord = { keyResultId: currentKrId, description: riskData.description, correctiveAction: riskData.correctiveAction, status: riskData.status };
        if (riskData.id) {
            await tx.update(schema.risks).set(riskRecord).where(eq(schema.risks.id, riskData.id));
        } else {
            await tx.insert(schema.risks).values(riskRecord);
        }
    }
}

function calculateKrProgress(krData: KeyResult): number {
    if (!krData.initiatives || krData.initiatives.length === 0) {
        return krData.progress || 0;
    }
    const totalInitiativeProgress = krData.initiatives.reduce((sum, init) => {
        const totalTasks = init.tasks.length;
        if (totalTasks === 0) return sum;
        const completedTasks = init.tasks.filter(t => t.completed).length;
        return sum + (completedTasks / totalTasks);
    }, 0);
    return Math.round((totalInitiativeProgress / krData.initiatives.length) * 100);
}


export async function deleteObjective(objectiveId: number): Promise<void> {
    await db.delete(schema.objectives).where(eq(schema.objectives.id, objectiveId));
    revalidatePath('/objectives');
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
}


// --- Teams ---
export async function getTeams(): Promise<TeamWithMembership[]> {
    const userId = await getUserIdOrThrow();
    const teamMemberships = await db.query.teamMemberships.findMany({
        where: eq(schema.teamMemberships.userId, userId),
        with: {
            team: {
                with: {
                    members: true,
                    owner: { columns: { name: true } },
                    invitationLink: true,
                }
            }
        },
        orderBy: (tm, { asc }) => [asc(tm.teamId)],
    });
    
    return teamMemberships.map(tm => ({
        ...tm.team,
        role: tm.role,
        invitationLink: tm.team.invitationLink?.link
    }));
}

export async function addTeam(teamData: { name: string }, ownerId: string) {
    await db.transaction(async (tx) => {
        const [newTeam] = await tx.insert(schema.teams)
            .values({ name: teamData.name, ownerId })
            .returning();
        
        await tx.insert(schema.teamMemberships).values({
            teamId: newTeam.id,
            userId: ownerId,
            role: 'admin',
        });

         await tx.insert(schema.invitationLinks).values({
            teamId: newTeam.id,
            link: `${process.env.NEXTAUTH_URL}/teams/join/${crypto.randomUUID()}`,
            creatorId: ownerId,
        });

    });
    revalidatePath('/teams');
}


export async function updateTeam(teamData: Team) {
     await db.transaction(async (tx) => {
        await tx.update(schema.teams)
            .set({ name: teamData.name })
            .where(eq(schema.teams.id, teamData.id));

        // Get current members to avoid deleting and re-inserting unchanged members
        const currentMembers = await tx.query.members.findMany({ where: eq(schema.members.teamId, teamData.id) });
        const currentMemberNames = new Set(currentMembers.map(m => m.name));
        const incomingMemberNames = new Set(teamData.members.map(m => m.name));

        // Delete members that are no longer in the list
        const membersToDelete = currentMembers.filter(m => !incomingMemberNames.has(m.name));
        if (membersToDelete.length > 0) {
            await tx.delete(schema.members).where(inArray(schema.members.id, membersToDelete.map(m => m.id)));
        }

        // Add new members
        const membersToAdd = teamData.members.filter(m => !currentMemberNames.has(m.name));
         if (membersToAdd.length > 0) {
            await tx.insert(schema.members).values(
                membersToAdd.map(m => ({
                    teamId: teamData.id,
                    name: m.name,
                    avatarUrl: m.avatarUrl || `https://placehold.co/40x40.png?text=${m.name.charAt(0)}`,
                }))
            );
        }
    });
    revalidatePath('/teams');
}

export async function deleteTeam(teamId: number): Promise<{ success: boolean, message?: string }> {
    const assignedObjectivesCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.objectives)
        .where(eq(schema.objectives.teamId, teamId));
    
    const assignedCount = assignedObjectivesCountResult[0]?.count ?? 0;
    
    if (assignedCount > 0) {
        return { success: false, message: 'این تیم به یک یا چند هدف اختصاص داده شده و قابل حذف نیست.' };
    }

    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
    revalidatePath('/teams');
    return { success: true };
}


// --- OKR Cycles ---
export async function getOkrCycles(): Promise<OkrCycle[]> {
    const userId = await getUserIdOrThrow();
    return db.query.okrCycles.findMany({
        where: eq(schema.okrCycles.ownerId, userId),
        orderBy: desc(schema.okrCycles.startDate)
    });
}

export async function createOkrCycle(data: OkrCycleFormData) {
    const userId = await getUserIdOrThrow();
    await db.insert(schema.okrCycles).values({ ...data, ownerId: userId });
    revalidatePath('/cycles');
}

export async function updateOkrCycle(data: OkrCycle) {
    await db.update(schema.okrCycles)
        .set({ name: data.name, startDate: data.startDate, endDate: data.endDate })
        .where(eq(schema.okrCycles.id, data.id));
    revalidatePath('/cycles');
}

export async function deleteOkrCycle(cycleId: number) {
    // Optional: Check if cycle is linked to objectives before deleting
    const linkedObjectives = await db.query.objectives.findFirst({
        where: eq(schema.objectives.cycleId, cycleId)
    });

    if (linkedObjectives) {
        throw new Error("Cannot delete cycle with active objectives.");
    }
    
    await db.delete(schema.okrCycles).where(eq(schema.okrCycles.id, cycleId));
    revalidatePath('/cycles');
}


export async function getActiveOkrCycle(): Promise<OkrCycle | null> {
    const userId = await getUserIdOrThrow();
    const activeCycleInfo = await db.query.activeOkrCycles.findFirst({
        where: eq(schema.activeOkrCycles.userId, userId),
        with: { cycle: true }
    });
    return activeCycleInfo?.cycle ?? null;
}

export async function setActiveOkrCycle(cycleId: number) {
    const userId = await getUserIdOrThrow();
    await db.insert(schema.activeOkrCycles)
        .values({ userId, cycleId })
        .onConflictDoUpdate({
            target: schema.activeOkrCycles.userId,
            set: { cycleId: cycleId }
        });

    revalidatePath('/dashboard');
    revalidatePath('/objectives');
}


// --- Calendar ---
export async function saveCalendarSettings(data: CalendarSettingsFormData): Promise<void> {
    const userId = await getUserIdOrThrow();

    const dataToSave = {
        userId,
        frequency: data.frequency,
        checkInDayOfWeek: data.checkInDayOfWeek,
        evaluationDate: data.evaluationDate,
    };
    
    await db.insert(schema.calendarSettings)
        .values(dataToSave)
        .onConflictDoUpdate({
            target: schema.calendarSettings.userId,
            set: dataToSave
        });
    revalidatePath('/calendar');
}

export async function getCalendarSettings(): Promise<CalendarSettings | null> {
    const userId = await getUserIdOrThrow();
    const settings = await db.query.calendarSettings.findFirst({ where: eq(schema.calendarSettings.userId, userId) });
    if (!settings) return null;
    return {
        ...settings,
        evaluationDate: settings.evaluationDate ? new Date(settings.evaluationDate) : undefined
    };
}


// --- AI Suggestions ---
export { getOkrImprovementSuggestionsAction } from '@/lib/actions';


