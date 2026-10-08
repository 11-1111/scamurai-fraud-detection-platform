import { Module } from '@nestjs/common';

import { FraudModule } from '../fraud/fraud.module';
import { FraudAlertsController } from './fraud-alerts.controller';
import { FraudAlertsService } from './fraud-alerts.service';

@Module({
  imports: [FraudModule],
  controllers: [FraudAlertsController],
  providers: [FraudAlertsService],
})
export class FraudAlertsModule {}
