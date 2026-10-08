/*
  007_distinct_card_velocity_rules.sql
  Safe, idempotent script for SQL Server.
  - Seeds Group C distinct card/account velocity rules into fraud_rules_config
  - Seeds manual-review policies into fraud_policy_rules
*/

/* ====================================================
   RULES: fraud_rules_config
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'DEVICE_DISTINCT_CARDS_1H')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('DEVICE_DISTINCT_CARDS_1H',
     'Device used with many payment accounts in 1 hour',
     'Detects one device fingerprint trying multiple payment accounts within the last hour.',
     'deviceDistinctCardsLast1Hour',
     '>=',
     3,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'IP_DISTINCT_CARDS_15M')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('IP_DISTINCT_CARDS_15M',
     'IP used with many payment accounts in 15 minutes',
     'Detects one IP address trying multiple payment accounts within the last 15 minutes.',
     'ipDistinctCardsLast15Minutes',
     '>=',
     3,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'MERCHANT_DISTINCT_CARDS_15M')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('MERCHANT_DISTINCT_CARDS_15M',
     'Merchant received many payment accounts in 15 minutes',
     'Detects possible card testing at one merchant within the last 15 minutes.',
     'merchantDistinctCardsLast15Minutes',
     '>=',
     5,
     'MEDIUM',
     15,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'MERCHANT_REF_DISTINCT_ACCOUNTS_24H')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('MERCHANT_REF_DISTINCT_ACCOUNTS_24H',
     'Merchant reference used with many payment accounts in 24 hours',
     'Detects one order/reference being tried with multiple payment accounts within the last 24 hours.',
     'merchantRefDistinctPaymentAccounts24h',
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
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'DEVICE_DISTINCT_CARDS_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('DEVICE_DISTINCT_CARDS_REVIEW',
     'Device multi-card review',
     'Manual review when one device used multiple payment accounts within 1 hour.',
     'deviceDistinctCardsLast1Hour',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review because one device used multiple payment accounts within 1 hour.',
     90,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'IP_DISTINCT_CARDS_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('IP_DISTINCT_CARDS_REVIEW',
     'IP multi-card review',
     'Manual review when one IP used multiple payment accounts within 15 minutes.',
     'ipDistinctCardsLast15Minutes',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review because one IP used multiple payment accounts within 15 minutes.',
     90,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'MERCHANT_CARD_TESTING_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('MERCHANT_CARD_TESTING_REVIEW',
     'Merchant card testing review',
     'Manual review when many cards were attempted at one merchant in 15 minutes.',
     'merchantDistinctCardsLast15Minutes',
     '>=',
     5,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review merchant activity because many cards were attempted in 15 minutes.',
     80,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'MERCHANT_REF_MULTI_ACCOUNT_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('MERCHANT_REF_MULTI_ACCOUNT_REVIEW',
     'Merchant reference multi-account review',
     'Manual review when one merchant reference was attempted with multiple payment accounts within 24 hours.',
     'merchantRefDistinctPaymentAccounts24h',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review because one merchant reference was attempted with multiple payment accounts.',
     85,
     1,
     SYSUTCDATETIME());
END;
GO
