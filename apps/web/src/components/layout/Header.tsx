import { Logo } from '@/components/layout/Logo';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { ConnectWalletButton } from '@/components/layout/ConnectWalletButton';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function Header() {
  return (
    <header className="border-border/60 bg-background/70 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Logo />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <HeaderNav />
        </div>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
