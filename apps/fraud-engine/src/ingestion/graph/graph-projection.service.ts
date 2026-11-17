import { Injectable } from '@nestjs/common';

import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';
import { Neo4jService } from '../../neo4j/neo4j.service';

/*
 * Projects a transaction into the identifier graph.
 *
 * Lifted out of IngestionService because two callers need it: the ingestion
 * path, which projects immediately, and the outbox drain, which projects
 * whatever ingestion did not manage to. One implementation means the graph
 * cannot end up shaped differently depending on which path wrote it.
 *
 * It reads FraudTransactionEntity rather than the upstream row, so the drain
 * can rebuild the write from FraudDb alone -- the outbox stores an id and no
 * payload, precisely so a replayed row writes current values rather than
 * whatever was true when it was queued.
 *
 * The write is idempotent: every clause is a MERGE, so applying it twice
 * leaves the same graph. That is what makes retrying safe.
 */
@Injectable()
export class GraphProjectionService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async project(transaction: FraudTransactionEntity): Promise<void> {
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
        transactionId: transaction.id,
        transactionDate: transaction.transactionDate?.toISOString(),
        amount: Number(transaction.amountValue),
        currency: transaction.currencyCode,
        status: transaction.statusText,
        confirmationCode: transaction.confirmationCode || null,
        orderTrackingId: transaction.orderTrackingId || null,
        bankAuthCode: transaction.bankAuthCode || null,

        email: transaction.customerEmail?.trim() || null,
        phone: transaction.customerPhone?.trim() || null,
        ip: transaction.ipAddress?.trim() || null,
        paymentAccount: transaction.paymentAccount?.trim() || null,
        fingerprint: transaction.deviceFingerprint?.trim() || null,
        merchantEmail: transaction.merchantEmail?.trim() || null,
        merchantName: transaction.merchantName || null,
      },
    );
  }
}
