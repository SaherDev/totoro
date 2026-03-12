'use client';

import { useTranslations } from 'next-intl';
import { useUser, UserButton } from '@clerk/nextjs';

export default function HomePage() {
  const t = useTranslations();
  const { user } = useUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 gap-6">
      <UserButton afterSignOutUrl="/" />
      <h1 className="font-display text-3xl text-foreground">
        {t('home.whereTo')}
      </h1>
      <p className="font-body text-muted-foreground text-center max-w-sm">
        {t('home.moodPrompt')}
      </p>
      {user && (
        <p className="font-body text-sm text-muted-foreground">
          Signed in as {user.primaryEmailAddress?.emailAddress}
        </p>
      )}
    </div>
  );
}
