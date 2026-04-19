import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectWalletButton } from '@/components/layout/ConnectWalletButton';

export function CTASection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="border-border/70 from-primary/15 via-background to-chart-2/15 relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br p-8 shadow-sm sm:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="bg-primary/20 absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
          <div className="bg-chart-2/20 absolute -bottom-24 -left-24 size-72 rounded-full blur-3xl" />
        </div>

        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Start creating in under a minute.
          </h2>
          <p className="text-muted-foreground mt-4 text-base sm:text-lg">
            Connect your Sui wallet, drop a video, and watch it land on-chain —
            AI-tagged, indexed, and instantly shareable. Gas fees on us.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <ConnectWalletButton className="h-10 px-5" />
            <Button asChild size="lg" variant="outline" className="gap-1.5">
              <Link href="/dashboard/discover">
                Explore clips
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
