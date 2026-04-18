import { UserView } from '@/components/user/UserView';

interface UserPageProps {
  params: Promise<{ address: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { address } = await params;
  return <UserView address={address} />;
}
