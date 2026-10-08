import { Test, TestingModule } from '@nestjs/testing';

import { FraudIngestionController } from './fraud-ingestion.controller';
import { FraudIngestionService } from './fraud-ingestion.service';

describe('FraudIngestionController', () => {
  let controller: FraudIngestionController;
  const service = { sync: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FraudIngestionController],
      providers: [{ provide: FraudIngestionService, useValue: service }],
    }).compile();

    controller = module.get(FraudIngestionController);
  });

  it('delegates sync to the service', async () => {
    service.sync.mockResolvedValueOnce({
      message: 'Fraud ingestion sync completed',
      result: { processed: 10 },
    });

    await expect(controller.sync()).resolves.toEqual({
      message: 'Fraud ingestion sync completed',
      result: { processed: 10 },
    });
  });
});
