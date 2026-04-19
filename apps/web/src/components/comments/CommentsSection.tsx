'use client';

import { MessageCircleIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useComments } from '@/hooks/useComments';
import { CommentComposer } from '@/components/comments/CommentComposer';
import { CommentItem } from '@/components/comments/CommentItem';

interface CommentsSectionProps {
  clipId: string;
  clipOwner: string;
}

export function CommentsSection({ clipId, clipOwner }: CommentsSectionProps) {
  const {
    comments,
    isLoading,
    isFetching,
    refetch,
    createComment,
    isSubmitting,
    maxWords,
  } = useComments(clipId);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MessageCircleIcon className="size-4" />
          {comments.length === 1 ? '1 Comment' : `${comments.length} Comments`}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCwIcon
            className={isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
          />
          Refresh
        </Button>
      </header>

      <CommentComposer
        maxWords={maxWords}
        isSubmitting={isSubmitting}
        onSubmit={createComment}
      />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          No comments yet. Be the first to share your thoughts.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.commentId}
              comment={comment}
              clipOwner={clipOwner}
            />
          ))}
        </div>
      )}
    </section>
  );
}
