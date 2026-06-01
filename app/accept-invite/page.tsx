import { AcceptInviteForm } from '@/components/Invitations/AcceptInviteForm';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <AcceptInviteForm token={params.token || ''} />
    </main>
  );
}
