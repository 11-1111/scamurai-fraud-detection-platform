import { Module } from '@nestjs/common';

import { FraudModule } from '../fraud/fraud.module';
import { FraudIngestionController } from './fraud-ingestion.controller';
import { FraudIngestionService } from './fraud-ingestion.service';

@Module({
  imports: [FraudModule],
  controllers: [FraudIngestionController],
  providers: [FraudIngestionService],
})
export class FraudIngestionModule {}
