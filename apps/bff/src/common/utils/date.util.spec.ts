import { toUtcIsoString } from './date.util';

describe('toUtcIsoString', () => {
  it('returns null for null and undefined', () => {
    expect(toUtcIsoString(null)).toBeNull();
    expect(toUtcIsoString(undefined)).toBeNull();
  });

  it('preserves an existing UTC ISO instant', () => {
    expect(toUtcIsoString('2026-08-09T14:41:17.000Z')).toBe(
      '2026-08-09T14:41:17.000Z',
    );
  });

  it('normalizes timezone-less ASP.NET UTC slash format', () => {
    expect(toUtcIsoString('2026/08/09 14:41:17')).toBe(
      '2026-08-09T14:41:17.000Z',
    );
  });

  it('normalizes timezone-less dash format as UTC', () => {
    expect(toUtcIsoString('2026-08-09 14:41:17')).toBe(
      '2026-08-09T14:41:17.000Z',
    );
  });

  it('does not add three hours during BFF normalization', () => {
    expect(toUtcIsoString('2026/08/09 14:41:17')).not.toBe(
      '2026-08-09T17:41:17.000Z',
    );
  });

  it('converts Date objects to ISO UTC', () => {
    expect(
      toUtcIsoString(new Date('2026-08-09T14:41:17.000Z')),
    ).toBe('2026-08-09T14:41:17.000Z');
  });

  it('returns null for invalid values', () => {
    expect(toUtcIsoString('not-a-date')).toBeNull();
    expect(toUtcIsoString('   ')).toBeNull();
  });
});
