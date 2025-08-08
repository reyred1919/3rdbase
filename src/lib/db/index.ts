
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../../drizzle/schema';

if (!process.env.DATABASE_URL) {
  // In a real app, you'd want to throw an error, but for Studio's iterative
  // development, we can let it slide and it will be caught by query attempts.
  console.warn('DATABASE_URL environment variable is not set.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
