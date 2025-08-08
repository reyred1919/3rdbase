
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// The middleware is now initialized using the Edge-compatible authConfig.
export default NextAuth(authConfig).auth;

export const config = {
  // Matches all routes except for the ones starting with:
  // - /api (API routes)
  // - /_next/static (static files)
  // - /_next/image (image optimization files)
  // - /favicon.ico (favicon file)
  // - /login (login page)
  // - /signup (signup page)
  // - / (landing page)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup|^/?$).*)'],
};
