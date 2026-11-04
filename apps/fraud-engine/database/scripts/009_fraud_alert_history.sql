/*
  009_fraud_alert_history.sql
  Safe, idempotent script for SQL Server. Target database: FraudDb.

  The alert audit trail. FraudAlertHistoryEntity is registered on the fraud
  connection and written by the alert engine on every status change,
  assignment and resolution, but no script ever created the table -- so on a
  freshly built FraudDb the first alert transition failed at runtime.

  Rows here are append-only. Nothing in the engine updates or deletes them:
  the point of the table is that a reviewer can reconstruct who changed an
  alert and when, after the fact.
*/

IF OBJECT_ID('dbo.fraud_alert_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_alert_history (
    id                INT IDENTITY(1,1) NOT NULL
                        CONSTRAINT PK_fraud_alert_history PRIMARY KEY,
    alert_id          UNIQUEIDENTIFIER NOT NULL,
    action_type       NVARCHAR(255) NOT NULL,
    previous_status   NVARCHAR(255) NULL,
    new_status        NVARCHAR(255) NULL,
    previous_assignee NVARCHAR(255) NULL,
    new_assignee      NVARCHAR(255) NULL,
    resolution        NVARCHAR(255) NULL,
    comment           NVARCHAR(255) NULL,
    /*
      Self-reported today: the engine takes this from the request body. It
      becomes trustworthy once requests carry an authenticated principal.
    */
    performed_by      NVARCHAR(255) NULL,
    created_at        DATETIME2 NOT NULL
                        CONSTRAINT DF_fraud_alert_history_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_fraud_alert_history_alert
      FOREIGN KEY (alert_id)
      REFERENCES dbo.fraud_alerts (id)
      ON DELETE CASCADE
  );
END;
GO

/* The timeline of one alert, newest first. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_alert_history_alert_id_created_at'
    AND object_id = OBJECT_ID('dbo.fraud_alert_history')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alert_history_alert_id_created_at
    ON dbo.fraud_alert_history (alert_id, created_at DESC);
END;
GO

/* "What did this analyst do, and when" -- the review-throughput question. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_fraud_alert_history_performed_by_created_at'
    AND object_id = OBJECT_ID('dbo.fraud_alert_history')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alert_history_performed_by_created_at
    ON dbo.fraud_alert_history (performed_by, created_at DESC)
    INCLUDE (alert_id, action_type);
END;
GO
