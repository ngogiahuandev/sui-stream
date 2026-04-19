'use client';

import { useMemo, useState } from 'react';
import { Loader2Icon, SendIcon } from 'lucide-react';
import { Avatar } from 'web3-avatar-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CommentComposerProps {
  maxWords: number;
  isSubmitting: boolean;
  onSubmit: (content: string) => Promise<boolean>;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function CommentComposer({
  maxWords,
  isSubmitting,
  onSubmit,
}: CommentComposerProps) {
  const account = useCurrentAccount();
  const [value, setValue] = useState('');

  const wordCount = useMemo(() => countWords(value), [value]);
  const overLimit = wordCount > maxWords;
  const disabled = !account || isSubmitting || overLimit || wordCount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const ok = await onSubmit(value);
    if (ok) setValue('');
  };

  if (!account) {
    return (
      <div className="border-muted bg-muted/30 text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
        Connect your wallet to comment.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-start gap-3"
      aria-label="Post a comment"
    >
      <Avatar
        address={account.address}
        className="size-9 shrink-0 overflow-hidden rounded-full"
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a comment…"
          rows={3}
          disabled={isSubmitting}
          className="resize-none pe-16"
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          <span
            className={cn(
              'text-muted-foreground text-[10px]',
              overLimit && 'text-destructive'
            )}
          >
            {wordCount}/{maxWords}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={disabled}
            className="h-7 gap-1.5 px-2.5"
          >
            {isSubmitting ? (
              <Loader2Icon className="size-3 animate-spin" />
            ) : (
              <SendIcon className="size-3" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
