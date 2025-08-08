
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';
import { authConfig } from './auth.config'; // Importing the base config

// This is the main auth file, used by the API routes and server-side logic.
// It extends the base config with the database adapter and session strategy.
export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  ...authConfig, // Spread the base config
  adapter: DrizzleAdapter(db) as Adapter,
  session: { strategy: 'jwt' },
  callbacks: {
    // We keep the full callbacks here for the server-side session management
    authorized: authConfig.callbacks.authorized, // Keep the authorized callback
    jwt({ token, user }) {
        if (user) {
            token.id = user.id;
        }
        return token;
    },
    session({ session, token }) {
        if (session.user && token.id) {
            session.user.id = token.id as string;
        }
        return session;
    },
  }
});
