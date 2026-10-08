import { Controller, Post } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('sync')
  async sync() {
    const result = await this.ingestionService.runManualSync();

    return {
      message: 'Fraud ingestion sync completed',
      result,
    };
  }
}
