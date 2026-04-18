'use client';

import { useState } from 'react';
import { ThumbsUpIcon, ThumbsDownIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVote } from '@/hooks/useVote';

interface VoteButtonsProps {
  clipId: string;
  className?: string;
}

function formatCount(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return value.toLocaleString();
}

export function VoteButtons({ clipId, className }: VoteButtonsProps) {
  const vote = useVote(clipId);
  const [pendingAction, setPendingAction] = useState<'up' | 'down' | null>(null);

  const busy = pendingAction !== null || vote.isPending;

  const handleClick = async (action: 'up' | 'down') => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      if (action === 'up') await vote.upvote();
      else await vote.downvote();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div
      className={cn(
        'bg-muted/40 inline-flex items-center gap-1 rounded-full border p-1',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => handleClick('up')}
        className={cn(
          'h-8 gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
          vote.isUpvoted && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
        )}
        aria-pressed={vote.isUpvoted}
        aria-label="Upvote"
      >
        {pendingAction === 'up' ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <ThumbsUpIcon
            className={cn(
              'size-4 transition-transform',
              vote.isUpvoted && 'scale-110'
            )}
          />
        )}
        {formatCount(vote.upvotes)}
      </Button>
      <span className="bg-border h-5 w-px" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => handleClick('down')}
        className={cn(
          'h-8 gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
          vote.isDownvoted && 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground'
        )}
        aria-pressed={vote.isDownvoted}
        aria-label="Downvote"
      >
        {pendingAction === 'down' ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <ThumbsDownIcon
            className={cn(
              'size-4 transition-transform',
              vote.isDownvoted && 'scale-110'
            )}
          />
        )}
        {formatCount(vote.downvotes)}
      </Button>
    </div>
  );
}
