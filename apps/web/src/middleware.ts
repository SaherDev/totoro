import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/en',
  '/he',
  '/en/login',
  '/he/login',
  '/en/sso-callback',
  '/he/sso-callback',
  '/en/home',
  '/he/home',
  '/api/hello',
]);

export default clerkMiddleware((auth, request) => {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/en', request.url));
  }

  if (!isPublicRoute(request)) {
    auth().protect();
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
