import { PasswordResetForm } from '@/components/PasswordReset/PasswordResetForm';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <PasswordResetForm token={searchParams.token || ''} />
    </main>
  );
}
