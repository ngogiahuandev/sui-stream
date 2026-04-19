'use client';

import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar } from 'web3-avatar-react';
import type { Comment } from '@/hooks/useComments';
import { Badge } from '@/components/ui/badge';

interface CommentItemProps {
  comment: Comment;
  clipOwner: string;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function CommentItem({ comment, clipOwner }: CommentItemProps) {
  const isOwner = comment.author.toLowerCase() === clipOwner.toLowerCase();

  return (
    <article className="flex items-start gap-3">
      <Link
        href={`/dashboard/user/${comment.author}`}
        aria-label={`View ${shortAddress(comment.author)}`}
      >
        <Avatar
          address={comment.author}
          className="size-9 shrink-0 overflow-hidden rounded-full"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <Link
            href={`/dashboard/user/${comment.author}`}
            className="font-mono font-medium hover:underline"
          >
            {shortAddress(comment.author)}
          </Link>
          {isOwner ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              OP
            </Badge>
          ) : null}
          {comment.createdAtMs > 0 ? (
            <span
              className="text-muted-foreground"
              title={new Date(comment.createdAtMs).toLocaleString()}
            >
              {formatDistanceToNowStrict(new Date(comment.createdAtMs), {
                addSuffix: true,
              })}
            </span>
          ) : null}
        </header>
        <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </article>
  );
}
