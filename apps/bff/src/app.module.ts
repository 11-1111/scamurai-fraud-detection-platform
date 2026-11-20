import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { TransactionsModule } from './transactions/transactions.module';
import { FraudConfigModule } from './fraud-config/fraud-config.module';
import { FraudAlertsModule } from './fraud-alerts/fraud-alerts.module';
import { FraudIngestionModule } from './fraud-ingestion/fraud-ingestion.module';
import { HealthModule } from './health/health.module';
import { CorrelationIdMiddleware } from './observability/correlation-id.middleware';

@Module({
  imports: [
    HttpModule,
    TransactionsModule,
    FraudConfigModule,
    FraudAlertsModule,
    FraudIngestionModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /*
   * The BFF is where a correlation id usually originates, since it is the
   * only service a browser reaches. Everything downstream inherits the id it
   * mints here.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
