import { Lock, Shield, Sparkles, Zap } from 'lucide-react';
import { FeatureCard } from '@/components/home/FeatureCard';

const FEATURES = [
  {
    icon: Shield,
    title: 'Truly decentralized',
    description:
      'Every clip lives as a Sui object you control. No platform can deplatform you, hide your work, or reset your audience.',
  },
  {
    icon: Zap,
    title: 'Walrus-native storage',
    description:
      'Blobs are stored on Walrus and referenced on-chain. No CDN lock-in, no quiet content takedowns, no expiring links.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    description:
      'Toggle Seal encryption to gate clips by allowlist or NFT — decryption happens client-side, only for authorized viewers.',
  },
  {
    icon: Sparkles,
    title: 'AI auto-tagging',
    description:
      'Keyframes are scanned by a vision model on upload, so your clip is discoverable the moment it lands on-chain.',
  },
] as const;

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          Why SuiStream
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
          Short-form video, rebuilt from the chain up.
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          A stack designed for creators who want ownership without giving up
          the snappy, scroll-friendly experience viewers expect.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
}
