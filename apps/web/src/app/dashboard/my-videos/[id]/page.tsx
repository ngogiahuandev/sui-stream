import { MyClipView } from '@/components/my-clip/MyClipView';

interface MyClipPageProps {
  params: Promise<{ id: string }>;
}

export default async function MyClipPage({ params }: MyClipPageProps) {
  const { id } = await params;
  return <MyClipView id={id} />;
}
