import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';

@ApiTags('Ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run an ingestion pass now',
    description:
      'Reads the next batch from the upstream database and processes it. ' +
      'Safe to call repeatedly. Transactions are upserted by primary key, ' +
      'identifiers are deduplicated by a unique constraint, the graph write ' +
      'is a MERGE, and the cursor only advances past transactions that were ' +
      'ingested -- so a repeated call converges on the same state and ' +
      're-processes at most the batch that was in flight. ' +
      'Only one run happens at a time. A request arriving while a run is in ' +
      'progress -- whether another request or the scheduled poll -- returns ' +
      'immediately with `skipped: true` rather than queueing behind it.',
  })
  @ApiResponse({
    status: 200,
    description:
      'The run completed, or was skipped because one was already in ' +
      'progress. `result.skipped` distinguishes the two; both report zero ' +
      'ingested when there was nothing to do.',
  })
  async sync() {
    const result = await this.ingestionService.runManualSync();

    return {
      message:
        'skipped' in result && result.skipped
          ? 'An ingestion run is already in progress'
          : 'Fraud ingestion sync completed',
      result,
    };
  }
}
