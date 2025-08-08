
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';
import { authConfig } from './auth.config';

// This is the main auth file, used by the API routes and middleware.
export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db) as Adapter,
  session: { strategy: 'jwt' },
});
