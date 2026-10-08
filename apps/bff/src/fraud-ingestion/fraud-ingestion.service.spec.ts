import { Test, TestingModule } from '@nestjs/testing';

import { FraudIngestionService } from './fraud-ingestion.service';
import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';

describe('FraudIngestionService', () => {
  let service: FraudIngestionService;
  let fraudClient: { post: jest.Mock };

  beforeEach(async () => {
    fraudClient = { post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudIngestionService,
        { provide: FraudServiceClient, useValue: fraudClient },
      ],
    }).compile();

    service = module.get(FraudIngestionService);
  });

  it('forwards manual ingestion sync to the fraud microservice', async () => {
    fraudClient.post.mockResolvedValueOnce({
      message: 'Fraud ingestion sync completed',
      result: { processed: 10 },
    });

    await expect(service.sync()).resolves.toEqual({
      message: 'Fraud ingestion sync completed',
      result: { processed: 10 },
    });

    expect(fraudClient.post).toHaveBeenCalledWith('/ingestion/sync');
  });
});
