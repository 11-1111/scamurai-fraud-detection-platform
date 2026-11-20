import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Equal,
  FindOptionsWhere,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { SourceTransactionEntity } from '../database/entities/source-transaction.entity';
import { FraudTransactionEntity } from '../database/entities/fraud-transaction.entity';
import { FraudIdentifierEntity } from '../database/entities/fraud-identifier.entity';
import { FraudIngestionStateEntity } from '../database/entities/fraud-ingestion-state.entity';
import { isDuplicateKeyError } from '../database/sql-server-errors';
import { FraudEvaluationService } from '../fraud/fraud-evaluation.service';
import { MetricsService } from '../observability/metrics.service';
import { IngestionLockService } from './ingestion-lock.service';
import { GraphOutboxService } from './graph/graph-outbox.service';
import { GraphProjectionService } from './graph/graph-projection.service';
import {
  INGESTION_BATCH_SIZE,
  TRANSACTIONS_INGESTION_SOURCE,
} from './ingestion.constants';

export interface IngestionEmptyResult {
  ingested: 0;
  message: string;
  /*
   * True when the run did not happen because another one held the lock, as
   * opposed to happening and finding nothing. The two are both "ingested
   * zero" and mean entirely different things.
   */
  skipped?: boolean;
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

    @InjectRepository(FraudIngestionStateEntity, 'fraud')
    private readonly ingestionStateRepo: Repository<FraudIngestionStateEntity>,

    /*
     * The transaction row, its identifiers and the graph outbox entry are
     * written through one EntityManager so they commit together, which a
     * repository-per-entity cannot express.
     */
    @InjectDataSource('fraud')
    private readonly fraudDataSource: DataSource,

    private readonly graphOutbox: GraphOutboxService,
    private readonly graphProjection: GraphProjectionService,
    private readonly fraudEvaluationService: FraudEvaluationService,
    private readonly metrics: MetricsService,
    private readonly lock: IngestionLockService,
  ) {}

  async runScheduledSync(): Promise<IngestionRunResult> {
    return this.runGuarded();
  }

  async runManualSync(): Promise<IngestionRunResult> {
    return this.runGuarded();
  }

  /*
   * Both entry points go through the lock.
   *
   * The scheduled path is already deduplicated by the orchestrator's
   * deterministic job id, so this is belt and braces there -- but the manual
   * endpoint bypasses the queue entirely, and the two paths can collide with
   * each other as easily as with themselves.
   *
   * A run that cannot take the lock reports zero ingested rather than
   * throwing: another run is doing the work, so nothing is wrong. The caller
   * is told which it was so the endpoint can answer honestly.
   */
  private async runGuarded(): Promise<IngestionRunResult> {
    const outcome = await this.lock.runExclusively(this.sourceName, () =>
      this.runIngestion(),
    );

    if (!outcome.acquired) {
      return {
        ingested: 0,
        message: 'An ingestion run is already in progress',
        skipped: true,
      };
    }

    return outcome.result;
  }

  async runIngestion(): Promise<IngestionRunResult> {
    this.logger.log('Starting fraud ingestion sync...');

    const startedAt = process.hrtime.bigint();
    const elapsedSeconds = () =>
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    const state = await this.getOrCreateState();

    const sourceTransactions = await this.sourceRepo.find({
      where: this.buildCursorFilter(state),
      /*
       * The ordering must match the cursor in buildCursorFilter exactly, or
       * paging can step over rows. Backed by IX_Transactions_CreatedAt_Id.
       */
      order: {
        createdAt: 'ASC',
        id: 'ASC',
      },
      take: INGESTION_BATCH_SIZE,
    });

    if (sourceTransactions.length === 0) {
      this.logger.log('No new transactions found.');

      /*
       * Still recorded. A run that finds nothing is the normal state, and
       * counting it is what makes the ratio of empty to productive runs
       * visible -- which is how you notice that polling has stopped finding
       * work because the upstream feed stopped, rather than because fraud
       * stopped.
       */
      this.metrics.recordIngestionRun('empty', elapsedSeconds(), {
        transactions: 0,
        alerts: 0,
      });

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

    /*
     * A run that stopped partway is not a successful run, and the difference
     * matters more than the count: it means a transaction could not be
     * processed and the cursor is parked behind it. Without the distinction,
     * a steady stream of halted runs looks like healthy throughput.
     */
    this.metrics.recordIngestionRun(
      ingested === sourceTransactions.length ? 'completed' : 'halted',
      elapsedSeconds(),
      { transactions: ingested, alerts: alertsCreated },
    );

    return {
      ingested,
      alertsCreated,
      alertsSkipped,
      lastSyncedAt: state.lastSyncedAt,
      lastSyncedTransactionId: state.lastSyncedTransactionId,
    };
  }

  /*
   * Where to resume reading the source table.
   *
   * createdAt alone is not a cursor. It is not unique: upstream systems
   * insert in batches, and DATETIME2 ties are ordinary at volume. If the last
   * row of a batch shares its createdAt with the first row of the next one,
   * resuming at `createdAt > watermark` steps straight over that row and
   * every other row carrying the same timestamp -- silently, permanently, and
   * invisibly in any log.
   *
   * The fix is a composite keyset over (createdAt, id): continue after a
   * known position rather than after a point in time. id only has to impose
   * a consistent total order, which SQL Server's uniqueidentifier comparison
   * does; it need not be meaningful, and it is already stored on the state
   * row as last_synced_transaction_id.
   */
  private buildCursorFilter(
    state: FraudIngestionStateEntity,
  ):
    | FindOptionsWhere<SourceTransactionEntity>
    | FindOptionsWhere<SourceTransactionEntity>[] {
    if (!state.lastSyncedAt) {
      return {};
    }

    if (!state.lastSyncedTransactionId) {
      /*
       * State written before the cursor carried an id. Re-reading the whole
       * timestamp costs one repeat of however many rows share it; skipping
       * them loses transactions outright. Ingestion upserts by primary key
       * and dedupes identifiers, so the repeat is absorbed -- and this
       * happens at most once per source, on the first run after upgrading.
       */
      return { createdAt: MoreThanOrEqual(state.lastSyncedAt) };
    }

    return [
      { createdAt: MoreThan(state.lastSyncedAt) },
      {
        createdAt: Equal(state.lastSyncedAt),
        id: MoreThan(state.lastSyncedTransactionId),
      },
    ];
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
    const fraudTransaction = await this.persistTransaction(tx);

    /*
     * FraudDb has committed, and its commit included a record that the graph
     * owes a write. Applying it here keeps the graph current for the
     * evaluation below.
     *
     * A failure no longer stops the run. The outbox entry survives the
     * commit, so the write is owed whether or not this attempt succeeded,
     * and the drain applies it when Neo4j returns -- which is what makes
     * carrying on safe rather than merely convenient. Halting instead would
     * stop ingestion entirely over a dependency most of a decision does not
     * use, and the transactions it refused to read would still be waiting
     * when the outage ended.
     *
     * The cost is that this transaction is scored without its own node in
     * the graph. The evaluation records that, so the alert says it was
     * decided on partial evidence instead of looking complete.
     */
    const projected = await this.projectToGraph(fraudTransaction);

    return this.evaluateAndCreateAlert(tx, fraudTransaction, {
      graphAvailable: projected,
    });
  }

  private async projectToGraph(
    fraudTransaction: FraudTransactionEntity,
  ): Promise<boolean> {
    try {
      await this.graphProjection.project(fraudTransaction);
      await this.graphOutbox.markApplied(fraudTransaction.id);
      return true;
    } catch (error) {
      this.metrics.recordGraphProjectionFailure();

      this.logger.warn(
        `Graph write deferred for transaction ${fraudTransaction.id}; the ` +
          `outbox will retry it: ${
            error instanceof Error ? error.message : String(error)
          }`,
      );

      return false;
    }
  }

  /*
   * The transaction row, its identifiers and the graph debt, committed
   * together or not at all.
   *
   * Each was previously written on its own connection, with no transaction
   * around them. A failure part way through left a transaction row visible
   * to every reader with only some of its identifiers -- and the feature
   * engine reads exactly those rows to compute velocity, so a half-ingested
   * transaction did not merely look wrong, it changed other transactions'
   * scores.
   */
  private async persistTransaction(
    tx: SourceTransactionEntity,
  ): Promise<FraudTransactionEntity> {
    return this.fraudDataSource.transaction(async (manager) => {
      const fraudTransaction = await this.upsertFraudTransaction(manager, tx);

      for (const identifier of this.extractIdentifiers(tx)) {
        await this.insertIdentifierIfNotExists(
          manager,
          tx,
          identifier.type,
          identifier.value,
        );
      }

      await this.graphOutbox.enqueue(manager, tx.id);

      return fraudTransaction;
    });
  }

  private async upsertFraudTransaction(
    manager: EntityManager,
    tx: SourceTransactionEntity,
  ): Promise<FraudTransactionEntity> {
    const fraudTx = manager.create(FraudTransactionEntity, {
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

    return manager.save(FraudTransactionEntity, fraudTx);
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

  /*
   * Insert optimistically and let the unique index decide, rather than
   * checking for an existing row first: the check-then-insert version is a
   * race, and this saves a round trip per identifier.
   *
   * Only a duplicate may be swallowed. A catch-all here reported a dropped
   * connection, a deadlock or a type mismatch as "skipped duplicate" and
   * returned normally, so the transaction was counted as ingested with
   * identifiers missing -- and because the watermark then advanced past it,
   * nothing ever revisited it. Its graph edges and velocity features stayed
   * permanently wrong, with one debug line as the only trace.
   *
   * Anything else is rethrown, which stops the run at this transaction and
   * leaves the cursor behind it so the next run retries it.
   */
  private async insertIdentifierIfNotExists(
    manager: EntityManager,
    tx: SourceTransactionEntity,
    type: string,
    value: string,
  ) {
    const normalizedValue = value.trim();

    try {
      const identifier = manager.create(FraudIdentifierEntity, {
        transactionId: tx.id,
        identifierType: type,
        identifierValue: normalizedValue,
        transactionDate: tx.transactionDate,
        createdAt: new Date(),
      });

      await manager.save(FraudIdentifierEntity, identifier);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      this.logger.debug(
        `Identifier already recorded for ${tx.id}: ${type}=${normalizedValue}`,
      );
    }
  }

  private async evaluateAndCreateAlert(
    tx: SourceTransactionEntity,
    fraudTransaction: FraudTransactionEntity,
    context: { graphAvailable: boolean },
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
        /*
         * The graph write for this transaction did not land, so its own node
         * is missing from the network the evaluation is about to read. The
         * score is still worth having -- every relational feature is intact
         * -- but it must not be presented as a complete picture.
         */
        graphAvailable: context.graphAvailable,
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
