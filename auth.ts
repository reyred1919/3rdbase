
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { authConfig } from './auth.config';
import { db } from '@/lib/db';
import { getUserByUsername } from './src/lib/data/actions';


export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: 'jwt' },
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

          const user = await getUserByUsername(credentials.username as string);

          if (!user || !user.hashedPassword || user.is_active !== true) {
            return null;
          }

          const isPasswordCorrect = await bcrypt.compare(credentials.password as string, user.hashedPassword);

          if (isPasswordCorrect) {
            return {
              id: user.id.toString(),
              name: user.username,
              email: user.email,
            };
          }

          return null;
        },
      }),
  ],
  callbacks: {
    ...authConfig.callbacks, // Re-use the authorized callback from the edge-safe config

    // Extend callbacks for JWT and session management on the server
    jwt({ token, user }) {
        if (user) {
            // On sign-in, attach the user's ID to the token
            token.id = user.id;
        }
        return token;
    },
    session({ session, token }) {
        // Attach the user's ID from the token to the session object
        if (session.user && token.id) {
            session.user.id = token.id as string;
        }
        return session;
    },
  }
});
