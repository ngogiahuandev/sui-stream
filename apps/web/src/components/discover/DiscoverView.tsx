'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  SparklesIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  XIcon,
  CompassIcon,
  Wand2Icon,
  Loader2Icon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { ClipGridSkeleton } from '@/components/clips/ClipGridSkeleton';
import { usePublicClips } from '@/hooks/usePublicClips';
import { useAiDiscover } from '@/hooks/useAiDiscover';
import { SUI_STREAM_PACKAGE_ID } from '@/lib/constants';
import type { Clip } from '@/types/clip';

function extractTags(clips: Clip[]): string[] {
  const tagSet = new Set<string>();
  for (const clip of clips) {
    for (const tag of clip.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

interface TagFilterBarProps {
  availableTags: string[];
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}

function formatTag(tag: string): string {
  const special: Record<string, string> = {
    ai: 'Ai',
    ml: 'ML',
    llm: 'LLM',
    nft: 'NFT',
    defi: 'DeFi',
    web3: 'Web3',
    crypto: 'Crypto',
  };
  const lower = tag.toLowerCase();
  if (special[lower]) return special[lower];
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function TagFilterBar({
  availableTags,
  selectedTags,
  onTagClick,
  onTagRemove,
}: TagFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (availableTags.length === 0) return null;

  const isSelected = (tag: string) => selectedTags.includes(tag);

  const sorted = [...availableTags].sort((a, b) => {
    const aSelected = selectedTags.includes(a);
    const bSelected = selectedTags.includes(b);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  const handleClick = (tag: string) => {
    if (isSelected(tag)) {
      onTagRemove(tag);
    } else {
      onTagClick(tag);
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    });
  };

  return (
    <div ref={scrollRef} className="scrollbar-hide flex gap-2 overflow-x-auto">
      {sorted.map((tag) => (
        <Button
          key={tag}
          variant={isSelected(tag) ? 'default' : 'secondary'}
          size="sm"
          onClick={() => handleClick(tag)}
        >
          {formatTag(tag)}
        </Button>
      ))}
    </div>
  );
}

export function DiscoverView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');

  const tagsParam = searchParams.get('tags');
  const selectedTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

  const {
    data: clips,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = usePublicClips();

  const {
    picks: aiPicks,
    isSuggesting,
    suggest: runAiDiscover,
    clear: clearAiPicks,
  } = useAiDiscover();

  const availableTags = clips ? extractTags(clips) : [];

  let filteredClips: Clip[] = clips ?? [];
  if (aiPicks && clips) {
    const byId = new Map(clips.map((c) => [c.id, c]));
    filteredClips = aiPicks.clipIds
      .map((id) => byId.get(id))
      .filter((c): c is Clip => Boolean(c));
  } else if (selectedTags.length > 0 && clips) {
    filteredClips = clips.filter((clip) =>
      selectedTags.some((tag) => clip.tags.includes(tag))
    );
  }

  const handleTagClick = useCallback(
    (tag: string) => {
      const newTags = selectedTags.includes(tag)
        ? selectedTags
        : [...selectedTags, tag];
      const params = new URLSearchParams(searchParams.toString());
      if (newTags.length > 0) {
        params.set('tags', newTags.join(','));
      } else {
        params.delete('tags');
      }
      router.push(`/dashboard/discover?${params.toString()}`);
      clearAiPicks();
    },
    [router, searchParams, selectedTags, clearAiPicks]
  );

  const handleAiSuggest = useCallback(async () => {
    if (!aiQuery.trim() || !clips) return;
    await runAiDiscover(aiQuery, clips);
    setAiDialogOpen(false);
    setAiQuery('');
  }, [aiQuery, clips, runAiDiscover]);

  const handleTagRemove = useCallback(
    (tag: string) => {
      const newTags = selectedTags.filter((t) => t !== tag);
      const params = new URLSearchParams(searchParams.toString());
      if (newTags.length > 0) {
        params.set('tags', newTags.join(','));
      } else {
        params.delete('tags');
      }
      router.push(`/dashboard/discover?${params.toString()}`);
      clearAiPicks();
    },
    [router, searchParams, selectedTags, clearAiPicks]
  );

  if (!SUI_STREAM_PACKAGE_ID) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center">
        <CompassIcon className="text-muted-foreground size-8" />
        <h2 className="text-lg font-semibold">Package not configured</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Set <code>NEXT_PUBLIC_SUI_STREAM_PACKAGE</code> in
          <code> apps/web/.env.local</code> after deploying the Move package.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setAiDialogOpen(true)}
            className="gap-1.5"
          >
            <SparklesIcon className="size-4" />
            Surprise me
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCwIcon
            className={isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
          />
          Refresh
        </Button>
      </header>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-5" />
              AI Video Discovery
            </DialogTitle>
            <DialogDescription>
              Describe what kind of videos you want to watch, and AI will
              suggest relevant tags to filter clips.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., funny cat videos, cooking tutorials, dance challenges..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="min-h-24 resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiDialogOpen(false)}
              disabled={isSuggesting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAiSuggest}
              disabled={!aiQuery.trim() || isSuggesting || !clips}
            >
              {isSuggesting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Wand2Icon className="size-4" />
              )}
              {isSuggesting ? 'Thinking…' : 'Suggest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {aiPicks ? (
        <div className="0 border-primary flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <SparklesIcon className="size-3.5" />
              AI picks for "{aiPicks.query}"
            </span>
            {aiPicks.explanation ? (
              <p className="text-muted-foreground text-sm">
                {aiPicks.explanation}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAiPicks}
            className="gap-1.5"
          >
            <XIcon className="size-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      <TagFilterBar
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagClick={handleTagClick}
        onTagRemove={handleTagRemove}
      />

      {isLoading ? (
        <ClipGridSkeleton />
      ) : isError ? (
        <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <h2 className="text-base font-semibold">Could not load clips</h2>
          <p className="text-muted-foreground text-sm">
            Check your network connection and try again.
          </p>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      ) : !clips || clips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <CompassIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No clips yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Be the first to publish — your clip will appear here for everyone on
            SuiStream.
          </p>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/dashboard/upload">
              <UploadCloudIcon className="size-4" />
              Upload a clip
            </Link>
          </Button>
        </div>
      ) : filteredClips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <CompassIcon className="text-muted-foreground size-8" />
          <h2 className="text-base font-semibold">No clips match filters</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Try removing some filters to see more clips.
          </p>
          {selectedTags.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTagRemove(selectedTags[0])}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <ClipGrid clips={filteredClips} />
      )}
    </section>
  );
}
