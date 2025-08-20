
'use server';

import { db } from '@/lib/db';
import { auth } from '../../../auth';
import type { Objective, Team, OkrCycle, ObjectiveFormData, TeamFormData, CalendarSettings, CalendarSettingsFormData, TeamWithMembership, Member, KeyResult, OkrCycleFormData, User } from '@/types/okr';
import { revalidatePath } from 'next/cache';
import { suggestOkrsImprovements } from '@/ai/flows/suggest-okr-improvements';
import { Prisma } from '@prisma/client';

async function getUserIdOrThrow(): Promise<string> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId || isNaN(parseInt(userId))) {
        throw new Error('Not authenticated or user ID is invalid');
    }
    return userId;
}

// --- User ---
export async function getUserByUsername(username: string): Promise<User | null> {
    try {
        const user = await db.user.findUnique({
            where: { username },
        });
        return user;
    } catch (error) {
        console.error("Error fetching user by username:", error);
        return null;
    }
}


// --- Objective, KR, Initiative, Task, Risk ---
async function getObjectiveById(objectiveId: number): Promise<Objective> {
    const objectiveRecord = await db.objective.findUnique({
        where: { id: objectiveId },
        include: {
            keyResults: {
                include: {
                    initiatives: { include: { tasks: true } },
                    risks: true,
                    assignees: { include: { member: true } }
                }
            }
        }
    });

    if (!objectiveRecord) throw new Error("Objective not found");

    return {
        ...objectiveRecord,
        keyResults: objectiveRecord.keyResults.map(kr => ({
            ...kr,
            assignees: kr.assignees.map(kra => kra.member)
        }))
    };
}


export async function getObjectives(): Promise<Objective[]> {
    const userId = parseInt(await getUserIdOrThrow());
    
    const activeCycle = await db.activeOkrCycle.findUnique({
        where: { userId },
        select: { cycleId: true }
    });

    if (!activeCycle) {
        return [];
    }

    const teamMemberships = await db.teamMembership.findMany({
        where: { userId },
        select: { teamId: true }
    });

    const teamIds = teamMemberships.map(tm => tm.teamId);

    if (teamIds.length === 0) {
        return [];
    }

    const objectiveRecords = await db.objective.findMany({
        where: {
            cycleId: activeCycle.cycleId,
            teamId: { in: teamIds }
        },
        include: {
            keyResults: {
                orderBy: { id: 'asc' },
                include: {
                    initiatives: { orderBy: { id: 'asc' }, include: { tasks: { orderBy: { id: 'asc' } } } },
                    risks: { orderBy: { id: 'asc' } },
                    assignees: { include: { member: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
    });

    return objectiveRecords.map(obj => ({
        ...obj,
        keyResults: obj.keyResults.map(kr => ({
            ...kr,
            assignees: kr.assignees.map(kra => kra.member)
        }))
    }));
}


export async function saveObjective(data: ObjectiveFormData): Promise<Objective> {
    await getUserIdOrThrow();

    if (!data.cycleId) {
        throw new Error("Cycle ID is required to save an objective.");
    }

    const objectiveData = {
        description: data.description,
        teamId: data.teamId,
        cycleId: data.cycleId
    };

    const keyResultsData = data.keyResults.map(kr => {
        const calculatedProgress = calculateKrProgress(kr as KeyResult);
        return {
            id: kr.id,
            description: kr.description,
            confidenceLevel: kr.confidenceLevel,
            progress: calculatedProgress,
            assignees: {
                deleteMany: {}, // Clear existing assignees
                create: (kr.assignees || []).map(a => ({
                    member: { connect: { id: a.id } }
                }))
            },
            initiatives: {
                upsert: (kr.initiatives || []).map(init => ({
                    where: { id: init.id || -1 },
                    update: {
                        description: init.description,
                        status: init.status,
                        tasks: {
                           deleteMany: {},
                           create: (init.tasks || []).map(t => ({ description: t.description, completed: t.completed }))
                        }
                    },
                    create: {
                        description: init.description,
                        status: init.status,
                        tasks: {
                           create: (init.tasks || []).map(t => ({ description: t.description, completed: t.completed }))
                        }
                    }
                }))
            },
            risks: {
                upsert: (kr.risks || []).map(risk => ({
                    where: { id: risk.id || -1 },
                    update: {
                        description: risk.description,
                        correctiveAction: risk.correctiveAction,
                        status: risk.status
                    },
                    create: {
                        description: risk.description,
                        correctiveAction: risk.correctiveAction,
                        status: risk.status
                    }
                }))
            }
        };
    });

    const savedObjective = await db.objective.upsert({
        where: { id: data.id || -1 },
        update: {
            ...objectiveData,
            keyResults: {
                deleteMany: {
                    id: { notIn: keyResultsData.filter(kr => kr.id).map(kr => kr.id!) }
                },
                upsert: keyResultsData.map(kr => ({
                    where: { id: kr.id || -1 },
                    update: { ...kr, id: undefined },
                    create: { ...kr, id: undefined }
                }))
            }
        },
        create: {
            ...objectiveData,
            keyResults: {
                create: keyResultsData.map(kr => ({ ...kr, id: undefined }))
            }
        }
    });

    revalidatePath('/objectives');
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
    
    return getObjectiveById(savedObjective.id);
}


function calculateKrProgress(krData: KeyResult): number {
    if (!krData.initiatives || krData.initiatives.length === 0) {
        return krData.progress || 0;
    }
    const totalInitiativeProgress = krData.initiatives.reduce((sum, init) => {
        if (!init.tasks || init.tasks.length === 0) return sum;
        const completedTasks = init.tasks.filter(t => t.completed).length;
        return sum + (completedTasks / init.tasks.length);
    }, 0);
    return Math.round((totalInitiativeProgress / krData.initiatives.length) * 100);
}


export async function deleteObjective(objectiveId: number): Promise<void> {
    await getUserIdOrThrow();
    await db.objective.delete({ where: { id: objectiveId }});
    revalidatePath('/objectives');
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
}


// --- Teams ---
export async function getTeams(): Promise<TeamWithMembership[]> {
    const userId = parseInt(await getUserIdOrThrow());
    const teamMemberships = await db.teamMembership.findMany({
        where: { userId },
        include: {
            team: {
                include: {
                    members: true,
                    owner: { select: { firstName: true, lastName: true } },
                    invitations: { 
                        take: 1,
                        orderBy: { createdAt: 'desc' }
                    },
                }
            }
        },
        orderBy: { team: { createdAt: 'asc'} },
    });
    
    return teamMemberships.map(tm => ({
        ...tm.team,
        role: tm.role,
        invitationLink: tm.team.invitations[0]?.code,
        ownerName: tm.team.owner ? `${tm.team.owner.firstName} ${tm.team.owner.lastName}`.trim() : 'Unknown',
    }));
}

export async function addTeam(teamData: TeamFormData) {
    const userId = parseInt(await getUserIdOrThrow());

    const uniqueCode = `${teamData.name.replace(/\s+/g, '-').slice(0, 10)}-${crypto.randomUUID().slice(0, 4)}`.toUpperCase();

    await db.team.create({
        data: {
            name: teamData.name,
            ownerId: userId,
            memberships: {
                create: { userId: userId, role: 'admin' }
            },
            members: {
                create: (teamData.members || []).map(m => ({
                    name: m.name,
                    avatarUrl: m.avatarUrl || `https://placehold.co/40x40.png?text=${m.name.charAt(0)}`,
                }))
            },
            invitations: {
                create: {
                    code: uniqueCode,
                    creatorId: userId,
                }
            }
        }
    });
    revalidatePath('/teams');
}


export async function updateTeam(teamData: TeamFormData) {
    await getUserIdOrThrow();
    const teamId = teamData.id;
    if (!teamId) throw new Error("Team ID is required for update.");

    const currentMembers = await db.member.findMany({ where: { teamId } });
    const incomingMembers = teamData.members || [];
    
    const memberIdsToDelete = currentMembers
        .filter(cm => !incomingMembers.some(im => im.id === cm.id.toString()))
        .map(m => m.id);
        
    const membersToUpsert = incomingMembers.map(m => ({
        where: { id: parseInt(m.id || '-1', 10) },
        update: { name: m.name },
        create: { name: m.name, teamId, avatarUrl: m.avatarUrl || `https://placehold.co/40x40.png?text=${m.name.charAt(0)}` }
    }));

    await db.team.update({
        where: { id: teamId },
        data: {
            name: teamData.name,
            members: {
                deleteMany: { id: { in: memberIdsToDelete } },
                upsert: membersToUpsert,
            }
        }
    });

    revalidatePath('/teams');
}

export async function deleteTeam(teamId: number): Promise<{ success: boolean, message?: string }> {
    await getUserIdOrThrow();
    const assignedObjectivesCount = await db.objective.count({
        where: { teamId: teamId }
    });
    
    if (assignedObjectivesCount > 0) {
        return { success: false, message: 'این تیم به یک یا چند هدف اختصاص داده شده و قابل حذف نیست.' };
    }

    await db.team.delete({ where: { id: teamId }});
    revalidatePath('/teams');
    return { success: true };
}


// --- OKR Cycles ---
export async function getOkrCycles(): Promise<OkrCycle[]> {
    const userId = parseInt(await getUserIdOrThrow());
    // In a multi-tenant system, this would be filtered by the user's organization.
    // For this app, we assume cycles are owned by users.
    const userCycles = await db.okrCycle.findMany({
         where: { ownerId: userId },
         orderBy: { startDate: 'desc' }
    });
    return userCycles;
}

export async function createOkrCycle(data: OkrCycleFormData) {
    const userId = parseInt(await getUserIdOrThrow());
    await db.okrCycle.create({ data: { ...data, ownerId: userId } });
    revalidatePath('/cycles');
}

export async function updateOkrCycle(data: OkrCycle) {
    await getUserIdOrThrow();
    await db.okrCycle.update({
        where: { id: data.id },
        data: { name: data.name, startDate: data.startDate, endDate: data.endDate }
    });
    revalidatePath('/cycles');
}

export async function deleteOkrCycle(cycleId: number) {
    await getUserIdOrThrow();
    const linkedObjectives = await db.objective.findFirst({
        where: { cycleId: cycleId }
    });

    if (linkedObjectives) {
        throw new Error("Cannot delete cycle with active objectives.");
    }
    
    await db.okrCycle.delete({ where: { id: cycleId } });
    revalidatePath('/cycles');
}


export async function getActiveOkrCycle(): Promise<OkrCycle | null> {
    const userId = parseInt(await getUserIdOrThrow());
    const activeCycleInfo = await db.activeOkrCycle.findUnique({
        where: { userId },
        include: { cycle: true }
    });
    return activeCycleInfo?.cycle ?? null;
}

export async function setActiveOkrCycle(cycleId: number | null) {
    const userId = parseInt(await getUserIdOrThrow());
    
    if (cycleId === null) {
        await db.activeOkrCycle.delete({ where: { userId }});
    } else {
         await db.activeOkrCycle.upsert({
            where: { userId },
            update: { cycleId },
            create: { userId, cycleId }
        });
    }

    revalidatePath('/dashboard');
    revalidatePath('/objectives');
    revalidatePath('/calendar');
}


// --- Calendar ---
export async function saveCalendarSettings(data: CalendarSettingsFormData): Promise<void> {
    const userId = parseInt(await getUserIdOrThrow());
    await db.calendarSettings.upsert({
        where: { userId },
        update: data,
        create: { ...data, userId }
    });
    revalidatePath('/calendar');
}

export async function getCalendarSettings(): Promise<CalendarSettings | null> {
    const userId = parseInt(await getUserIdOrThrow());
    return await db.calendarSettings.findUnique({ where: { userId } });
}


// --- AI Suggestions ---
export async function getOkrImprovementSuggestionsAction(objective: Objective) {
    await getUserIdOrThrow();

    const inputForAI = {
        objectiveDescription: objective.description,
        keyResults: objective.keyResults.map(kr => ({
            keyResultDescription: kr.description,
            progress: kr.progress,
            confidenceLevel: kr.confidenceLevel,
            initiatives: kr.initiatives.map(i => ({
                initiativeDescription: i.description,
                status: i.status
            }))
        }))
    };
    
    try {
        const suggestions = await suggestOkrsImprovements(inputForAI);
        return suggestions;
    } catch (error) {
        console.error("AI suggestion failed:", error);
        throw new Error("Failed to get AI suggestions.");
    }
}
