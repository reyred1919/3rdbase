
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
            assignees: obj.keyResults.flatMap(kr => kr.assignees.map(kra => kra.member))
        }))
    }));
}

export async function saveObjective(data: ObjectiveFormData): Promise<Objective> {
    await getUserIdOrThrow();
    const objectiveId = data.id || -1;

    if (!data.cycleId) {
        throw new Error("Cycle ID is required to save an objective.");
    }

    const objectiveData = {
        description: data.description,
        teamId: data.teamId,
        cycleId: data.cycleId
    };

    return await db.$transaction(async (tx) => {
        // Step 1: Upsert the Objective
        const savedObjective = await tx.objective.upsert({
            where: { id: objectiveId },
            update: objectiveData,
            create: objectiveData,
        });

        const newObjectiveId = savedObjective.id;

        // Step 2: Handle Key Results
        const incomingKrIds = data.keyResults.filter(kr => kr.id).map(kr => kr.id as number);
        
        // Delete KRs that are no longer present for this objective
        await tx.keyResult.deleteMany({
            where: {
                objectiveId: newObjectiveId,
                id: { notIn: incomingKrIds }
            }
        });

        // Step 3: Loop through incoming KRs and upsert them with their relations
        for (const krData of data.keyResults) {
            const calculatedProgress = calculateKrProgress(krData as KeyResult);
            
            const savedKr = await tx.keyResult.upsert({
                where: { id: krData.id || -1 },
                update: {
                    description: krData.description,
                    confidenceLevel: krData.confidenceLevel,
                    progress: calculatedProgress,
                },
                create: {
                    objectiveId: newObjectiveId,
                    description: krData.description,
                    confidenceLevel: krData.confidenceLevel,
                    progress: calculatedProgress,
                }
            });

            const krId = savedKr.id;

            // Handle KR Assignees (many-to-many)
            await tx.keyResultAssignee.deleteMany({ where: { keyResultId: krId }});
            if (krData.assignees && krData.assignees.length > 0) {
                await tx.keyResultAssignee.createMany({
                    data: krData.assignees.map(a => ({ keyResultId: krId, memberId: a.id }))
                });
            }

            // Handle Initiatives
            const incomingInitIds = (krData.initiatives || []).filter(i => i.id).map(i => i.id as number);
            await tx.initiative.deleteMany({ where: { keyResultId: krId, id: { notIn: incomingInitIds } } });
            
            for (const initData of (krData.initiatives || [])) {
                const savedInitiative = await tx.initiative.upsert({
                    where: { id: initData.id || -1 },
                    update: { description: initData.description, status: initData.status },
                    create: { keyResultId: krId, description: initData.description, status: initData.status }
                });
                const initId = savedInitiative.id;

                // Handle Tasks
                const incomingTaskIds = (initData.tasks || []).filter(t => t.id).map(t => t.id as number);
                await tx.task.deleteMany({ where: { initiativeId: initId, id: { notIn: incomingTaskIds } } });
                for(const taskData of (initData.tasks || [])) {
                    await tx.task.upsert({
                        where: { id: taskData.id || -1 },
                        update: { description: taskData.description, completed: taskData.completed },
                        create: { initiativeId: initId, description: taskData.description, completed: taskData.completed }
                    });
                }
            }

            // Handle Risks
            const incomingRiskIds = (krData.risks || []).filter(r => r.id).map(r => r.id as number);
            await tx.risk.deleteMany({ where: { keyResultId: krId, id: { notIn: incomingRiskIds } } });
            for (const riskData of (krData.risks || [])) {
                await tx.risk.upsert({
                    where: { id: riskData.id || -1 },
                    update: { description: riskData.description, correctiveAction: riskData.correctiveAction, status: riskData.status },
                    create: { keyResultId: krId, description: riskData.description, correctiveAction: riskData.correctiveAction, status: riskData.status }
                });
            }
        }
        
        const finalObjective = await getObjectiveById(newObjectiveId);
        
        revalidatePath('/objectives');
        revalidatePath('/dashboard');
        revalidatePath('/tasks');
        
        return finalObjective;
    });
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

    await db.$transaction(async (tx) => {
        // Update team name
        await tx.team.update({
            where: { id: teamId },
            data: { name: teamData.name },
        });

        const currentMembers = await tx.member.findMany({ where: { teamId } });
        const incomingMembers = teamData.members || [];
        
        const currentMemberIds = new Set(currentMembers.map(m => m.id));
        const incomingMemberIds = new Set(incomingMembers.filter(m => m.id).map(m => parseInt(m.id!)));


        // 1. Delete members that are no longer in the list
        const memberIdsToDelete = currentMembers
            .filter(cm => !incomingMemberIds.has(cm.id))
            .map(m => m.id);

        if (memberIdsToDelete.length > 0) {
            await tx.member.deleteMany({
                where: { id: { in: memberIdsToDelete } },
            });
        }

        // 2. Upsert incoming members
        for (const memberData of incomingMembers) {
            if (memberData.id && currentMemberIds.has(parseInt(memberData.id))) {
                // Update existing member
                await tx.member.update({
                    where: { id: parseInt(memberData.id) },
                    data: { name: memberData.name },
                });
            } else {
                // Create new member
                await tx.member.create({
                    data: {
                        name: memberData.name,
                        teamId: teamId,
                        avatarUrl: `https://placehold.co/40x40.png?text=${memberData.name.charAt(0)}`,
                    },
                });
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
    return { success: true, message: 'تیم با موفقیت حذف شد.' };
}

export async function joinTeamWithCode(code: string): Promise<{ success: boolean; message: string }> {
    const userId = parseInt(await getUserIdOrThrow());

    if (!code || typeof code !== 'string' || code.trim() === '') {
        return { success: false, message: 'کد دعوت نامعتبر است.' };
    }

    // Find the invitation and the associated team
    const invitation = await db.teamInvitation.findUnique({
        where: { code },
        include: { team: true },
    });

    if (!invitation) {
        return { success: false, message: 'کد دعوت یافت نشد.' };
    }

    // Check if user is already a member of this team
    const existingMembership = await db.teamMembership.findUnique({
        where: {
            userId_teamId: {
                userId,
                teamId: invitation.teamId,
            },
        },
    });

    if (existingMembership) {
        return { success: false, message: 'شما در حال حاضر عضو این تیم هستید.' };
    }
    
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
         return { success: false, message: 'کاربر یافت نشد.' };
    }

    // Create the membership and the member record in a transaction
    await db.$transaction([
        db.teamMembership.create({
            data: {
                userId,
                teamId: invitation.teamId,
                role: 'member', // Default role for invited users
            },
        }),
        db.member.create({
            data: {
                name: `${user.firstName} ${user.lastName}`,
                avatarUrl: `https://placehold.co/40x40.png?text=${user.firstName?.charAt(0)}`,
                teamId: invitation.teamId,
                userId, // Link the member record to the user record
            },
        }),
    ]);
    
    revalidatePath('/teams');

    return { success: true, message: `شما با موفقیت به تیم «${invitation.team.name}» پیوستید!` };
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
