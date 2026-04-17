import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectWalletButton } from '@/components/layout/ConnectWalletButton';

export function CTASection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/15 via-background to-chart-2/15 p-8 shadow-sm sm:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-chart-2/20 blur-3xl" />
        </div>

        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Mint your first clip in under a minute.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Connect a Sui wallet, drop a video, and watch it land on-chain —
            indexed, taggable, and instantly shareable.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <ConnectWalletButton className="h-10 px-5" />
            <Button asChild size="lg" variant="outline" className="gap-1.5">
              <Link href="#docs">
                Read the docs
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
