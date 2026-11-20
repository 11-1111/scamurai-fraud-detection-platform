import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';

@ApiTags('Ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Run an ingestion pass now',
    description:
      'Reads the next batch from the upstream database and processes it. ' +
      'Safe to call repeatedly: the cursor only advances past transactions ' +
      'that were ingested, transactions are upserted by primary key and ' +
      'identifiers are deduplicated, so a repeated call re-processes at ' +
      'most the batch that was in flight. It does not yet take a lock, so ' +
      'two concurrent calls can both run.',
  })
  async sync() {
    const result = await this.ingestionService.runManualSync();

    return {
      message: 'Fraud ingestion sync completed',
      result,
    };
  }
}
