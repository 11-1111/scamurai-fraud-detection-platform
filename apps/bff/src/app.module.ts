import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { TransactionsModule } from './transactions/transactions.module';
import { FraudConfigModule } from './fraud-config/fraud-config.module';
import { FraudAlertsModule } from './fraud-alerts/fraud-alerts.module';
import { FraudIngestionModule } from './fraud-ingestion/fraud-ingestion.module';

@Module({
  imports: [
    HttpModule,
    TransactionsModule,
    FraudConfigModule,
    FraudAlertsModule,
    FraudIngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
