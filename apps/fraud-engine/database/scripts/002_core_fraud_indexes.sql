/*
  002_core_fraud_indexes.sql
  Safe, idempotent script for SQL Server. Target database: FraudDb.

  Indexes for the core tables created in 001_core_fraud_schema.sql.

  Every feature calculator in the engine issues the same shape of query:

      WHERE <identifier column> = @value
        AND transaction_date BETWEEN @from AND @to

  so each identifier column gets a composite index leading with the
  identifier and seeking on the date range, with the columns the calculators
  read afterwards carried as INCLUDE so the lookups stay covering. Without
  these, every velocity and distinct-count feature is a full table scan of
  fraud_transactions, once per feature, per transaction.
*/

/* ====================================================
   fraud_transactions: ingestion and listing
   ==================================================== */

/*
  The ingestion poller pages by source_created_at. id is carried as the
  tie-breaker so a composite keyset cursor can page without skipping rows
  that share a source_created_at value.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_source_created_at_id'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_source_created_at_id
    ON dbo.fraud_transactions (source_created_at, id);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_transaction_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_transaction_date
    ON dbo.fraud_transactions (transaction_date DESC)
    INCLUDE (merchant_name, status_type, amount_value);
END;
GO

/* ====================================================
   fraud_transactions: feature lookup paths
   ==================================================== */

/* Velocity and distinct-card features keyed on the device. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_device_fingerprint_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_device_fingerprint_date
    ON dbo.fraud_transactions (device_fingerprint, transaction_date)
    INCLUDE (status_text, status_type, payment_account);
END;
GO

/* Failed-transaction velocity and amount baselines keyed on the card. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_payment_account_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_payment_account_date
    ON dbo.fraud_transactions (payment_account, transaction_date)
    INCLUDE (status_text, status_type, amount_value);
END;
GO

/* Account-level amount baselines and failed-transaction velocity. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_customer_email_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_customer_email_date
    ON dbo.fraud_transactions (customer_email, transaction_date)
    INCLUDE (status_text, status_type, amount_value);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_customer_phone_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_customer_phone_date
    ON dbo.fraud_transactions (customer_phone, transaction_date)
    INCLUDE (status_text, status_type);
END;
GO

/* Distinct cards seen from one IP in a short window. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_ip_address_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_ip_address_date
    ON dbo.fraud_transactions (ip_address, transaction_date)
    INCLUDE (status_text, status_type, payment_account);
END;
GO

/* Merchant-level distinct cards and daily-total baselines. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_merchant_name_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_merchant_name_date
    ON dbo.fraud_transactions (merchant_name, transaction_date)
    INCLUDE (status_text, status_type, payment_account, amount_value);
END;
GO

/* Distinct payment accounts behind one merchant reference. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_merchant_ref_date'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_merchant_ref_date
    ON dbo.fraud_transactions (merchant_ref, transaction_date)
    INCLUDE (payment_account);
END;
GO

/*
  The replay check looks up an order tracking id with no date range, so this
  one leads with the identifier alone.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transactions_order_tracking_id'
    AND object_id = OBJECT_ID('dbo.fraud_transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transactions_order_tracking_id
    ON dbo.fraud_transactions (order_tracking_id)
    INCLUDE (status_text, status_type, transaction_date);
END;
GO

/* ====================================================
   fraud_identifiers
   ==================================================== */

/*
  Resolving an identifier to the transactions that carry it. The uniqueness
  constraint in 001 leads with transaction_id and cannot serve this.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_identifiers_type_value_date'
    AND object_id = OBJECT_ID('dbo.fraud_identifiers')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_identifiers_type_value_date
    ON dbo.fraud_identifiers (identifier_type, identifier_value, transaction_date)
    INCLUDE (transaction_id);
END;
GO

/* ====================================================
   fraud_transaction_evaluations and features
   ==================================================== */

/* Alert detail reads the evaluation history of one transaction. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transaction_evaluations_created_at'
    AND object_id = OBJECT_ID('dbo.fraud_transaction_evaluations')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transaction_evaluations_created_at
    ON dbo.fraud_transaction_evaluations (created_at DESC)
    INCLUDE (fraud_transaction_id, status, risk_score, risk_level);
END;
GO

/*
  Feature drill-down on an alert, and the per-feature queries a precision
  review runs across many transactions.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_transaction_features_transaction_feature'
    AND object_id = OBJECT_ID('dbo.fraud_transaction_features')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_transaction_features_transaction_feature
    ON dbo.fraud_transaction_features (fraud_transaction_id, feature_name)
    INCLUDE (value_type, numeric_value, boolean_value, string_value);
END;
GO
