import { normalizePhone } from '@/lib/family-utils';

export type ReturningCustomerSearchKind = 'contact' | 'submission';

export type ExternalRegistrationLookup =
  | { submissionId: string }
  | { email: string }
  | { phone: string }
  | { query: string };

export function resolveExternalRegistrationLookup(
  query: string,
  kind: ReturningCustomerSearchKind
): ExternalRegistrationLookup {
  const value = query.trim();

  if (kind === 'submission') return { submissionId: value };
  if (value.includes('@')) return { email: value };
  if (normalizePhone(value).length >= 7) return { phone: value };
  return { query: value };
}
