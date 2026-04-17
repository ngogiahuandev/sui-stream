import { Upload, Sparkles, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  index: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: readonly Step[] = [
  {
    index: '01',
    icon: Upload,
    title: 'Upload a clip',
    description:
      'Drop in any video up to 60 seconds. We extract a thumbnail and keyframes locally — your file never touches a centralized server.',
  },
  {
    index: '02',
    icon: Sparkles,
    title: 'AI tags it, Walrus stores it',
    description:
      'Keyframes are tagged by a vision model. The blob is uploaded to Walrus and minted as a Clip object on Sui in one transaction.',
  },
  {
    index: '03',
    icon: Play,
    title: 'Discover & watch',
    description:
      'The feed indexes every Clip event so viewers can scroll, search by tag, and stream straight from Walrus — public or Seal-gated.',
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative isolate border-y border-border/60 bg-muted/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            How it works
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            From record to on-chain in three steps.
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.index}
                className="relative flex flex-col gap-4 rounded-2xl border border-border/70 bg-background p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm font-bold tracking-widest text-muted-foreground">
                    {step.index}
                  </span>
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="font-heading text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {idx < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-border md:block"
                  >
                    →
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
