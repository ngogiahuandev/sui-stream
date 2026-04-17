import Link from 'next/link';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 right-[-10%] size-[28rem] rounded-full bg-chart-2/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] size-[24rem] rounded-full bg-chart-1/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,var(--background)_70%)]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28 lg:px-8 lg:pt-36">
        <Link
          href="#features"
          className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          <span>Built on Sui · Walrus · Seal</span>
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <h1 className="mt-6 max-w-4xl font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
          Short videos you{' '}
          <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-1 bg-clip-text text-transparent">
            actually own
          </span>
          .
        </h1>

        <p className="mt-6 max-w-2xl text-base text-muted-foreground text-balance sm:text-lg md:text-xl">
          SuiStream is a decentralized home for sub-60-second clips. Stored on
          Walrus, optionally encrypted with Seal, auto-tagged by AI, and
          permanently yours on the Sui blockchain.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-1.5 px-6 font-semibold">
            <Link href="#upload">
              Start uploading
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="gap-1.5 px-6 font-semibold"
          >
            <Link href="#discover">
              <Play aria-hidden="true" />
              Watch the feed
            </Link>
          </Button>
        </div>

        <dl className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 border-t border-border/60 pt-8 text-left sm:gap-8">
          <div>
            <dt className="text-xs text-muted-foreground sm:text-sm">
              Max clip length
            </dt>
            <dd className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              60s
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground sm:text-sm">
              Storage
            </dt>
            <dd className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Walrus
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground sm:text-sm">
              Ownership
            </dt>
            <dd className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              On-chain
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
