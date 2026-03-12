'use client';

import { useUser } from '@clerk/nextjs';
import { TotoroAvatar } from './TotoroAvatar';
import { Button } from '@totoro/ui';

interface UserCardProps {
  onSetupProfile?: () => void;
}

export function UserCard({ onSetupProfile }: UserCardProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="px-5 pt-5 pb-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        </div>
        <div className="h-9 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.firstName || user.username || 'User';
  const email = user.primaryEmailAddress?.emailAddress || 'user@example.com';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="px-5 pt-5 pb-4">
      <div className="flex items-center gap-3 mb-3">
        <TotoroAvatar
          fallback={avatarInitial}
          src={user.imageUrl}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base text-foreground truncate">{displayName}</p>
          <p className="font-body text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </div>
      <Button
        onClick={onSetupProfile}
        variant="secondary"
        size="sm"
        className="w-full"
      >
        Set up profile
      </Button>
    </div>
  );
}
