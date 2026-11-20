import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { FraudServiceHealthIndicator } from './fraud-service.health';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [FraudServiceHealthIndicator],
})
export class HealthModule {}
