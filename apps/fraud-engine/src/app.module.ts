import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { SourceTransactionEntity } from './database/entities/source-transaction.entity';
import { FraudTransactionEntity } from './database/entities/fraud-transaction.entity';
import { FraudIdentifierEntity } from './database/entities/fraud-identifier.entity';
import { FraudIngestionStateEntity } from './database/entities/fraud-ingestion-state.entity';
import { FraudIngestionConfigEntity } from './database/entities/fraud-ingestion-config.entity';
import { FraudRuleConfigEntity } from './database/entities/fraud-rule-config.entity';
import { FraudRiskLevelEntity } from './database/entities/fraud-risk-level.entity';
import { FraudPolicyRuleEntity } from './database/entities/fraud-policy-rule.entity';
import { FraudAlertEntity } from './database/entities/fraud-alert.entity';
import { FraudAlertTriggeredRuleEntity } from './database/entities/fraud-alert-triggered-rule.entity';
import { FraudAlertPolicyActionEntity } from './database/entities/fraud-alert-policy-action.entity';
import { FraudAlertNoteEntity } from './database/entities/fraud-alert-note.entity';
import { FraudAlertHistoryEntity } from './database/entities/fraud-alert-history.entity';
import { FraudTransactionEvaluationEntity } from './database/entities/fraud-transaction-evaluation.entity';
import { FraudTransactionFeatureEntity } from './database/entities/fraud-transaction-feature.entity';

import { Neo4jModule } from './neo4j/neo4j.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { BullMqModule } from './ingestion/queue/bullmq/bullmq.module';
import { FraudModule } from './fraud/fraud.module';
import { FraudAlertsModule } from './fraud-alerts/fraud-alerts.module';
import { FraudEvaluationModule } from './fraud-evaluation/fraud-evaluation.module';

function parseSqlServerPort(portKey: string, portValue: string): number {
  const parsed = Number(portValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid SQL Server port configuration: ${portKey} must be a positive integer, received "${portValue}".`,
    );
  }

  return parsed;
}

function createSqlServerConnection(
  config: ConfigService,
  hostKey: string,
  portKey: string,
  instanceKey: string,
  databaseKey: string,
  usernameKey: string,
  passwordKey: string,
  entities: TypeOrmModuleOptions['entities'],
  synchronize: boolean,
): TypeOrmModuleOptions {
  const portValue = config.get<string>(portKey)?.trim();
  const instanceValue = config.get<string>(instanceKey)?.trim();

  const options: {
    trustServerCertificate: boolean;
    encrypt: boolean;
    useUTC: boolean;
    enableArithAbort: boolean;
    instanceName?: string;
  } = {
    trustServerCertificate: true,
    encrypt: false,
    useUTC: true,
    enableArithAbort: true,
  };

  if (portValue) {
    return {
      type: 'mssql',
      host: config.getOrThrow<string>(hostKey),
      port: parseSqlServerPort(portKey, portValue),
      database: config.getOrThrow<string>(databaseKey),
      username: config.getOrThrow<string>(usernameKey),
      password: config.getOrThrow<string>(passwordKey),
      connectionTimeout: 30000,
      requestTimeout: 120000,
      options,
      extra: {
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      },
      entities,
      synchronize,
      logging: false,
    };
  }

  if (instanceValue) {
    options.instanceName = instanceValue;
  }

  return {
    type: 'mssql',
    host: config.getOrThrow<string>(hostKey),
    database: config.getOrThrow<string>(databaseKey),
    username: config.getOrThrow<string>(usernameKey),
    password: config.getOrThrow<string>(passwordKey),
    connectionTimeout: 30000,
    requestTimeout: 120000,
    options,
    extra: {
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    },
    entities,
    synchronize,
    logging: false,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ScheduleModule.forRoot(),

    /*
     * Existing TransactionsDb.
     * Never allow TypeORM to change its schema.
     */
    TypeOrmModule.forRootAsync({
      name: 'source',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createSqlServerConnection(
          config,
          'SOURCE_DB_HOST',
          'SOURCE_DB_PORT',
          'SOURCE_DB_INSTANCE',
          'SOURCE_DB_NAME',
          'SOURCE_DB_USERNAME',
          'SOURCE_DB_PASSWORD',
          [SourceTransactionEntity],
          false,
        ),
    }),

    /*
     * FraudDb.
     * synchronize is temporarily true to recreate the missing tables.
     */
    TypeOrmModule.forRootAsync({
      name: 'fraud',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createSqlServerConnection(
          config,
          'FRAUD_DB_HOST',
          'FRAUD_DB_PORT',
          'FRAUD_DB_INSTANCE',
          'FRAUD_DB_NAME',
          'FRAUD_DB_USERNAME',
          'FRAUD_DB_PASSWORD',
          [
            FraudTransactionEntity,
            FraudIdentifierEntity,
            FraudIngestionStateEntity,
            FraudIngestionConfigEntity,
            FraudRuleConfigEntity,
            FraudRiskLevelEntity,
            FraudPolicyRuleEntity,
            FraudAlertEntity,
            FraudAlertTriggeredRuleEntity,
            FraudAlertPolicyActionEntity,
            FraudAlertNoteEntity,
            FraudAlertHistoryEntity,
            FraudTransactionEvaluationEntity,
            FraudTransactionFeatureEntity,
          ],
          false,
        ),
    }),

    Neo4jModule,
    BullMqModule,
    IngestionModule,
    FraudModule,
    FraudAlertsModule,
    FraudEvaluationModule,
  ],
})
export class AppModule {}