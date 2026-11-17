/*
  010_fraud_graph_outbox.sql
  Safe, idempotent script for SQL Server. Target database: FraudDb.

  The outbox for graph writes.

  Ingestion writes to two stores that cannot share a transaction: FraudDb and
  Neo4j. Writing to both in sequence and hoping means any failure between them
  leaves the two disagreeing, with nothing recording that a write is owed.

  A row here is that record. It is inserted in the same SQL transaction as the
  transaction and identifier rows it refers to, so the commit that makes a
  transaction visible is the same commit that promises the graph will catch
  up. Either both happened or neither did.

  The row is a pointer, not a payload: the drain reads dbo.fraud_transactions
  by id and builds the graph write from there. That keeps one source of truth
  for what a transaction is, and means a replayed row can never write stale
  values.

  Rows are deleted once applied -- this is a queue, not an audit log. Rows
  that exhaust their attempts are kept as FAILED so somebody can find them.
*/

IF OBJECT_ID('dbo.fraud_graph_outbox', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_graph_outbox (
    id             BIGINT IDENTITY(1,1) NOT NULL
                     CONSTRAINT PK_fraud_graph_outbox PRIMARY KEY,
    transaction_id UNIQUEIDENTIFIER NOT NULL,
    status         NVARCHAR(20) NOT NULL
                     CONSTRAINT DF_fraud_graph_outbox_status DEFAULT ('PENDING'),
    attempts       INT NOT NULL
                     CONSTRAINT DF_fraud_graph_outbox_attempts DEFAULT (0),
    last_error     NVARCHAR(2000) NULL,
    /* When this row becomes eligible again: how backoff is expressed. */
    available_at   DATETIME2(3) NOT NULL
                     CONSTRAINT DF_fraud_graph_outbox_available_at DEFAULT SYSUTCDATETIME(),
    created_at     DATETIME2(3) NOT NULL
                     CONSTRAINT DF_fraud_graph_outbox_created_at DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2(3) NULL,
    CONSTRAINT FK_fraud_graph_outbox_transaction
      FOREIGN KEY (transaction_id)
      REFERENCES dbo.fraud_transactions (id),
    CONSTRAINT CK_fraud_graph_outbox_status
      CHECK (status IN ('PENDING', 'PROCESSING', 'FAILED'))
  );
END;
GO

/*
  The claim query: oldest eligible pending rows first. Filtered so the index
  holds only work still outstanding -- a PROCESSING or FAILED row is not
  something the drain looks for, and a healthy outbox is almost always empty.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_graph_outbox_pending'
    AND object_id = OBJECT_ID('dbo.fraud_graph_outbox')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_graph_outbox_pending
    ON dbo.fraud_graph_outbox (available_at, id)
    WHERE status = 'PENDING';
END;
GO

/*
  Recovering a row stuck in PROCESSING, which is what a worker killed
  mid-apply leaves behind.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_graph_outbox_status_updated_at'
    AND object_id = OBJECT_ID('dbo.fraud_graph_outbox')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_graph_outbox_status_updated_at
    ON dbo.fraud_graph_outbox (status, updated_at)
    INCLUDE (transaction_id, attempts);
END;
GO

/*
  One outstanding row per transaction. Ingestion upserts, so a retried
  transaction must not queue the graph write twice -- and because the drain
  rebuilds from fraud_transactions, a single row always applies the latest
  state anyway.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_fraud_graph_outbox_transaction_id'
    AND object_id = OBJECT_ID('dbo.fraud_graph_outbox')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_graph_outbox_transaction_id
    ON dbo.fraud_graph_outbox (transaction_id);
END;
GO
