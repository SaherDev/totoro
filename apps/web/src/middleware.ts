import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/en/login',
  '/he/login',
  '/en/sso-callback',
  '/he/sso-callback',
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
      // Detect locale from path prefix, fall back to 'en'
      const locale = pathname.startsWith('/he') ? 'he' : 'en';
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return undefined;
});

export const config = {
  matcher: [
    // Skip files and public paths
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
