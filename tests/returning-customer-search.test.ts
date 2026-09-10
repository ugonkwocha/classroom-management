import { describe, expect, it } from 'vitest';
import { resolveExternalRegistrationLookup } from '@/lib/returning-customer-search';
import { extractFluentFormSubmissionCandidates } from '@/lib/wordpress-registrations';

describe('returning customer search', () => {
  it('routes a phone number to WordPress phone search', () => {
    expect(resolveExternalRegistrationLookup('+234 803 123 4567', 'contact')).toEqual({
      phone: '+234 803 123 4567',
    });
  });

  it('routes email and name searches correctly', () => {
    expect(resolveExternalRegistrationLookup('parent@example.com', 'contact')).toEqual({
      email: 'parent@example.com',
    });
    expect(resolveExternalRegistrationLookup('Ada Okafor', 'contact')).toEqual({
      query: 'Ada Okafor',
    });
  });

  it('keeps submission ID as an explicit advanced lookup', () => {
    expect(resolveExternalRegistrationLookup('12604', 'submission')).toEqual({
      submissionId: '12604',
    });
  });

  it('extracts candidate entry and form IDs from Fluent Forms search results', () => {
    expect(extractFluentFormSubmissionCandidates({
      current_page: 1,
      data: [
        { id: 12604, form_id: 14, status: 'read' },
        { id: '12605', form_id: '14', status: 'unread' },
        { id: null, form_id: 14 },
      ],
    })).toEqual([
      { id: '12604', formId: '14' },
      { id: '12605', formId: '14' },
    ]);
  });

  it('accepts a nested response wrapper from WordPress middleware', () => {
    expect(extractFluentFormSubmissionCandidates({
      data: {
        data: [{ id: 12606, form_id: 14 }],
      },
    })).toEqual([{ id: '12606', formId: '14' }]);
  });
});
