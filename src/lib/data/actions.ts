'use server';

import { db } from '@/lib/db';
import { auth } from '../../../auth';
import type { 
  Objective, Team, OkrCycle, ObjectiveFormData, TeamFormData, CalendarSettings, 
  CalendarSettingsFormData, TeamWithMembership, KeyResult, OkrCycleFormData, User 
} from '@/types/okr';
import { revalidatePath } from 'next/cache';
import { suggestOkrsImprovements } from '@/ai/flows/suggest-okr-improvements';

async function getUserIdOrThrow(): Promise<number> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || isNaN(parseInt(userId))) {
    throw new Error('Not authenticated or user ID is invalid');
  }
  return parseInt(userId);
}

// --- User ---
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    return await db.user.findUnique({ where: { username } });
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  return await db.user.findMany({
    orderBy: { id: 'asc' }
  });
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
  const userId = await getUserIdOrThrow();

  const activeCycle = await db.activeOkrCycle.findUnique({
    where: { userId },
    select: { cycleId: true }
  });
  if (!activeCycle) return [];

  // تیم‌هایی که کاربر عضو آن‌هاست
  const teamMemberships = await db.teamMembership.findMany({
    where: { userId },
    select: { teamId: true }
  });
  const teamIds = teamMemberships.map(tm => tm.teamId);

  // اهدافی که کاربر به عنوان assignee در KeyResult آن‌ها حضور دارد
  const memberRecords = await db.member.findMany({ where: { userId }, select: { id: true } });
  const memberIds = memberRecords.map(m => m.id);

  // اهداف تیم‌های کاربر یا اهدافی که در KeyResult آن‌ها اساین شده است
  const objectiveRecords = await db.objective.findMany({
    where: {
      cycleId: activeCycle.cycleId,
      OR: [
        { teamId: { in: teamIds } },
        {
          keyResults: {
            some: {
              assignees: {
                some: { memberId: { in: memberIds } }
              }
            }
          }
        }
      ]
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
    orderBy: { createdAt: 'desc' }
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

  if (!data.cycleId) {
    throw new Error("Cycle ID is required to save an objective.");
  }

  const objectiveData = {
    description: data.description,
    teamId: data.teamId,
    cycleId: data.cycleId
  };

  let newObjectiveId: number;

  await db.$transaction(async (tx) => {
    let savedObjective;

    if (!data.id) {
      // 🟢 Create new Objective
      savedObjective = await tx.objective.create({ data: objectiveData });
    } else {
      // 🟡 Update existing Objective
      savedObjective = await tx.objective.update({
        where: { id: data.id },
        data: objectiveData
      });
    }

    newObjectiveId = savedObjective.id;

    // --- Key Results ---
    const incomingKrIds = data.keyResults.filter(kr => kr.id).map(kr => kr.id as number);
    await tx.keyResult.deleteMany({
      where: { objectiveId: newObjectiveId, id: { notIn: incomingKrIds } }
    });

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

      // Assignees
      await tx.keyResultAssignee.deleteMany({ where: { keyResultId: krId } });
      if (krData.assignees?.length) {
        await tx.keyResultAssignee.createMany({
          data: krData.assignees.map(a => ({ keyResultId: krId, memberId: a.id }))
        });
      }

      // Initiatives
      const incomingInitIds = (krData.initiatives || []).filter(i => i.id).map(i => i.id as number);
      await tx.initiative.deleteMany({ where: { keyResultId: krId, id: { notIn: incomingInitIds } } });
      for (const initData of (krData.initiatives || [])) {
        const savedInitiative = await tx.initiative.upsert({
          where: { id: initData.id || -1 },
          update: { description: initData.description, status: initData.status },
          create: { keyResultId: krId, description: initData.description, status: initData.status }
        });
        const initId = savedInitiative.id;

        const incomingTaskIds = (initData.tasks || []).filter(t => t.id).map(t => t.id as number);
        await tx.task.deleteMany({ where: { initiativeId: initId, id: { notIn: incomingTaskIds } } });
        for (const taskData of (initData.tasks || [])) {
          await tx.task.upsert({
            where: { id: taskData.id || -1 },
            update: { description: taskData.description, completed: taskData.completed },
            create: { initiativeId: initId, description: taskData.description, completed: taskData.completed }
          });
        }
      }

      // Risks
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
  });

  // Fetch the objective after transaction is committed
  const finalObjective = await getObjectiveById(newObjectiveId);
  revalidatePath('/objectives');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  return finalObjective;
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
  await db.objective.delete({ where: { id: objectiveId } });
  revalidatePath('/objectives');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
}

// --- Teams ---
export async function getTeams(): Promise<TeamWithMembership[]> {
  const userId = await getUserIdOrThrow();
  const teamMemberships = await db.teamMembership.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          members: true,
          owner: { select: { firstName: true, lastName: true } },
          invitations: { take: 1, orderBy: { createdAt: 'desc' } },
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
  const userId = await getUserIdOrThrow();
  const uniqueCode = `${teamData.name.replace(/\s+/g, '-').slice(0, 10)}-${crypto.randomUUID().slice(0, 4)}`.toUpperCase();

  await db.team.create({
    data: {
      name: teamData.name,
      ownerId: userId,
      memberships: { create: { userId, role: 'admin' } },
      members: {
        create: (teamData.members || []).map((m: any) => ({
          name: m.name,
          avatarUrl: m.avatarUrl || `https://placehold.co/40x40.png?text=${m.name.charAt(0)}`,
          user: m.id ? { connect: { id: parseInt(m.id) } } : undefined,
        }))
      },
      invitations: { create: { code: uniqueCode, creatorId: userId } }
    }
  });
  revalidatePath('/teams');
}

export async function updateTeam(teamData: TeamFormData) {
  await getUserIdOrThrow();
  const teamId = teamData.id;
  if (!teamId) throw new Error("Team ID is required for update.");

  await db.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { name: teamData.name } });

    const currentMembers = await tx.member.findMany({ where: { teamId } });
    const incomingMembers = teamData.members || [];
    const currentMemberIds = new Set(currentMembers.map(m => m.id));
    const incomingMemberIds = new Set(incomingMembers.filter(m => m.id).map(m => parseInt(m.id!)));

    const memberIdsToDelete = currentMembers.filter(cm => !incomingMemberIds.has(cm.id)).map(m => m.id);
    if (memberIdsToDelete.length > 0) {
      await tx.member.deleteMany({ where: { id: { in: memberIdsToDelete } } });
    }

    for (const memberData of incomingMembers) {
      if (memberData.id && currentMemberIds.has(parseInt(memberData.id))) {
        await tx.member.update({ where: { id: parseInt(memberData.id) }, data: { name: memberData.name } });
      } else {
        await tx.member.create({
          data: {
            name: memberData.name,
            teamId,
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
  const assignedObjectivesCount = await db.objective.count({ where: { teamId } });
  if (assignedObjectivesCount > 0) {
    return { success: false, message: 'این تیم به یک یا چند هدف اختصاص داده شده و قابل حذف نیست.' };
  }
  await db.team.delete({ where: { id: teamId } });
  revalidatePath('/teams');
  return { success: true, message: 'تیم با موفقیت حذف شد.' };
}

export async function joinTeamWithCode(code: string): Promise<{ success: boolean; message: string }> {
  const userId = await getUserIdOrThrow();

  if (!code || typeof code !== 'string' || code.trim() === '') {
    return { success: false, message: 'کد دعوت وارد شده معتبر نیست یا خالی است.' };
  }

  const invitation = await db.teamInvitation.findUnique({
    where: { code },
    include: { team: true },
  });
  if (!invitation) return { success: false, message: 'کد دعوت یافت نشد.' };

  const existingMembership = await db.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId: invitation.teamId } },
  });
  if (existingMembership) {
    return { success: false, message: 'شما در حال حاضر عضو این تیم هستید.' };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: 'کاربر یافت نشد.' };

  await db.$transaction([
    db.teamMembership.create({ data: { userId, teamId: invitation.teamId, role: 'member' } }),
    db.member.create({
      data: {
        name: `${user.firstName} ${user.lastName}`,
        avatarUrl: `https://placehold.co/40x40.png?text=${user.firstName?.charAt(0)}`,
        teamId: invitation.teamId,
        // userId : userId,
      },
    }),
  ]);

  revalidatePath('/teams');
  return { success: true, message: `شما با موفقیت به تیم «${invitation.team.name}» پیوستید!` };
}

// --- OKR Cycles ---
export async function getOkrCycles(): Promise<OkrCycle[]> {
  const userId = await getUserIdOrThrow();

  // چرخه‌هایی که کاربر مالک آن‌هاست
  const ownedCycles = await db.okrCycle.findMany({ where: { ownerId: userId }, orderBy: { startDate: 'desc' } });

  // چرخه‌هایی که کاربر به عنوان assignee در اهداف یا keyResult حضور دارد
  const memberRecords = await db.member.findMany({ where: { userId }, select: { id: true } });
  const memberIds = memberRecords.map((m: { id: number }) => m.id);

  const assignedObjectives = await db.objective.findMany({
    where: {
      keyResults: {
        some: {
          assignees: {
            some: { memberId: { in: memberIds } }
          }
        }
      }
    },
    select: { cycleId: true }
  });
  const assignedCycleIds = Array.from(new Set(assignedObjectives.map((obj: { cycleId: number }) => obj.cycleId)));

  // دریافت چرخه‌های مرتبط با اساینمنت
  const assignedCycles = assignedCycleIds.length > 0
    ? await db.okrCycle.findMany({ where: { id: { in: assignedCycleIds } }, orderBy: { startDate: 'desc' } })
    : [];

  // ترکیب و حذف تکراری‌ها
  const allCyclesMap = new Map<number, OkrCycle>();
  [...ownedCycles, ...assignedCycles].forEach(cycle => allCyclesMap.set(cycle.id, cycle));

  return Array.from(allCyclesMap.values());
}

export async function createOkrCycle(data: OkrCycleFormData) {
  const userId = await getUserIdOrThrow();
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
  const linkedObjectives = await db.objective.findFirst({ where: { cycleId } });
  if (linkedObjectives) throw new Error("Cannot delete cycle with active objectives.");
  await db.okrCycle.delete({ where: { id: cycleId } });
  revalidatePath('/cycles');
}

export async function getActiveOkrCycle(): Promise<OkrCycle | null> {
  const userId = await getUserIdOrThrow();
  const activeCycleInfo = await db.activeOkrCycle.findUnique({
    where: { userId },
    include: { cycle: true }
  });
  return activeCycleInfo?.cycle ?? null;
}

export async function setActiveOkrCycle(cycleId: number | null) {
  const userId = await getUserIdOrThrow();
  if (cycleId === null) {
    await db.activeOkrCycle.delete({ where: { userId } });
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
  const userId = await getUserIdOrThrow();
  await db.calendarSettings.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId }
  });
  revalidatePath('/calendar');
}

export async function getCalendarSettings(): Promise<CalendarSettings | null> {
  const userId = await getUserIdOrThrow();
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
    return await suggestOkrsImprovements(inputForAI);
  } catch (error) {
    console.error("AI suggestion failed:", error);
    throw new Error("Failed to get AI suggestions.");
  }
}
