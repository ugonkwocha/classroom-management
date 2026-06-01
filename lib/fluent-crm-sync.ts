import prisma from '@/lib/prisma';

type CrmSyncInput = {
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentFirstName?: string | null;
  parentLastName?: string | null;
  paidTag?: string | null;
  leadTag?: string | null;
  removeLeadTagOnPaid?: boolean;
};

type CrmSyncResult = {
  status: 'SYNCED' | 'FAILED' | 'SKIPPED';
  contactId?: string | null;
  error?: string | null;
};

export async function syncPaidCustomerToCrm(input: CrmSyncInput): Promise<CrmSyncResult> {
  const endpoint = process.env.FLUENTCRM_SYNC_ENDPOINT;

  if (!input.paidTag) {
    return { status: 'SKIPPED', error: 'No paid FluentCRM tag configured' };
  }

  if (!endpoint) {
    return {
      status: 'FAILED',
      error: 'FLUENTCRM_SYNC_ENDPOINT is not configured',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.FLUENTCRM_SYNC_SECRET
          ? { Authorization: `Bearer ${process.env.FLUENTCRM_SYNC_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        contact: {
          email: input.parentEmail,
          phone: input.parentPhone,
          firstName: input.parentFirstName,
          lastName: input.parentLastName,
        },
        addTags: [input.paidTag],
        removeTags: input.removeLeadTagOnPaid && input.leadTag ? [input.leadTag] : [],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: 'FAILED',
        error: data.error || `FluentCRM sync failed with ${response.status}`,
      };
    }

    return {
      status: 'SYNCED',
      contactId: data.contactId ? String(data.contactId) : null,
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'FluentCRM sync failed',
    };
  }
}

export async function syncPaymentRecordToCrm(paymentRecordId: string) {
  const record = await prisma.enrollmentPaymentRecord.findUnique({
    where: { id: paymentRecordId },
    include: {
      family: {
        include: {
          guardians: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      import: true,
    },
  });

  if (!record) throw new Error('Payment record not found');

  const guardian = record.family.guardians.find((item) => item.isPrimary) || record.family.guardians[0];
  const result = await syncPaidCustomerToCrm({
    parentEmail: guardian?.email || record.import?.parentEmail,
    parentPhone: guardian?.phone || record.import?.parentPhone,
    parentFirstName: guardian?.firstName || record.import?.parentFirstName,
    parentLastName: guardian?.lastName || record.import?.parentLastName,
    paidTag: record.crmTag || record.import?.crmTag,
  });

  return prisma.enrollmentPaymentRecord.update({
    where: { id: paymentRecordId },
    data: {
      crmSyncStatus: result.status,
      crmContactId: result.contactId || null,
      crmError: result.error || null,
    },
  });
}
