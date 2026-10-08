/*
  003_configurable_rules_and_policy.sql
  Safe, idempotent script for SQL Server.
  - Creates configurable rule/policy tables if missing
  - Adds missing columns when table already exists
  - Seeds default configuration using MERGE (upsert)
*/

/* ====================================================
   TABLE: fraud_rules_config
   ==================================================== */
IF OBJECT_ID('dbo.fraud_rules_config', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_rules_config (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rule_code NVARCHAR(100) NOT NULL,
    rule_name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    feature_name NVARCHAR(100) NOT NULL,
    operator NVARCHAR(20) NOT NULL,
    threshold_value DECIMAL(18,2) NOT NULL,
    severity NVARCHAR(20) NOT NULL,
    score_impact INT NOT NULL,
    is_enabled BIT NOT NULL CONSTRAINT DF_fraud_rules_config_is_enabled DEFAULT (1),
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_rules_config_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NULL
  );
END;
GO

IF COL_LENGTH('dbo.fraud_rules_config', 'rule_code') IS NULL ALTER TABLE dbo.fraud_rules_config ADD rule_code NVARCHAR(100) NOT NULL CONSTRAINT DF_fraud_rules_config_rule_code DEFAULT ('');
IF COL_LENGTH('dbo.fraud_rules_config', 'rule_name') IS NULL ALTER TABLE dbo.fraud_rules_config ADD rule_name NVARCHAR(255) NOT NULL CONSTRAINT DF_fraud_rules_config_rule_name DEFAULT ('');
IF COL_LENGTH('dbo.fraud_rules_config', 'description') IS NULL ALTER TABLE dbo.fraud_rules_config ADD description NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.fraud_rules_config', 'feature_name') IS NULL ALTER TABLE dbo.fraud_rules_config ADD feature_name NVARCHAR(100) NOT NULL CONSTRAINT DF_fraud_rules_config_feature_name DEFAULT ('');
IF COL_LENGTH('dbo.fraud_rules_config', 'operator') IS NULL ALTER TABLE dbo.fraud_rules_config ADD operator NVARCHAR(20) NOT NULL CONSTRAINT DF_fraud_rules_config_operator DEFAULT ('>=');
IF COL_LENGTH('dbo.fraud_rules_config', 'threshold_value') IS NULL ALTER TABLE dbo.fraud_rules_config ADD threshold_value DECIMAL(18,2) NOT NULL CONSTRAINT DF_fraud_rules_config_threshold_value DEFAULT (0);
IF COL_LENGTH('dbo.fraud_rules_config', 'severity') IS NULL ALTER TABLE dbo.fraud_rules_config ADD severity NVARCHAR(20) NOT NULL CONSTRAINT DF_fraud_rules_config_severity DEFAULT ('MEDIUM');
IF COL_LENGTH('dbo.fraud_rules_config', 'score_impact') IS NULL ALTER TABLE dbo.fraud_rules_config ADD score_impact INT NOT NULL CONSTRAINT DF_fraud_rules_config_score_impact DEFAULT (0);
IF COL_LENGTH('dbo.fraud_rules_config', 'is_enabled') IS NULL ALTER TABLE dbo.fraud_rules_config ADD is_enabled BIT NOT NULL CONSTRAINT DF_fraud_rules_config_is_enabled_alt DEFAULT (1);
IF COL_LENGTH('dbo.fraud_rules_config', 'created_at') IS NULL ALTER TABLE dbo.fraud_rules_config ADD created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_rules_config_created_at_alt DEFAULT (SYSUTCDATETIME());
IF COL_LENGTH('dbo.fraud_rules_config', 'updated_at') IS NULL ALTER TABLE dbo.fraud_rules_config ADD updated_at DATETIME2 NULL;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_fraud_rules_config_rule_code'
    AND object_id = OBJECT_ID('dbo.fraud_rules_config')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_rules_config_rule_code
    ON dbo.fraud_rules_config(rule_code);
END;
GO

MERGE dbo.fraud_rules_config AS target
USING (
  VALUES
    ('DEVICE_MULTI_EMAIL', 'Device linked to multiple emails', 'Configurable rule for device to many emails', 'uniqueEmailsLinked', '>=', 3, 'HIGH', 25, 1),
    ('PAYMENT_MULTI_EMAIL', 'Payment account linked to multiple emails', 'Configurable rule for payment account to many emails', 'uniqueEmailsPerPaymentAccount', '>=', 2, 'HIGH', 25, 1),
    ('IP_MULTI_EMAIL', 'IP linked to multiple emails', 'Configurable rule for IP to many emails', 'uniqueEmailsPerIp', '>=', 3, 'MEDIUM', 15, 1),
    ('MANY_CONFIRMATION_CODES', 'Many confirmation codes', 'Configurable rule for confirmation code volume', 'confirmationCodeCount', '>=', 5, 'MEDIUM', 10, 1),
    ('MANY_ORDER_TRACKING_IDS', 'Many order tracking IDs', 'Configurable rule for order tracking ID volume', 'orderTrackingIdCount', '>=', 5, 'MEDIUM', 10, 1),
    ('BANK_AUTH_LINKAGE', 'Bank auth linkage', 'Configurable rule for bank auth linkage', 'bankAuthCodeCount', '>=', 3, 'MEDIUM', 10, 1),
    ('FAILED_TX_COUNT', 'High failed transaction count', 'Configurable rule for failed transaction volume', 'failedTransactionCount', '>=', 3, 'HIGH', 20, 1),
    ('TRANSACTION_VOLUME', 'High transaction volume', 'Configurable rule for high transaction volume', 'transactionCount', '>=', 10, 'MEDIUM', 10, 1)
) AS source (
  rule_code,
  rule_name,
  description,
  feature_name,
  operator,
  threshold_value,
  severity,
  score_impact,
  is_enabled
)
ON target.rule_code = source.rule_code
WHEN MATCHED THEN
  UPDATE SET
    target.rule_name = source.rule_name,
    target.description = source.description,
    target.feature_name = source.feature_name,
    target.operator = source.operator,
    target.threshold_value = source.threshold_value,
    target.severity = source.severity,
    target.score_impact = source.score_impact,
    target.is_enabled = source.is_enabled,
    target.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (
    rule_code,
    rule_name,
    description,
    feature_name,
    operator,
    threshold_value,
    severity,
    score_impact,
    is_enabled,
    created_at
  )
  VALUES (
    source.rule_code,
    source.rule_name,
    source.description,
    source.feature_name,
    source.operator,
    source.threshold_value,
    source.severity,
    source.score_impact,
    source.is_enabled,
    SYSUTCDATETIME()
  );
GO

/* ====================================================
   TABLE: fraud_risk_levels
   ==================================================== */
IF OBJECT_ID('dbo.fraud_risk_levels', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_risk_levels (
    id INT IDENTITY(1,1) PRIMARY KEY,
    level_code NVARCHAR(50) NOT NULL,
    min_score INT NOT NULL,
    max_score INT NOT NULL,
    default_decision NVARCHAR(50) NOT NULL,
    display_color NVARCHAR(50) NULL,
    priority INT NOT NULL,
    is_enabled BIT NOT NULL CONSTRAINT DF_fraud_risk_levels_is_enabled DEFAULT (1)
  );
END;
GO

IF COL_LENGTH('dbo.fraud_risk_levels', 'level_code') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD level_code NVARCHAR(50) NOT NULL CONSTRAINT DF_fraud_risk_levels_level_code DEFAULT ('');
IF COL_LENGTH('dbo.fraud_risk_levels', 'min_score') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD min_score INT NOT NULL CONSTRAINT DF_fraud_risk_levels_min_score DEFAULT (0);
IF COL_LENGTH('dbo.fraud_risk_levels', 'max_score') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD max_score INT NOT NULL CONSTRAINT DF_fraud_risk_levels_max_score DEFAULT (100);
IF COL_LENGTH('dbo.fraud_risk_levels', 'default_decision') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD default_decision NVARCHAR(50) NOT NULL CONSTRAINT DF_fraud_risk_levels_default_decision DEFAULT ('ALLOW');
IF COL_LENGTH('dbo.fraud_risk_levels', 'display_color') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD display_color NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.fraud_risk_levels', 'priority') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD priority INT NOT NULL CONSTRAINT DF_fraud_risk_levels_priority DEFAULT (1);
IF COL_LENGTH('dbo.fraud_risk_levels', 'is_enabled') IS NULL ALTER TABLE dbo.fraud_risk_levels ADD is_enabled BIT NOT NULL CONSTRAINT DF_fraud_risk_levels_is_enabled_alt DEFAULT (1);
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_fraud_risk_levels_level_code'
    AND object_id = OBJECT_ID('dbo.fraud_risk_levels')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_risk_levels_level_code
    ON dbo.fraud_risk_levels(level_code);
END;
GO

MERGE dbo.fraud_risk_levels AS target
USING (
  VALUES
    ('LOW', 0, 30, 'ALLOW', 'green', 1, 1),
    ('MEDIUM', 31, 60, 'ALLOW_WITH_MONITORING', 'amber', 2, 1),
    ('HIGH', 61, 85, 'MANUAL_REVIEW', 'orange', 3, 1),
    ('CRITICAL', 86, 100, 'BLOCK', 'red', 4, 1)
) AS source (
  level_code,
  min_score,
  max_score,
  default_decision,
  display_color,
  priority,
  is_enabled
)
ON target.level_code = source.level_code
WHEN MATCHED THEN
  UPDATE SET
    target.min_score = source.min_score,
    target.max_score = source.max_score,
    target.default_decision = source.default_decision,
    target.display_color = source.display_color,
    target.priority = source.priority,
    target.is_enabled = source.is_enabled
WHEN NOT MATCHED THEN
  INSERT (
    level_code,
    min_score,
    max_score,
    default_decision,
    display_color,
    priority,
    is_enabled
  )
  VALUES (
    source.level_code,
    source.min_score,
    source.max_score,
    source.default_decision,
    source.display_color,
    source.priority,
    source.is_enabled
  );
GO

/* ====================================================
   TABLE: fraud_policy_rules
   ==================================================== */
IF OBJECT_ID('dbo.fraud_policy_rules', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fraud_policy_rules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    policy_code NVARCHAR(100) NOT NULL,
    policy_name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    condition_feature NVARCHAR(100) NULL,
    operator NVARCHAR(20) NULL,
    condition_value DECIMAL(18,2) NULL,
    min_risk_score INT NULL,
    max_risk_score INT NULL,
    risk_level NVARCHAR(50) NULL,
    decision NVARCHAR(50) NOT NULL,
    action_label NVARCHAR(255) NOT NULL,
    priority INT NOT NULL CONSTRAINT DF_fraud_policy_rules_priority DEFAULT (1),
    is_enabled BIT NOT NULL CONSTRAINT DF_fraud_policy_rules_is_enabled DEFAULT (1),
    created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_policy_rules_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NULL
  );
END;
GO

IF COL_LENGTH('dbo.fraud_policy_rules', 'policy_code') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD policy_code NVARCHAR(100) NOT NULL CONSTRAINT DF_fraud_policy_rules_policy_code DEFAULT ('');
IF COL_LENGTH('dbo.fraud_policy_rules', 'policy_name') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD policy_name NVARCHAR(255) NOT NULL CONSTRAINT DF_fraud_policy_rules_policy_name DEFAULT ('');
IF COL_LENGTH('dbo.fraud_policy_rules', 'description') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD description NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'condition_feature') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD condition_feature NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'operator') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD operator NVARCHAR(20) NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'condition_value') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD condition_value DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'min_risk_score') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD min_risk_score INT NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'max_risk_score') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD max_risk_score INT NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'risk_level') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD risk_level NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.fraud_policy_rules', 'decision') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD decision NVARCHAR(50) NOT NULL CONSTRAINT DF_fraud_policy_rules_decision DEFAULT ('ALLOW');
IF COL_LENGTH('dbo.fraud_policy_rules', 'action_label') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD action_label NVARCHAR(255) NOT NULL CONSTRAINT DF_fraud_policy_rules_action_label DEFAULT ('No action');
IF COL_LENGTH('dbo.fraud_policy_rules', 'priority') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD priority INT NOT NULL CONSTRAINT DF_fraud_policy_rules_priority_alt DEFAULT (1);
IF COL_LENGTH('dbo.fraud_policy_rules', 'is_enabled') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD is_enabled BIT NOT NULL CONSTRAINT DF_fraud_policy_rules_is_enabled_alt DEFAULT (1);
IF COL_LENGTH('dbo.fraud_policy_rules', 'created_at') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD created_at DATETIME2 NOT NULL CONSTRAINT DF_fraud_policy_rules_created_at_alt DEFAULT (SYSUTCDATETIME());
IF COL_LENGTH('dbo.fraud_policy_rules', 'updated_at') IS NULL ALTER TABLE dbo.fraud_policy_rules ADD updated_at DATETIME2 NULL;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_fraud_policy_rules_policy_code'
    AND object_id = OBJECT_ID('dbo.fraud_policy_rules')
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UX_fraud_policy_rules_policy_code
    ON dbo.fraud_policy_rules(policy_code);
END;
GO

MERGE dbo.fraud_policy_rules AS target
USING (
  VALUES
    ('CRITICAL_BLOCK', 'Critical score block', 'Block critical-risk transactions', NULL, NULL, NULL, 86, 100, NULL, 'BLOCK', 'Block transaction and create critical fraud case', 100, 1),
    ('HIGH_VALUE_REVIEW', 'High value review', 'Manual review for high-value transactions above threshold', 'totalAmountValue', '>=', 1000, 31, 100, NULL, 'MANUAL_REVIEW', 'High value transaction requires manual review', 90, 1),
    ('HIGH_MANUAL_REVIEW', 'High score manual review', 'Send high-risk transactions to analyst queue', NULL, NULL, NULL, 61, 85, NULL, 'MANUAL_REVIEW', 'Send to fraud analyst queue', 80, 1),
    ('MEDIUM_MONITORING', 'Medium score monitoring', 'Allow transaction with enhanced monitoring', NULL, NULL, NULL, 31, 60, NULL, 'ALLOW_WITH_MONITORING', 'Allow but increase monitoring', 50, 1),
    ('LOW_ALLOW', 'Low risk allow', 'Allow low-risk transactions', NULL, NULL, NULL, 0, 30, NULL, 'ALLOW', 'Allow transaction', 10, 1)
) AS source (
  policy_code,
  policy_name,
  description,
  condition_feature,
  operator,
  condition_value,
  min_risk_score,
  max_risk_score,
  risk_level,
  decision,
  action_label,
  priority,
  is_enabled
)
ON target.policy_code = source.policy_code
WHEN MATCHED THEN
  UPDATE SET
    target.policy_name = source.policy_name,
    target.description = source.description,
    target.condition_feature = source.condition_feature,
    target.operator = source.operator,
    target.condition_value = source.condition_value,
    target.min_risk_score = source.min_risk_score,
    target.max_risk_score = source.max_risk_score,
    target.risk_level = source.risk_level,
    target.decision = source.decision,
    target.action_label = source.action_label,
    target.priority = source.priority,
    target.is_enabled = source.is_enabled,
    target.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (
    policy_code,
    policy_name,
    description,
    condition_feature,
    operator,
    condition_value,
    min_risk_score,
    max_risk_score,
    risk_level,
    decision,
    action_label,
    priority,
    is_enabled,
    created_at
  )
  VALUES (
    source.policy_code,
    source.policy_name,
    source.description,
    source.condition_feature,
    source.operator,
    source.condition_value,
    source.min_risk_score,
    source.max_risk_score,
    source.risk_level,
    source.decision,
    source.action_label,
    source.priority,
    source.is_enabled,
    SYSUTCDATETIME()
  );
GO
