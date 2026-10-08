/*
  005_velocity_failed_transaction_rules.sql
  Safe, idempotent script for SQL Server.
  - Seeds Group A velocity (failed transaction) rules into fraud_rules_config
  - Seeds optional manual-review policies into fraud_policy_rules
*/

/* ====================================================
   RULES: fraud_rules_config
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'FAILED_CARD_15M')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('FAILED_CARD_15M',
     'Repeated failed attempts on same card',
     'Detects repeated failed transactions on the same payment account within the last 15 minutes.',
     'failedTxnCountPerCardLast15Minutes',
     '>=',
     3,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'FAILED_EMAIL_15M')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('FAILED_EMAIL_15M',
     'Repeated failed attempts by same email',
     'Detects repeated failed transactions by the same customer email within the last 15 minutes.',
     'failedTxnCountPerEmailLast15Minutes',
     '>=',
     3,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'FAILED_PHONE_15M')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('FAILED_PHONE_15M',
     'Repeated failed attempts by same phone',
     'Detects repeated failed transactions by the same customer phone within the last 15 minutes.',
     'failedTxnCountPerPhoneLast15Minutes',
     '>=',
     3,
     'MEDIUM',
     15,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'FAILED_DEVICE_15M')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('FAILED_DEVICE_15M',
     'Repeated failed attempts from one device',
     'Detects repeated failed transactions from the same device fingerprint within the last 15 minutes.',
     'failedTxnCountPerDeviceLast15Minutes',
     '>=',
     3,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

/* ====================================================
   POLICIES: fraud_policy_rules
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'FAILED_CARD_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('FAILED_CARD_REVIEW',
     'Failed card velocity review',
     'Manual review when a payment account has 3 or more failed transactions in the last 15 minutes.',
     'failedTxnCountPerCardLast15Minutes',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Repeated failed card attempts require manual review',
     90,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'FAILED_DEVICE_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('FAILED_DEVICE_REVIEW',
     'Failed device velocity review',
     'Manual review when a device fingerprint has 3 or more failed transactions in the last 15 minutes.',
     'failedTxnCountPerDeviceLast15Minutes',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Repeated failed device attempts require manual review',
     90,
     1,
     SYSUTCDATETIME());
END;
GO
