import { AcceptInviteForm } from '@/components/Invitations/AcceptInviteForm';

export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <AcceptInviteForm token={searchParams.token || ''} />
    </main>
  );
}
