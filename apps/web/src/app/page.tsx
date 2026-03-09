'use client';

import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@totoro/ui';

export default function Index() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function testProtected() {
    setLoading(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/protected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResult(`${res.status}: ${JSON.stringify(data)}`);
    } catch (e) {
      setResult(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  async function testAi() {
    setLoading(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/consult`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      const data = await res.json();
      setResult(`${res.status}: ${JSON.stringify(data)}`);
    } catch (e) {
      setResult(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Totoro</h1>
        <p className="mb-8 text-sm text-muted-foreground">AI-native place recommendations</p>

        {isSignedIn ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="font-semibold text-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={testProtected} disabled={loading}>
                Test protected route (auth check)
              </Button>
              <Button variant="default" className="w-full" onClick={testAi} disabled={loading}>
                Test AI route (ai_enabled check)
              </Button>
            </div>

            {result && (
              <div className="rounded-md bg-muted p-3 font-mono text-xs break-all text-foreground">
                {result}
              </div>
            )}

            <div className="flex justify-end">
              <UserButton />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <SignInButton mode="modal">
              <Button variant="default" className="w-full">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outline" className="w-full">Create Account</Button>
            </SignUpButton>
          </div>
        )}
      </div>
    </div>
  );
}
