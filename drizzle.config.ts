
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  // This hook tells drizzle-kit to run our seed script after every migration.
  // This is the most robust way to handle seeding.
  run: {
    afterMigrate: ['tsx', './drizzle/seed.ts']
  }
} satisfies Config;
