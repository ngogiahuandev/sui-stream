'use client';

import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import { cn } from '@/lib/utils';

interface ClipOwnerCardProps {
  owner: string;
  className?: string;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ClipOwnerCard({ owner, className }: ClipOwnerCardProps) {
  return (
    <Link
      href={`/dashboard/user/${owner}`}
      aria-label={`View all clips by ${shortAddress(owner)}`}
      className={cn(
        'hover:bg-muted/60 group inline-flex items-center gap-2.5 self-start rounded-full border px-2 py-1.5 pr-4 transition-colors',
        className
      )}
    >
      <Avatar
        address={owner}
        className="size-8 shrink-0 overflow-hidden rounded-full"
      />
      <span className="font-mono text-xs font-medium">
        {shortAddress(owner)}
      </span>
    </Link>
  );
}
