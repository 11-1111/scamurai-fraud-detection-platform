import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';

import { SourceTransactionEntity } from '../database/entities/source-transaction.entity';
import { FraudTransactionEntity } from '../database/entities/fraud-transaction.entity';
import { FraudIdentifierEntity } from '../database/entities/fraud-identifier.entity';
import { FraudIngestionStateEntity } from '../database/entities/fraud-ingestion-state.entity';
import { FraudEvaluationService } from '../fraud/fraud-evaluation.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { TRANSACTIONS_INGESTION_SOURCE } from './ingestion.constants';

export interface IngestionEmptyResult {
  ingested: 0;
  message: string;
}

export interface IngestionBatchResult {
  ingested: number;
  alertsCreated: number;
  alertsSkipped: number;
  lastSyncedAt: Date | null;
  lastSyncedTransactionId: string | null;
}

export type IngestionRunResult = IngestionEmptyResult | IngestionBatchResult;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly sourceName = TRANSACTIONS_INGESTION_SOURCE;

  constructor(
    @InjectRepository(SourceTransactionEntity, 'source')
    private readonly sourceRepo: Repository<SourceTransactionEntity>,

    @InjectRepository(FraudTransactionEntity, 'fraud')
    private readonly fraudTransactionRepo: Repository<FraudTransactionEntity>,

    @InjectRepository(FraudIdentifierEntity, 'fraud')
    private readonly fraudIdentifierRepo: Repository<FraudIdentifierEntity>,

    @InjectRepository(FraudIngestionStateEntity, 'fraud')
    private readonly ingestionStateRepo: Repository<FraudIngestionStateEntity>,

    private readonly neo4jService: Neo4jService,
    private readonly fraudEvaluationService: FraudEvaluationService,
  ) {}

  async runScheduledSync(): Promise<IngestionRunResult> {
    return this.runIngestion();
  }

  async runManualSync(): Promise<IngestionRunResult> {
    return this.runIngestion();
  }

  async runIngestion(): Promise<IngestionRunResult> {
    this.logger.log('Starting fraud ingestion sync...');

    const state = await this.getOrCreateState();

    const where = state.lastSyncedAt
      ? { createdAt: MoreThan(state.lastSyncedAt) }
      : {};

    const sourceTransactions = await this.sourceRepo.find({
      where,
      order: {
        createdAt: 'ASC',
      },
      take: 500,
    });

    if (sourceTransactions.length === 0) {
      this.logger.log('No new transactions found.');
      return {
        ingested: 0,
        message: 'No new transactions found',
      };
    }

    let alertsCreated = 0;
    let alertsSkipped = 0;
    let lastSuccessful: SourceTransactionEntity | null = null;

    for (const tx of sourceTransactions) {
      try {
        const result = await this.ingestTransaction(tx);
        lastSuccessful = tx;
        if (result.alertCreated) {
          alertsCreated += 1;
        } else {
          alertsSkipped += 1;
        }
      } catch (error) {
        // Do not advance ingestion past a failed transaction.
        this.logger.error(
          `Ingestion stopped at source transaction ${tx.id}: ${
            (error as Error).message
          }`,
        );
        break;
      }
    }

    if (lastSuccessful) {
      state.lastSyncedAt = lastSuccessful.createdAt;
      state.lastSyncedTransactionId = lastSuccessful.id;
      state.updatedAt = new Date();
      await this.ingestionStateRepo.save(state);
    }

    const ingested = lastSuccessful
      ? sourceTransactions.findIndex((tx) => tx.id === lastSuccessful.id) + 1
      : 0;

    this.logger.log(`Ingested ${ingested} transactions.`);

    return {
      ingested,
      alertsCreated,
      alertsSkipped,
      lastSyncedAt: state.lastSyncedAt,
      lastSyncedTransactionId: state.lastSyncedTransactionId,
    };
  }

  private async getOrCreateState() {
    let state = await this.ingestionStateRepo.findOne({
      where: {
        sourceName: this.sourceName,
      },
    });

    if (!state) {
      state = this.ingestionStateRepo.create({
        sourceName: this.sourceName,
        lastSyncedAt: null,
        lastSyncedTransactionId: null,
        updatedAt: new Date(),
      });

      await this.ingestionStateRepo.save(state);
    }

    return state;
  }

  private async ingestTransaction(
    tx: SourceTransactionEntity,
  ): Promise<{ alertCreated: boolean }> {
    // 1-2. Resolve FraudTransactionEntity in FraudDb after reading source tx.
    const fraudTransaction = await this.upsertFraudTransaction(tx);

    const identifiers = this.extractIdentifiers(tx);

    for (const identifier of identifiers) {
      await this.insertIdentifierIfNotExists(
        tx,
        identifier.type,
        identifier.value,
      );
    }

    await this.upsertNeo4jGraph(tx);

    return this.evaluateAndCreateAlert(tx, fraudTransaction);
  }

  private async upsertFraudTransaction(
    tx: SourceTransactionEntity,
  ): Promise<FraudTransactionEntity> {
    const fraudTx = this.fraudTransactionRepo.create({
      id: tx.id,
      transactionDate: tx.transactionDate,
      amountValue: tx.amountValue,
      currencyCode: tx.currencyCode,
      paymentMethod: tx.paymentMethod,

      merchantName: tx.merchantName,
      merchantEmail: tx.merchantEmail,

      customerName: tx.customerName,
      customerEmail: tx.customerEmail,
      customerPhone: tx.phone,
      ipAddress: tx.ipAddress,

      paymentAccount: tx.paymentAccount,
      confirmationCode: tx.confirmationCode,
      merchantRef: tx.merchantRef,
      orderTrackingId: tx.orderTrackingId,
      bankAuthCode: tx.bankAuthCode,
      deviceFingerprint: tx.deviceFingerprint,

      statusText: tx.statusText,
      statusType: tx.statusType,

      sourceCreatedAt: tx.createdAt,
      ingestedAt: new Date(),
    });

    return this.fraudTransactionRepo.save(fraudTx);
  }

  private extractIdentifiers(tx: SourceTransactionEntity) {
    return [
      { type: 'email', value: tx.customerEmail },
      { type: 'phone', value: tx.phone },
      { type: 'ip', value: tx.ipAddress },
      { type: 'payment_account', value: tx.paymentAccount },
      { type: 'fingerprint', value: tx.deviceFingerprint },
      { type: 'merchant_email', value: tx.merchantEmail },
      { type: 'merchant_name', value: tx.merchantName },
      { type: 'confirmation_code', value: tx.confirmationCode },
      { type: 'order_tracking_id', value: tx.orderTrackingId },
      { type: 'bank_auth_code', value: tx.bankAuthCode },
    ].filter((x): x is { type: string; value: string } => {
      return Boolean(x.value && String(x.value).trim());
    });
  }

  private async insertIdentifierIfNotExists(
    tx: SourceTransactionEntity,
    type: string,
    value: string,
  ) {
    try {
      const identifier = this.fraudIdentifierRepo.create({
        transactionId: tx.id,
        identifierType: type,
        identifierValue: value.trim(),
        transactionDate: tx.transactionDate,
        createdAt: new Date(),
      });

      await this.fraudIdentifierRepo.save(identifier);
    } catch {
      this.logger.debug(
        `Skipped duplicate identifier ${tx.id} ${type} ${value}`,
      );
    }
  }

  private async upsertNeo4jGraph(tx: SourceTransactionEntity) {
    await this.neo4jService.run(
      `
      MERGE (t:Transaction {id: $transactionId})
      SET t.date = $transactionDate,
          t.amount = $amount,
          t.currency = $currency,
          t.status = $status,
          t.confirmationCode = $confirmationCode,
          t.orderTrackingId = $orderTrackingId,
          t.bankAuthCode = $bankAuthCode

      WITH t
      FOREACH (_ IN CASE WHEN $email IS NULL THEN [] ELSE [1] END |
        MERGE (e:Email {value: $email})
        MERGE (t)-[:USED_EMAIL]->(e)
      )

      FOREACH (_ IN CASE WHEN $phone IS NULL THEN [] ELSE [1] END |
        MERGE (p:Phone {value: $phone})
        MERGE (t)-[:USED_PHONE]->(p)
      )

      FOREACH (_ IN CASE WHEN $ip IS NULL THEN [] ELSE [1] END |
        MERGE (ip:IP {value: $ip})
        MERGE (t)-[:USED_IP]->(ip)
      )

      FOREACH (_ IN CASE WHEN $paymentAccount IS NULL THEN [] ELSE [1] END |
        MERGE (pa:PaymentAccount {value: $paymentAccount})
        MERGE (t)-[:USED_PAYMENT_ACCOUNT]->(pa)
      )

      FOREACH (_ IN CASE WHEN $fingerprint IS NULL THEN [] ELSE [1] END |
        MERGE (fp:DeviceFingerprint {value: $fingerprint})
        MERGE (t)-[:USED_DEVICE]->(fp)
      )

      FOREACH (_ IN CASE WHEN $merchantEmail IS NULL THEN [] ELSE [1] END |
        MERGE (m:Merchant {value: $merchantEmail})
        SET m.name = $merchantName
        MERGE (t)-[:BELONGS_TO_MERCHANT]->(m)
      )
      `,
      {
        transactionId: tx.id,
        transactionDate: tx.transactionDate?.toISOString(),
        amount: Number(tx.amountValue),
        currency: tx.currencyCode,
        status: tx.statusText,
        confirmationCode: tx.confirmationCode || null,
        orderTrackingId: tx.orderTrackingId || null,
        bankAuthCode: tx.bankAuthCode || null,

        email: tx.customerEmail?.trim() || null,
        phone: tx.phone?.trim() || null,
        ip: tx.ipAddress?.trim() || null,
        paymentAccount: tx.paymentAccount?.trim() || null,
        fingerprint: tx.deviceFingerprint?.trim() || null,
        merchantEmail: tx.merchantEmail?.trim() || null,
        merchantName: tx.merchantName || null,
      },
    );
  }

  private async evaluateAndCreateAlert(
    tx: SourceTransactionEntity,
    fraudTransaction: FraudTransactionEntity,
  ): Promise<{ alertCreated: boolean }> {
    const rootIdentifier = this.detectRootIdentifier(tx);
    if (!rootIdentifier) {
      return { alertCreated: false };
    }

    // Snapshot start → calculate → save → rules → risk → policy → alert → complete
    // is owned by FraudEvaluationService when persistEvaluation is enabled.
    const evaluation = await this.fraudEvaluationService.evaluateIdentifier(
      rootIdentifier.type,
      rootIdentifier.value,
      {
        depth: 2,
        transaction: fraudTransaction,
        persistEvaluation: true,
        createAlert: true,
        rootIdentifier,
        sourceTransactionId: tx.id,
      },
    );

    return { alertCreated: evaluation.alertCreated ?? false };
  }

  private detectRootIdentifier(
    tx: SourceTransactionEntity,
  ): { type: string; value: string } | null {
    const candidates: Array<{ type: string; value?: string }> = [
      { type: 'email', value: tx.customerEmail },
      { type: 'phone', value: tx.phone },
      { type: 'ip', value: tx.ipAddress },
      { type: 'payment_account', value: tx.paymentAccount },
      { type: 'fingerprint', value: tx.deviceFingerprint },
      { type: 'merchant_email', value: tx.merchantEmail },
      { type: 'merchant_name', value: tx.merchantName },
    ];

    for (const candidate of candidates) {
      const normalizedValue = candidate.value?.trim();
      if (normalizedValue) {
        return {
          type: candidate.type,
          value: normalizedValue,
        };
      }
    }

    return null;
  }
}
