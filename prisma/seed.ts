
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient()

const SEED_USER_USERNAME = 'user';
const SEED_USER_PASSWORD = 'password';

async function main() {
    console.log('🌱 Running seed script...');

    // Find or create the seed user
    let user = await prisma.user.findUnique({
      where: { username: SEED_USER_USERNAME },
    });

    if (!user) {
        console.log(`- Seed user "${SEED_USER_USERNAME}" not found. Creating it...`);
        const hashedPassword = await bcrypt.hash(SEED_USER_PASSWORD, 10);
        user = await prisma.user.create({
            data: {
                username: SEED_USER_USERNAME,
                hashedPassword: hashedPassword,
                name: SEED_USER_USERNAME,
                email: `${SEED_USER_USERNAME}@example.com`
            }
        });
        console.log(`- User "${SEED_USER_USERNAME}" created successfully.`);
    } else {
        console.log(`- Seed user "${SEED_USER_USERNAME}" already exists. Skipping creation.`);
    }

    console.log(`- Seeding data for user: ${user.username} (ID: ${user.id})`);

    // Check if the user already has teams to avoid re-seeding
    const existingTeamCount = await prisma.team.count({
        where: { ownerId: user.id },
    });

    if (existingTeamCount > 0) {
        console.log('- User already has teams. Seeding is not required.');
        return;
    }

    const teamsToCreate = [
      {
        name: 'تیم فنی',
        members: [
          { name: 'علی رضایی', avatarUrl: 'https://placehold.co/40x40.png?text=A' },
          { name: 'سارا محمدی', avatarUrl: 'https://placehold.co/40x40.png?text=S' },
          { name: 'رضا قاسمی', avatarUrl: 'https://placehold.co/40x40.png?text=R' },
        ],
      },
      {
        name: 'تیم محصول',
        members: [
          { name: 'مریم احمدی', avatarUrl: 'https://placehold.co/40x40.png?text=M' },
          { name: 'نیما کریمی', avatarUrl: 'https://placehold.co/40x40.png?text=N' },
        ],
      },
    ];

    for (const teamData of teamsToCreate) {
        console.log(`- Creating team: "${teamData.name}"`);
        await prisma.team.create({
            data: {
                name: teamData.name,
                ownerId: user.id,
                memberships: {
                    create: {
                        userId: user.id,
                        role: Role.admin,
                    }
                },
                members: {
                    create: teamData.members
                }
            }
        });
    }

    console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

