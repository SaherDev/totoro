import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/en/login',
  '/en/sso-callback',
  '/en/mockup(.*)',
]);

export default clerkMiddleware((auth, request) => {
  const { pathname } = request.nextUrl;

  // Redirect bare root to default locale home
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/en/home', request.url));
  }

  if (!isPublicRoute(request)) {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/en/login', request.url));
    }
  }

  return undefined;
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and proxied API routes
    '/((?!_next|api/v1|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
