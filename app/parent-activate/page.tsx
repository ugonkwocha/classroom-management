import { ParentActivateForm } from '@/components/ParentPortal/ParentActivateForm';

export default async function ParentActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ParentActivateForm token={params.token || ''} />;
}
