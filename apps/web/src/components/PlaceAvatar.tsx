'use client';

import Avatar from 'boring-avatars';

interface PlaceAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

// Warm Ghibli-palette colors seeded by place name
const PALETTE = ['#c8956c', '#e8c99a', '#7d9e7e', '#4a7c59', '#d4a853'];

export function PlaceAvatar({ name, size = 48, className }: PlaceAvatarProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <Avatar
        size={size}
        name={name}
        variant="marble"
        colors={PALETTE}
      />
    </div>
  );
}
