
import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { users } from '../../drizzle/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authConfig = {
  providers: [
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
        // If the user is logged in and tries to access login/signup, redirect to dashboard
        if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup')) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }
      return true;
    },
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
  },
  // The adapter must be removed from the edge-compatible config
} satisfies NextAuthConfig;
