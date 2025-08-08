
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';
import { authConfig } from './auth.config'; // Importing the base config
import CredentialsProvider from 'next-auth/providers/credentials';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
  callbacks: {
    // We keep the full callbacks here for the server-side session management
    authorized: authConfig.callbacks.authorized, // Re-use the authorized callback

    // Extend callbacks for JWT and session
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
