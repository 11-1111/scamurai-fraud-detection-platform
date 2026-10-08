import { Injectable } from '@nestjs/common';

import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';
import { FraudIngestionSyncResponseDto } from '../fraud/dto/fraud.dto';
import { UpstreamIngestionSyncResponse } from '../fraud/dto/upstream-fraud.types';

@Injectable()
export class FraudIngestionService {
  constructor(private readonly fraudClient: FraudServiceClient) {}

  async sync(): Promise<FraudIngestionSyncResponseDto> {
    const upstream = await this.fraudClient.post<UpstreamIngestionSyncResponse>(
      '/ingestion/sync',
    );
    return {
      message: upstream.message,
      result: upstream.result,
    };
  }
}
