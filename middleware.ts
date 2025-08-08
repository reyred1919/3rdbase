
import { auth } from './auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  if (!req.auth) {
    const url = req.url.replace(req.nextUrl.pathname, '/login');
    return NextResponse.redirect(url);
  }
});

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
