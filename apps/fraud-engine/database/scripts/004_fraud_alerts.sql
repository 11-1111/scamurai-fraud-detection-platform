/*
  004_fraud_alerts.sql
  Safe, idempotent SQL Server script for proactive fraud alerting tables.
*/

/* ====================================================
   TABLE: fraud_alerts
   ==================================================== */
IF OBJECT_ID('dbo.fraud_alerts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_alerts (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_fraud_alerts PRIMARY KEY DEFAULT NEWID(),
    transaction_id UNIQUEIDENTIFIER NULL,
    root_identifier_type NVARCHAR(50) NOT NULL,
    root_identifier_value NVARCHAR(255) NOT NULL,
    risk_score INT NOT NULL,
    risk_level NVARCHAR(50) NOT NULL,
    default_decision NVARCHAR(50) NULL,
    final_decision NVARCHAR(50) NOT NULL,
    display_color NVARCHAR(50) NULL,
    highest_severity NVARCHAR(50) NULL,
    alert_status NVARCHAR(50) NOT NULL CONSTRAINT DF_fraud_alerts_alert_status DEFAULT ('OPEN'),
    resolution NVARCHAR(100) NULL,
    assigned_to NVARCHAR(255) NULL,
    assigned_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_alerts_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    resolved_at DATETIME2 NULL,
    closed_at DATETIME2 NULL,
    features_json NVARCHAR(MAX) NULL,
    related_identifiers_json NVARCHAR(MAX) NULL,
    graph_json NVARCHAR(MAX) NULL,
    reasons_json NVARCHAR(MAX) NULL,
    source NVARCHAR(50) NOT NULL CONSTRAINT DF_fraud_alerts_source DEFAULT ('INGESTION')
  );
END;
GO

/* ====================================================
   TABLE: fraud_alert_triggered_rules
   ==================================================== */
IF OBJECT_ID('dbo.fraud_alert_triggered_rules', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_alert_triggered_rules (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_fraud_alert_triggered_rules PRIMARY KEY,
    alert_id UNIQUEIDENTIFIER NOT NULL,
    rule_code NVARCHAR(100) NOT NULL,
    rule_name NVARCHAR(255) NOT NULL,
    severity NVARCHAR(50) NOT NULL,
    score_impact INT NOT NULL,
    message NVARCHAR(MAX) NULL,
    feature_name NVARCHAR(100) NULL,
    feature_value DECIMAL(18,2) NULL,
    operator NVARCHAR(20) NULL,
    threshold_value DECIMAL(18,2) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_alert_triggered_rules_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_fraud_alert_triggered_rules_alert'
)
BEGIN
  ALTER TABLE dbo.fraud_alert_triggered_rules
  ADD CONSTRAINT FK_fraud_alert_triggered_rules_alert
    FOREIGN KEY (alert_id)
    REFERENCES dbo.fraud_alerts(id);
END;
GO

/* ====================================================
   TABLE: fraud_alert_policy_actions
   ==================================================== */
IF OBJECT_ID('dbo.fraud_alert_policy_actions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_alert_policy_actions (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_fraud_alert_policy_actions PRIMARY KEY,
    alert_id UNIQUEIDENTIFIER NOT NULL,
    policy_code NVARCHAR(100) NOT NULL,
    policy_name NVARCHAR(255) NOT NULL,
    decision NVARCHAR(50) NOT NULL,
    action_label NVARCHAR(255) NOT NULL,
    priority INT NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_alert_policy_actions_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_fraud_alert_policy_actions_alert'
)
BEGIN
  ALTER TABLE dbo.fraud_alert_policy_actions
  ADD CONSTRAINT FK_fraud_alert_policy_actions_alert
    FOREIGN KEY (alert_id)
    REFERENCES dbo.fraud_alerts(id);
END;
GO

/* ====================================================
   TABLE: fraud_alert_notes
   ==================================================== */
IF OBJECT_ID('dbo.fraud_alert_notes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_alert_notes (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_fraud_alert_notes PRIMARY KEY,
    alert_id UNIQUEIDENTIFIER NOT NULL,
    note NVARCHAR(MAX) NOT NULL,
    created_by NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_alert_notes_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_fraud_alert_notes_alert'
)
BEGIN
  ALTER TABLE dbo.fraud_alert_notes
  ADD CONSTRAINT FK_fraud_alert_notes_alert
    FOREIGN KEY (alert_id)
    REFERENCES dbo.fraud_alerts(id);
END;
GO

/* ====================================================
   INDEXES
   ==================================================== */
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_fraud_alerts_status_created_at'
    AND object_id = OBJECT_ID('dbo.fraud_alerts')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alerts_status_created_at
    ON dbo.fraud_alerts(alert_status, created_at DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_fraud_alerts_transaction_id'
    AND object_id = OBJECT_ID('dbo.fraud_alerts')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alerts_transaction_id
    ON dbo.fraud_alerts(transaction_id);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_fraud_alerts_root_identifier'
    AND object_id = OBJECT_ID('dbo.fraud_alerts')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alerts_root_identifier
    ON dbo.fraud_alerts(root_identifier_type, root_identifier_value);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_fraud_alerts_risk_level'
    AND object_id = OBJECT_ID('dbo.fraud_alerts')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alerts_risk_level
    ON dbo.fraud_alerts(risk_level);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_fraud_alerts_final_decision'
    AND object_id = OBJECT_ID('dbo.fraud_alerts')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_fraud_alerts_final_decision
    ON dbo.fraud_alerts(final_decision);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_fraud_alerts_transaction_root_open'
    AND object_id = OBJECT_ID('dbo.fraud_alerts')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_alerts_transaction_root_open
    ON dbo.fraud_alerts(transaction_id, root_identifier_type, root_identifier_value)
    WHERE alert_status IN ('OPEN', 'ASSIGNED', 'UNDER_REVIEW');
END;
GO
