'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { Button } from '@totoro/ui';

export default function Index() {
  const { isSignedIn, user } = useUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Totoro</h1>
        <p className="mb-8 text-sm text-muted-foreground">AI-native place recommendations</p>

        {isSignedIn ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="font-semibold text-foreground">{user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="default" className="flex-1">
                Get Started
              </Button>
              <UserButton />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <SignInButton mode="modal">
              <Button variant="default" className="w-full">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </SignUpButton>
          </div>
        )}
      </div>
    </div>
  );
}
