import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { FraudIngestionService } from './fraud-ingestion.service';

@ApiTags('Fraud Ingestion')
@Controller('bff/fraud/ingestion')
export class FraudIngestionController {
  constructor(private readonly service: FraudIngestionService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Trigger manual fraud ingestion sync' })
  sync() {
    return this.service.sync();
  }
}
