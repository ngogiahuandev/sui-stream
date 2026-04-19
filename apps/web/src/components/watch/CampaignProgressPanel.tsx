'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  CoinsIcon,
  EyeIcon,
  GiftIcon,
  Loader2Icon,
  MessageSquareIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  CAMPAIGN_REWARD_CLAIMED_EVENT_TYPE,
  MIST_PER_SUI,
} from '@/lib/constants';
import type { CampaignSummary } from '@/hooks/useCampaignForClip';
import { useClaimReward } from '@/hooks/useClaimReward';
import { useMissionProgress } from '@/hooks/useMissionProgress';

interface CampaignProgressPanelProps {
  campaign: CampaignSummary;
  clipId: string;
  watchedSeconds: number;
  clipDurationSeconds?: number;
}

function daysLeft(expiresAtMs: number): number {
  const ms = expiresAtMs - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function CampaignProgressPanel({
  campaign,
  clipId,
  watchedSeconds,
  clipDurationSeconds,
}: CampaignProgressPanelProps) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { claim, isPending } = useClaimReward();
  const [collapsed, setCollapsed] = useState(false);

  const hasClaimedQuery = useQuery<boolean>({
    queryKey: ['campaign-claimed', campaign.id, account?.address],
    enabled:
      Boolean(account?.address) && Boolean(CAMPAIGN_REWARD_CLAIMED_EVENT_TYPE),
    staleTime: 10_000,
    queryFn: async () => {
      if (!account?.address) return false;
      let cursor: Parameters<typeof suiClient.queryEvents>[0]['cursor'] = null;
      for (let i = 0; i < 6; i += 1) {
        const page = await suiClient.queryEvents({
          query: { MoveEventType: CAMPAIGN_REWARD_CLAIMED_EVENT_TYPE },
          cursor,
          limit: 200,
          order: 'descending',
        });
        for (const ev of page.data) {
          const p = ev.parsedJson as {
            campaign_id?: string;
            viewer?: string;
          } | null;
          if (p?.campaign_id === campaign.id && p.viewer === account.address) {
            return true;
          }
        }
        if (!page.hasNextPage || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
      return false;
    },
  });

  const hasClaimed = Boolean(hasClaimedQuery.data);
  const rewardSui = Number(campaign.rewardPerClaimMist) / MIST_PER_SUI;
  const remaining = daysLeft(campaign.expiresAtMs);

  const progress = useMissionProgress({
    clipId,
    viewer: hasClaimed ? undefined : account?.address,
    requiredMask: hasClaimed ? 0 : campaign.requiredMask,
    watchedSeconds,
    clipDurationSeconds,
  });

  const isOwner = Boolean(account?.address && account.address === campaign.creator);
  const now = Date.now();
  const expired = now >= campaign.expiresAtMs;
  const exhausted = campaign.claimsRemaining === 0;
  const claimable =
    Boolean(account) &&
    !isOwner &&
    campaign.active &&
    !expired &&
    !exhausted &&
    progress.allDone &&
    !hasClaimed;

  const progressPct = useMemo(() => {
    if (campaign.maxClaims === 0) return 0;
    return Math.min(
      100,
      Math.round((campaign.claimsMade / campaign.maxClaims) * 100)
    );
  }, [campaign.claimsMade, campaign.maxClaims]);

  const status = (() => {
    if (!account) return 'Connect wallet to earn';
    if (isOwner) return 'You created this campaign';
    if (hasClaimed) return 'You already claimed this reward';
    if (expired) return 'Campaign ended';
    if (exhausted) return 'All rewards claimed';
    if (!campaign.active) return 'Rewards paused';
    if (progress.allDone) return 'Ready to claim';
    return 'Complete every mission to claim';
  })();

  const handleClaim = async () => {
    await claim({
      campaignId: campaign.id,
      clipId,
      watchedSeconds: Math.floor(watchedSeconds),
    });
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-background shadow-lg md:right-6 md:bottom-6">
      <header
        className="flex cursor-pointer items-start justify-between gap-3 p-4"
        onClick={() => setCollapsed((v) => !v)}
        role="button"
        aria-expanded={!collapsed}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CoinsIcon className="size-4" />
            Earn {rewardSui.toFixed(4)} SUI
          </div>
          <p className="text-muted-foreground text-xs">{status}</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((v) => !v);
          }}
          className="-mr-1 -mt-1 size-7 shrink-0"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )}
        </Button>
      </header>

      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-col gap-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {campaign.claimsMade} / {campaign.maxClaims} claimed
              </span>
              <div className="flex items-center gap-2">
                <span>{campaign.claimsRemaining} slots left</span>
                <span>·</span>
                <span>{remaining}d left</span>
              </div>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {hasClaimed ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              <CheckCircle2Icon className="size-4 shrink-0" />
              You already claimed {rewardSui.toFixed(4)} SUI
            </div>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {progress.viewRequired ? (
                <MissionRow
                  icon={EyeIcon}
                  label="Watch"
                  sub={`${Math.min(
                    Math.floor(watchedSeconds),
                    progress.viewRequiredSeconds
                  )}s / ${progress.viewRequiredSeconds}s`}
                  done={progress.viewDone}
                />
              ) : null}
              {progress.likeRequired ? (
                <MissionRow
                  icon={ThumbsUpIcon}
                  label="Upvote this clip"
                  done={progress.likeDone}
                  loading={progress.isLoading && !progress.likeDone}
                />
              ) : null}
              {progress.commentRequired ? (
                <MissionRow
                  icon={MessageSquareIcon}
                  label="Post a comment"
                  done={progress.commentDone}
                  loading={progress.isLoading && !progress.commentDone}
                />
              ) : null}
            </ul>
          )}

          {!hasClaimed && (
            <Button
              type="button"
              onClick={handleClaim}
              disabled={!claimable || isPending}
              className="w-full"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <GiftIcon className="size-4" />
              )}
              {claimable
                ? `Claim ${rewardSui.toFixed(4)} SUI`
                : 'Finish missions to claim'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface MissionRowProps {
  icon: LucideIcon;
  label: string;
  sub?: string;
  done: boolean;
  loading?: boolean;
}

function MissionRow({ icon: Icon, label, sub, done, loading }: MissionRowProps) {
  return (
    <li className="flex items-center gap-3">
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        {loading ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : done ? (
          <CheckCircle2Icon className="size-3.5" />
        ) : (
          <CircleIcon className="size-3.5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="size-3.5 shrink-0" />
          <span className={cn(done && 'text-foreground', 'truncate')}>
            {label}
          </span>
        </div>
        {sub ? (
          <span className="text-muted-foreground text-xs">{sub}</span>
        ) : null}
      </div>
    </li>
  );
}
