'use client';

import { useState } from 'react';
import { Avatar } from 'web3-avatar-react';
import { HeartHandshakeIcon, Loader2Icon } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSuiBalance } from '@/hooks/useSuiBalance';
import {
  DONATE_MESSAGE_WORD_LIMIT,
  countWords,
  useDonate,
} from '@/hooks/useDonate';
import { cn } from '@/lib/utils';

const ZERO_ID = '0x' + '0'.repeat(64);

interface DonateButtonProps {
  clipId?: string;
  recipient: string;
  recipientLabel?: string;
  className?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  iconOnly?: boolean;
}

const QUICK_AMOUNTS = [0.1, 0.5, 1, 5];

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function DonateButton({
  clipId,
  recipient,
  recipientLabel,
  className,
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
}: DonateButtonProps) {
  const account = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const { donate, isPending } = useDonate();
  const { formatted } = useSuiBalance({ address: account?.address });

  const isSelf =
    account?.address?.toLowerCase() === recipient.toLowerCase();
  if (isSelf) return null;

  const words = countWords(message);
  const overLimit = words > DONATE_MESSAGE_WORD_LIMIT;
  const parsedAmount = Number(amount);
  const amountInvalid =
    amount.trim() === '' || !Number.isFinite(parsedAmount) || parsedAmount <= 0;
  const canSubmit = !amountInvalid && !overLimit && !isPending;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      setAmount('');
      setMessage('');
    }
  };

  const handleSubmit = async () => {
    const digest = await donate({
      clipId: clipId ?? ZERO_ID,
      recipient,
      amountSui: parsedAmount,
      message,
    });
    if (digest) {
      setOpen(false);
      setAmount('');
      setMessage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={iconOnly ? 'icon' : size}
          variant={variant}
          disabled={!account}
          aria-label={`Donate to ${recipientLabel ?? shortAddress(recipient)}`}
          title={iconOnly ? 'Donate' : undefined}
          className={cn(
            iconOnly ? 'size-8 shrink-0 rounded-full' : 'gap-1.5',
            className
          )}
        >
          <HeartHandshakeIcon className={iconOnly ? 'size-4' : 'size-4'} />
          {iconOnly ? null : 'Donate'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a donation</DialogTitle>
          <DialogDescription>
            Signed and paid from your connected wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
          <Avatar
            address={recipient}
            className="size-10 shrink-0 overflow-hidden rounded-full"
          />
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs">Recipient</span>
            <span className="text-foreground truncate font-mono text-sm">
              {recipientLabel ?? shortAddress(recipient)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="donate-amount">Amount (SUI)</Label>
            {formatted ? (
              <span className="text-muted-foreground text-xs">
                Balance: {formatted}
              </span>
            ) : null}
          </div>
          <Input
            id="donate-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => setAmount(String(value))}
                className="h-7 rounded-full px-3 text-xs"
              >
                {value} SUI
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="donate-message">Message (optional)</Label>
            <span
              className={cn(
                'text-xs',
                overLimit ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {words}/{DONATE_MESSAGE_WORD_LIMIT} words
            </span>
          </div>
          <Textarea
            id="donate-message"
            placeholder="Say something nice…"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isPending}
            aria-invalid={overLimit}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <HeartHandshakeIcon className="size-4" />
            )}
            {isPending ? 'Sending…' : 'Send donation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
