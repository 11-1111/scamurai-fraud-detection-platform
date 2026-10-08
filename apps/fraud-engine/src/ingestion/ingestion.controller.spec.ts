import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

describe('IngestionController', () => {
  it('POST /ingestion/sync calls runManualSync()', async () => {
    const ingestionService = {
      runManualSync: jest.fn().mockResolvedValue({
        ingested: 2,
        alertsCreated: 1,
        alertsSkipped: 1,
        lastSyncedAt: new Date('2026-08-03T00:00:00.000Z'),
        lastSyncedTransactionId: 'tx-2',
      }),
    };

    const controller = new IngestionController(
      ingestionService as unknown as IngestionService,
    );

    const response = await controller.sync();

    expect(ingestionService.runManualSync).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      message: 'Fraud ingestion sync completed',
      result: {
        ingested: 2,
        alertsCreated: 1,
        alertsSkipped: 1,
        lastSyncedAt: new Date('2026-08-03T00:00:00.000Z'),
        lastSyncedTransactionId: 'tx-2',
      },
    });
  });
});
