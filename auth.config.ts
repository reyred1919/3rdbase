
import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { users } from './drizzle/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// This is a separate config for middleware. It's Edge-compatible.
// It does NOT contain the database adapter.
export const authConfig = {
  providers: [
    // The providers array can be left empty here if you only need to check for a session
    // However, including the credentials provider logic here doesn't hurt, as it's just the definition
    // and won't be fully executed in the middleware context. The main logic is in the server-side auth.ts.
    CredentialsProvider({
        name: 'credentials',
        credentials: {
          username: { label: 'Username', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
            // This logic will primarily be used by the server-side handlers,
            // but needs to be defined for the provider.
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const user = await db.query.users.findFirst({
              where: eq(users.username, credentials.username as string),
          });

          if (!user || !user.hashedPassword) {
            return null;
          }

          const isPasswordCorrect = await bcrypt.compare(credentials.password as string, user.hashedPassword);

          if (isPasswordCorrect) {
            return {
              id: user.id,
              name: user.username,
              email: user.email,
            };
          }

          return null;
        },
      }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup')) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }
      return true;
    },
    // JWT and Session callbacks are part of the main config, not needed for middleware checks.
  },
} satisfies NextAuthConfig;
