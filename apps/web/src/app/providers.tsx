'use client';

import { ThemeProvider } from 'next-themes';
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from '@totoro/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
