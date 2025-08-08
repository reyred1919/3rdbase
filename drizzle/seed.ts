
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

const SEED_USER_USERNAME = 'user';
const SEED_USER_PASSWORD = 'password';

const main = async () => {
  console.log('🌱 Running seed script after migration...');

  try {
    // Check if the seed user already exists
    let user = await db.query.users.findFirst({
      where: eq(schema.users.username, SEED_USER_USERNAME),
    });

    if (!user) {
      console.log(`- Seed user "${SEED_USER_USERNAME}" not found. Creating it...`);
      const hashedPassword = await bcrypt.hash(SEED_USER_PASSWORD, 10);
      const [newUser] = await db
        .insert(schema.users)
        .values({
          username: SEED_USER_USERNAME,
          hashedPassword: hashedPassword,
          name: SEED_USER_USERNAME,
          email: `${SEED_USER_USERNAME}@example.com`
        })
        .returning();
      user = newUser;
      console.log(`- User "${SEED_USER_USERNAME}" created successfully.`);
    } else {
        console.log(`- Seed user "${SEED_USER_USERNAME}" already exists. Skipping creation.`);
    }

    console.log(`- Seeding data for user: ${user.username} (ID: ${user.id})`);

    // We check if the user already has teams to avoid re-seeding duplicates.
    const existingTeams = await db.query.teams.findMany({
      where: eq(schema.teams.ownerId, user.id),
      limit: 1,
    });

    if (existingTeams.length > 0) {
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

    await db.transaction(async (tx) => {
      for (const teamData of teamsToCreate) {
        console.log(`- Creating team: "${teamData.name}"`);
        const [newTeam] = await tx
          .insert(schema.teams)
          .values({ name: teamData.name, ownerId: user!.id })
          .returning();
        
        // Add the owner as an admin member of the team
        await tx.insert(schema.teamMemberships).values({
            userId: user!.id,
            teamId: newTeam.id,
            role: 'admin',
        });

        if (teamData.members.length > 0) {
          console.log(`  - Adding ${teamData.members.length} members...`);
          await tx.insert(schema.members).values(
            teamData.members.map((member) => ({
              teamId: newTeam.id,
              name: member.name,
              avatarUrl: member.avatarUrl,
            }))
          );
        }
      }
    });

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ An error occurred during seeding:', error);
    process.exit(1);
  } finally {
    // It's important to end the pool connection, otherwise the script will hang.
    await pool.end();
  }
};

main();
