import { FeatureUtilsService } from '../feature-utils.service';
import { OrderTrackingIdSuccessExistsFeature } from './order-tracking-id-success-exists.feature';

describe('OrderTrackingIdSuccessExistsFeature', () => {
  let utils: { successfulTransactionExists: jest.Mock };
  let feature: OrderTrackingIdSuccessExistsFeature;

  beforeEach(() => {
    utils = {
      successfulTransactionExists: jest.fn(),
    };
    feature = new OrderTrackingIdSuccessExistsFeature(
      utils as unknown as FeatureUtilsService,
    );
  });

  it('returns false when no earlier successful transaction exists', async () => {
    utils.successfulTransactionExists.mockResolvedValue(false);

    const result = await feature.calculate({
      type: 'order_tracking_id',
      value: 'ORD-1001',
      relatedIdentifiers: {
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      },
      transaction: {
        id: 'tx-2',
        orderTrackingId: 'ORD-1001',
      } as never,
    });

    expect(result).toBe(false);
    expect(typeof result).toBe('boolean');
    expect(utils.successfulTransactionExists).toHaveBeenCalledWith(
      'ORD-1001',
      'tx-2',
    );
  });

  it('returns true when one or more matching successful transactions exist', async () => {
    utils.successfulTransactionExists.mockResolvedValue(true);

    const result = await feature.calculate({
      type: 'email',
      value: 'a@b.com',
      relatedIdentifiers: {
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      },
      transaction: {
        id: 'tx-2',
        orderTrackingId: 'ORD-1001',
      } as never,
    });

    expect(result).toBe(true);
    expect(typeof result).toBe('boolean');
  });

  it('returns false when order tracking id is missing', async () => {
    const result = await feature.calculate({
      type: 'email',
      value: 'a@b.com',
      relatedIdentifiers: {
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      },
      transaction: {
        id: 'tx-2',
      } as never,
    });

    expect(result).toBe(false);
    expect(utils.successfulTransactionExists).not.toHaveBeenCalled();
  });
});
