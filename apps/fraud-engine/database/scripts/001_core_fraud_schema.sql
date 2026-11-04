/*
  001_core_fraud_schema.sql
  Safe, idempotent script for SQL Server. Target database: FraudDb.

  Creates the core tables the fraud engine depends on at runtime. These were
  previously missing from source control -- the numbered scripts began at 003 --
  so a fresh FraudDb could not be built from this repository at all. Both
  TypeORM connections run with synchronize disabled by design, which makes
  these scripts the only source of truth for the schema.

  Indexes for these tables live in 002_core_fraud_indexes.sql.
*/

/* ====================================================
   TABLE: fraud_transactions
   The engine's local copy of each upstream transaction.
   ==================================================== */
IF OBJECT_ID('dbo.fraud_transactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_transactions (
    id                 UNIQUEIDENTIFIER NOT NULL
                         CONSTRAINT PK_fraud_transactions PRIMARY KEY,
    transaction_date   DATETIME2 NOT NULL,
    amount_value       DECIMAL(18,2) NOT NULL,
    currency_code      NVARCHAR(255) NOT NULL,
    payment_method     NVARCHAR(255) NULL,
    merchant_name      NVARCHAR(255) NOT NULL,
    merchant_email     NVARCHAR(255) NULL,
    customer_name      NVARCHAR(255) NULL,
    customer_email     NVARCHAR(255) NULL,
    customer_phone     NVARCHAR(255) NULL,
    ip_address         NVARCHAR(255) NULL,
    payment_account    NVARCHAR(255) NULL,
    confirmation_code  NVARCHAR(255) NULL,
    merchant_ref       NVARCHAR(255) NULL,
    order_tracking_id  NVARCHAR(255) NULL,
    bank_auth_code     NVARCHAR(255) NULL,
    device_fingerprint NVARCHAR(255) NULL,
    status_text        NVARCHAR(255) NOT NULL,
    status_type        NVARCHAR(255) NOT NULL,
    /* CreatedAt as it stood in the source system: the ingestion watermark. */
    source_created_at  DATETIME2 NOT NULL,
    ingested_at        DATETIME2 NOT NULL
                         CONSTRAINT DF_fraud_transactions_ingested_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

/* ====================================================
   TABLE: fraud_identifiers
   One row per (transaction, identifier) pair: the relational mirror of
   the Neo4j identifier graph.
   ==================================================== */
IF OBJECT_ID('dbo.fraud_identifiers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_identifiers (
    id               INT IDENTITY(1,1) NOT NULL
                       CONSTRAINT PK_fraud_identifiers PRIMARY KEY,
    transaction_id   UNIQUEIDENTIFIER NOT NULL,
    identifier_type  NVARCHAR(255) NOT NULL,
    identifier_value NVARCHAR(255) NOT NULL,
    transaction_date DATETIME2 NOT NULL,
    created_at       DATETIME2 NOT NULL
                       CONSTRAINT DF_fraud_identifiers_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

/*
  The ingestion path inserts identifiers optimistically and treats a unique
  violation as "already present". That contract only holds if this constraint
  exists, so it is created here rather than left to a later script.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_fraud_identifiers_transaction_type_value'
    AND object_id = OBJECT_ID('dbo.fraud_identifiers')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_identifiers_transaction_type_value
    ON dbo.fraud_identifiers (transaction_id, identifier_type, identifier_value);
END;
GO

/* ====================================================
   TABLE: fraud_ingestion_state
   The per-source ingestion watermark.
   ==================================================== */
IF OBJECT_ID('dbo.fraud_ingestion_state', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_ingestion_state (
    id                         INT IDENTITY(1,1) NOT NULL
                                 CONSTRAINT PK_fraud_ingestion_state PRIMARY KEY,
    source_name                NVARCHAR(255) NOT NULL,
    last_synced_at             DATETIME2 NULL,
    last_synced_transaction_id UNIQUEIDENTIFIER NULL,
    updated_at                 DATETIME2 NOT NULL
                                 CONSTRAINT DF_fraud_ingestion_state_updated_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

/* One watermark row per source, enforced rather than assumed. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_fraud_ingestion_state_source_name'
    AND object_id = OBJECT_ID('dbo.fraud_ingestion_state')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_ingestion_state_source_name
    ON dbo.fraud_ingestion_state (source_name);
END;
GO

/* ====================================================
   TABLE: fraud_ingestion_config
   Per-source polling configuration, read at runtime.
   ==================================================== */
IF OBJECT_ID('dbo.fraud_ingestion_config', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_ingestion_config (
    id                    UNIQUEIDENTIFIER NOT NULL
                            CONSTRAINT PK_fraud_ingestion_config PRIMARY KEY
                            CONSTRAINT DF_fraud_ingestion_config_id DEFAULT NEWID(),
    source_name           NVARCHAR(200) NOT NULL,
    is_enabled            BIT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_is_enabled DEFAULT (1),
    interval_minutes      INT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_interval_minutes DEFAULT (10),
    batch_size            INT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_batch_size DEFAULT (500),
    max_concurrency       INT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_max_concurrency DEFAULT (1),
    job_timeout_seconds   INT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_job_timeout_seconds DEFAULT (600),
    retry_attempts        INT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_retry_attempts DEFAULT (3),
    retry_backoff_seconds INT NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_retry_backoff_seconds DEFAULT (30),
    updated_at            DATETIME2(3) NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_updated_at DEFAULT SYSUTCDATETIME(),
    created_at            DATETIME2(3) NOT NULL
                            CONSTRAINT DF_fraud_ingestion_config_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_fraud_ingestion_config_source_name'
    AND object_id = OBJECT_ID('dbo.fraud_ingestion_config')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_ingestion_config_source_name
    ON dbo.fraud_ingestion_config (source_name);
END;
GO

/*
  Default configuration for the only source that exists today. The value must
  match TRANSACTIONS_INGESTION_SOURCE in src/ingestion/ingestion.constants.ts
  exactly: the orchestrator looks its configuration up by this string, and a
  mismatch leaves polling permanently unconfigured.
*/
MERGE dbo.fraud_ingestion_config AS target
USING (VALUES ('TransactionsDb.Transactions')) AS src (source_name)
  ON target.source_name = src.source_name
WHEN NOT MATCHED THEN
  INSERT (source_name) VALUES (src.source_name);
GO

/* ====================================================
   TABLE: fraud_transaction_evaluations
   One row per scoring pass over a transaction. Re-scoring after a rule
   change appends a new version rather than overwriting, so a past
   decision stays reconstructable.
   ==================================================== */
IF OBJECT_ID('dbo.fraud_transaction_evaluations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_transaction_evaluations (
    id                     UNIQUEIDENTIFIER NOT NULL
                             CONSTRAINT PK_fraud_transaction_evaluations PRIMARY KEY
                             CONSTRAINT DF_fraud_transaction_evaluations_id DEFAULT NEWID(),
    fraud_transaction_id   UNIQUEIDENTIFIER NOT NULL,
    evaluation_version     INT NOT NULL,
    evaluation_reason      NVARCHAR(50) NOT NULL,
    status                 NVARCHAR(30) NOT NULL,
    risk_score             DECIMAL(10,4) NULL,
    risk_level             NVARCHAR(50) NULL,
    policy_decision        NVARCHAR(100) NULL,
    feature_engine_version NVARCHAR(50) NULL,
    rules_engine_version   NVARCHAR(50) NULL,
    started_at             DATETIME2(3) NOT NULL,
    completed_at           DATETIME2(3) NULL,
    created_at             DATETIME2(3) NOT NULL
                             CONSTRAINT DF_fraud_transaction_evaluations_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_fraud_transaction_evaluations_transaction
      FOREIGN KEY (fraud_transaction_id)
      REFERENCES dbo.fraud_transactions (id),
    CONSTRAINT CK_fraud_transaction_evaluations_status
      CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT CK_fraud_transaction_evaluations_reason
      CHECK (evaluation_reason IN (
        'INGESTION', 'MANUAL_REVIEW', 'RULE_CHANGE',
        'FEATURE_CHANGE', 'BACKFILL', 'SYSTEM_RETRY'
      ))
  );
END;
GO

/* Version numbers are per transaction and must not collide. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_fraud_transaction_evaluations_transaction_version'
    AND object_id = OBJECT_ID('dbo.fraud_transaction_evaluations')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_transaction_evaluations_transaction_version
    ON dbo.fraud_transaction_evaluations (fraud_transaction_id, evaluation_version DESC);
END;
GO

/* ====================================================
   TABLE: fraud_transaction_features
   The feature values an evaluation was computed from. Storing these
   beside the decision is what makes a score explainable after the fact.
   ==================================================== */
IF OBJECT_ID('dbo.fraud_transaction_features', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_transaction_features (
    id                   BIGINT IDENTITY(1,1) NOT NULL
                           CONSTRAINT PK_fraud_transaction_features PRIMARY KEY,
    evaluation_id        UNIQUEIDENTIFIER NOT NULL,
    fraud_transaction_id UNIQUEIDENTIFIER NOT NULL,
    feature_name         NVARCHAR(150) NOT NULL,
    feature_label        NVARCHAR(200) NULL,
    feature_category     NVARCHAR(100) NULL,
    feature_description  NVARCHAR(1000) NULL,
    value_type           NVARCHAR(30) NOT NULL,
    numeric_value        DECIMAL(38,10) NULL,
    boolean_value        BIT NULL,
    string_value         NVARCHAR(2000) NULL,
    json_value           NVARCHAR(MAX) NULL,
    unit                 NVARCHAR(50) NULL,
    window_seconds       INT NULL,
    calculated_at        DATETIME2(3) NOT NULL,
    created_at           DATETIME2(3) NOT NULL
                           CONSTRAINT DF_fraud_transaction_features_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_fraud_transaction_features_evaluation
      FOREIGN KEY (evaluation_id)
      REFERENCES dbo.fraud_transaction_evaluations (id),
    CONSTRAINT FK_fraud_transaction_features_transaction
      FOREIGN KEY (fraud_transaction_id)
      REFERENCES dbo.fraud_transactions (id),
    CONSTRAINT CK_fraud_transaction_features_value_type
      CHECK (value_type IN ('NUMBER', 'BOOLEAN', 'STRING', 'JSON', 'NULL'))
  );
END;
GO

/* A feature is computed once per evaluation. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_fraud_transaction_features_evaluation_feature'
    AND object_id = OBJECT_ID('dbo.fraud_transaction_features')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_transaction_features_evaluation_feature
    ON dbo.fraud_transaction_features (evaluation_id, feature_name);
END;
GO
