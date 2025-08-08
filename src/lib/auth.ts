
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import * as schema from '../../drizzle/schema';
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from 'drizzle-orm';
import type { Adapter } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as Adapter,
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
            where: eq(schema.users.username, credentials.username),
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.hashedPassword);

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
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
    async jwt({ token, user }) {
        if (user) {
            token.sub = user.id;
            token.name = user.name;
            token.email = user.email;
        }
        return token;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET || 'your-super-secret-key-for-development',
};
