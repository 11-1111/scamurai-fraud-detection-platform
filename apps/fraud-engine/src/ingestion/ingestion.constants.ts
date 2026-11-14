export const TRANSACTIONS_INGESTION_SOURCE = 'TransactionsDb.Transactions';

/*
 * Rows read from the source database per ingestion run. Mirrors the default
 * in fraud_ingestion_config.batch_size; the configured value is not yet read
 * at this call site.
 */
export const INGESTION_BATCH_SIZE = 500;
