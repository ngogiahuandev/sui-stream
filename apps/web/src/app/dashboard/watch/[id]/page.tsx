import { WatchView } from '@/components/watch/WatchView';

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = await params;
  return <WatchView id={id} />;
}
