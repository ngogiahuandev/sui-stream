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
        <div className="bg-primary/20 absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="bg-chart-2/20 absolute top-40 right-[-10%] size-[28rem] rounded-full blur-3xl" />
        <div className="bg-chart-1/20 absolute bottom-[-10%] left-[-10%] size-[24rem] rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,var(--background)_70%)]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28 lg:px-8 lg:pt-36">
        <Link
          href="#features"
          className="group border-border/80 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur transition-colors"
        >
          <Sparkles className="text-primary size-3.5" aria-hidden="true" />
          <span>Built on Sui · Walrus · Seal</span>
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <h1 className="font-heading mt-6 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
          Short videos you{' '}
          <span className="from-primary via-chart-2 to-chart-1 bg-gradient-to-r bg-clip-text text-transparent">
            actually own
          </span>
          .
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-base text-balance sm:text-lg md:text-xl">
          Decentralized short video platform built on Sui. Stored on Walrus,
          auto-tagged by AI, with gas fees sponsored — no wallet needed to
          watch, no cost to create.
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

        <dl className="border-border/60 mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 border-t pt-8 text-left sm:gap-8">
          <div>
            <dt className="text-muted-foreground text-xs sm:text-sm">
              Max clip length
            </dt>
            <dd className="font-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              60m
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs sm:text-sm">
              Max file size
            </dt>
            <dd className="font-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              1GB
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs sm:text-sm">
              Ownership
            </dt>
            <dd className="font-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              On-chain
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
