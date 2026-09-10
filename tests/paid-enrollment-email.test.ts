import { describe, expect, it } from 'vitest';
import { buildPaidEnrollmentConfirmationEmail } from '@/lib/email';

describe('paid enrollment confirmation email', () => {
  it('uses stacked enrollment details that fit narrow email clients', () => {
    const email = buildPaidEnrollmentConfirmationEmail({
      recipient: { email: 'parent@example.com', name: 'Test Parent' },
      programName: 'October Weekend',
      programYear: 2026,
      enrollments: [{
        studentName: 'Akachukwu Nkw&ocha',
        batchNumber: 1,
        priceLabel: 'Sibling Discount',
        amount: 54_000,
      }],
      totalAmount: 54_000,
    });

    expect(email.html).toContain('width="100%"');
    expect(email.html).toContain('table-layout:fixed');
    expect(email.html).toContain('overflow-wrap:anywhere');
    expect(email.html).toContain('>Batch</td>');
    expect(email.html).toContain('>Price</td>');
    expect(email.html).toContain('>Amount</td>');
    expect(email.html).toContain('₦54,000');
    expect(email.html).toContain('Akachukwu Nkw&amp;ocha');
    expect(email.html).not.toContain('<thead>');
  });
});
