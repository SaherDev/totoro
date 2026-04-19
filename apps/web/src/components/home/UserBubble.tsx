'use client';

interface UserBubbleProps {
  content: string;
}

export function UserBubble({ content }: UserBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-4 py-3">
        <p className="break-all text-sm text-accent-foreground">{content}</p>
      </div>
    </div>
  );
}
