import { PasswordResetForm } from '@/components/PasswordReset/PasswordResetForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <PasswordResetForm token={params.token || ''} />
    </main>
  );
}
