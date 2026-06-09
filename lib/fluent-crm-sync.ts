import prisma from '@/lib/prisma';

type CrmSyncInput = {
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentFirstName?: string | null;
  parentLastName?: string | null;
  paidTag?: string | null;
  paidTags?: Array<string | null | undefined>;
  leadTag?: string | null;
  removeLeadTagOnPaid?: boolean;
};

type CrmSyncResult = {
  status: 'SYNCED' | 'FAILED' | 'SKIPPED';
  contactId?: string | null;
  error?: string | null;
};

function normalizeTagList(tags: Array<unknown>) {
  return Array.from(new Set(
    tags
      .flatMap((tag) => String(tag || '').split(','))
      .map((tag) => tag.trim())
      .filter(Boolean)
  ));
}

export async function syncPaidCustomerToCrm(input: CrmSyncInput): Promise<CrmSyncResult> {
  const endpoint = process.env.FLUENTCRM_SYNC_ENDPOINT;
  const paidTags = normalizeTagList([...(input.paidTags || []), input.paidTag]);
  const primaryPaidTag = paidTags[0] || null;
  const leadTags = input.removeLeadTagOnPaid && input.leadTag ? normalizeTagList([input.leadTag]) : [];

  if (paidTags.length === 0) {
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
        email: input.parentEmail,
        phone: input.parentPhone,
        firstName: input.parentFirstName,
        lastName: input.parentLastName,
        paidTag: primaryPaidTag,
        paidTags,
        tag: primaryPaidTag,
        tags: paidTags,
        addTags: paidTags,
        addTagIds: paidTags.filter((tag) => /^\d+$/.test(tag)).map((tag) => Number(tag)),
        addTagNames: paidTags,
        addTagSlugs: paidTags,
        removeTag: leadTags[0] || null,
        removeTags: leadTags,
        leadTag: input.leadTag || null,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: 'FAILED',
        error: data.error || `FluentCRM sync failed with ${response.status}`,
      };
    }

    const appliedTags = normalizeTagList([
      data.appliedTags,
      data.appliedTag,
      data.tagsApplied,
      data.addedTags,
    ]);

    if (appliedTags.length === 0) {
      return {
        status: 'FAILED',
        contactId: data.contactId ? String(data.contactId) : null,
        error: data.message
          ? `${data.message} The WordPress endpoint did not confirm any applied paid tags.`
          : 'The WordPress endpoint did not confirm any applied paid tags.',
      };
    }

    const appliedTagSet = new Set(appliedTags.map((tag) => tag.toLowerCase()));
    const missingTags = paidTags.filter((tag) => !appliedTagSet.has(tag.toLowerCase()));
    if (missingTags.length > 0) {
      return {
        status: 'FAILED',
        contactId: data.contactId ? String(data.contactId) : null,
        error: `WordPress did not confirm these paid tags: ${missingTags.join(', ')}`,
      };
    }

    return {
      status: 'SYNCED',
      contactId: data.contactId ? String(data.contactId) : null,
      error: data.message || data.note || null,
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
