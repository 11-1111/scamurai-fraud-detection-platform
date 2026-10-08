import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { FraudModule } from '../fraud/fraud.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [HttpModule, FraudModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
