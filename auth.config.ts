
import type { NextAuthConfig } from 'next-auth';

// This is a separate config for middleware. It's Edge-compatible.
// It does NOT contain the database adapter or the credentials provider logic.
export const authConfig = {
  providers: [
    // The providers array can be left empty here.
    // The full provider logic is defined in the main `auth.ts` file,
    // which is not used by the middleware.
  ],
  pages: {
    signIn: `${process.env.NEXTAUTH_URL}/login`,
    error: `${process.env.NEXTAUTH_URL}/auth/error`,
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
  },
} satisfies NextAuthConfig;
