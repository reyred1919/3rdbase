
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
    // The providers array can be left empty here if you only need to check for a session.
    // However, defining the provider here is also safe as it's just configuration
    // and the full logic is only executed by the server-side auth handlers.
    CredentialsProvider({
        name: 'credentials',
        credentials: {
          username: { label: 'Username', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
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
            // Return a user object that matches the `User` type in `next-auth`
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
    // JWT and Session callbacks are part of the main config, not the middleware config.
  },
} satisfies NextAuthConfig;
