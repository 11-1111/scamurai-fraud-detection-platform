import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { FraudServiceClient } from './infrastructure/fraud-service.client';

@Module({
  imports: [HttpModule],
  providers: [FraudServiceClient],
  exports: [FraudServiceClient],
})
export class FraudModule {}
