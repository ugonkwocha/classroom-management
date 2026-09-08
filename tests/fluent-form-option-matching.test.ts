import { describe, expect, it } from 'vitest';
import {
  findFluentFormOptionMapping,
  normalizeFluentFormOptionText,
} from '@/lib/fluent-form-option-matching';

describe('Fluent Forms option matching', () => {
  it('matches abbreviated months, alternate range wording, and compact times', () => {
    const saved = 'October 3rd to November 28th. 10:30 am - 12:30 pm';
    const submitted = 'Oct 3rd - Nov 28th. 10:30am-12:30pm';

    expect(normalizeFluentFormOptionText(submitted)).toBe(
      normalizeFluentFormOptionText(saved)
    );
  });

  it('matches common dash and meridiem formatting differences', () => {
    const mappings = [
      { id: 'batch-1', sourceOptionText: 'October 3rd – November 28th, 10:30 a.m. – 12:30 p.m.' },
    ];

    expect(
      findFluentFormOptionMapping(mappings, 'Oct 3 - Nov 28. 10:30am-12:30pm')?.id
    ).toBe('batch-1');
  });

  it('does not match a genuinely different time slot', () => {
    const mappings = [
      { id: 'morning', sourceOptionText: 'Oct 3rd - Nov 28th. 10:30am-12:30pm' },
    ];

    expect(
      findFluentFormOptionMapping(mappings, 'Oct 3rd - Nov 28th. 1pm-3pm')
    ).toBeUndefined();
  });
});

