/*
  source/001_transactions.sql
  Safe, idempotent script for SQL Server. Target database: TransactionsDb.

  Creates the upstream payment-transaction table that the fraud engine reads
  from. This repository does not own this schema in production -- it mirrors
  the shape the fraud engine's SourceTransactionEntity and the transactions-api
  TransactionEntity both expect, so a fresh environment can be stood up from
  the repository alone.

  Column widths are NVARCHAR(255) rather than the NVARCHAR(MAX) that EF Core
  would infer from an unannotated string property, because the ingestion
  watermark and the lookup columns below have to be indexable.
*/

IF OBJECT_ID('dbo.Transactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Transactions (
    Id                UNIQUEIDENTIFIER NOT NULL
                        CONSTRAINT PK_Transactions PRIMARY KEY
                        CONSTRAINT DF_Transactions_Id DEFAULT NEWID(),
    TransactionDate   DATETIME2 NOT NULL,
    AmountValue       DECIMAL(18,2) NOT NULL,
    CurrencyCode      NVARCHAR(255) NOT NULL,
    PaymentMethod     NVARCHAR(255) NULL,
    MerchantName      NVARCHAR(255) NOT NULL,
    MerchantEmail     NVARCHAR(255) NULL,
    CustomerName      NVARCHAR(255) NULL,
    CustomerEmail     NVARCHAR(255) NULL,
    IpAddress         NVARCHAR(255) NULL,
    Phone             NVARCHAR(255) NULL,
    PaymentAccount    NVARCHAR(255) NULL,
    ConfirmationCode  NVARCHAR(255) NULL,
    MerchantRef       NVARCHAR(255) NULL,
    OrderTrackingId   NVARCHAR(255) NULL,
    BankAuthCode      NVARCHAR(255) NULL,
    DeviceFingerprint NVARCHAR(255) NULL,
    StatusText        NVARCHAR(255) NOT NULL,
    StatusType        NVARCHAR(255) NOT NULL,
    CreatedAt         DATETIME2 NOT NULL
                        CONSTRAINT DF_Transactions_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END;
GO

/* ====================================================
   INDEXES
   ==================================================== */

/*
  The ingestion poller pages this table by CreatedAt. Id is carried as the
  tie-breaker so a composite keyset cursor can page without skipping rows
  that share a CreatedAt value.
*/
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_Transactions_CreatedAt_Id'
    AND object_id = OBJECT_ID('dbo.Transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Transactions_CreatedAt_Id
    ON dbo.Transactions (CreatedAt, Id);
END;
GO

/* Supports the transactions-api search endpoint's default ordering. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_Transactions_TransactionDate'
    AND object_id = OBJECT_ID('dbo.Transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Transactions_TransactionDate
    ON dbo.Transactions (TransactionDate DESC)
    INCLUDE (MerchantName, StatusType, AmountValue);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_Transactions_MerchantName_TransactionDate'
    AND object_id = OBJECT_ID('dbo.Transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Transactions_MerchantName_TransactionDate
    ON dbo.Transactions (MerchantName, TransactionDate DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_Transactions_StatusType_TransactionDate'
    AND object_id = OBJECT_ID('dbo.Transactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Transactions_StatusType_TransactionDate
    ON dbo.Transactions (StatusType, TransactionDate DESC);
END;
GO
