import { mapBackendTransaction } from './transaction.mapper';

describe('mapBackendTransaction', () => {
  it('converts ASP.NET timezone-less UTC date to ISO-8601', () => {
    const mapped = mapBackendTransaction({
      date: '2026/08/09 14:41:17',
      paymentAccount: null,
      confirmation_code: null,
      merchant: { name: 'Shop' },
      amount: { value: '100', currency: 'KES' },
      status: { text: 'Approved', type: 'success' },
      customer: {},
    });

    expect(mapped.date).toBe('2026-08-09T14:41:17.000Z');
  });

  it('preserves already-normalized ISO timestamps', () => {
    const mapped = mapBackendTransaction({
      date: '2026-08-09T14:41:17.000Z',
      paymentAccount: null,
      confirmation_code: null,
      merchant: { name: 'Shop' },
      amount: { value: '100', currency: 'KES' },
      status: { text: 'Approved', type: 'success' },
      customer: {},
    });

    expect(mapped.date).toBe('2026-08-09T14:41:17.000Z');
  });
});
