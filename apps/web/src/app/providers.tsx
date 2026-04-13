'use client';

import { ThemeProvider } from 'next-themes';
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from '@totoro/ui';
import { useGeolocation } from '@/hooks/useGeolocation';

/**
 * Mounts side-effects that must run exactly once for the lifetime of
 * the app shell — currently just the browser geolocation request.
 * Kept as its own component so `Providers` stays declarative and the
 * hook is invoked from a single, predictable place (facade pattern).
 */
function AppEffects() {
  useGeolocation();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AppEffects />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
