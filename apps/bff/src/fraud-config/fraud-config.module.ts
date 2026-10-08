import { Module } from '@nestjs/common';

import { FraudModule } from '../fraud/fraud.module';
import { FraudConfigController } from './fraud-config.controller';
import { FraudConfigService } from './fraud-config.service';

@Module({
  imports: [FraudModule],
  controllers: [FraudConfigController],
  providers: [FraudConfigService],
  exports: [FraudConfigService],
})
export class FraudConfigModule {}
