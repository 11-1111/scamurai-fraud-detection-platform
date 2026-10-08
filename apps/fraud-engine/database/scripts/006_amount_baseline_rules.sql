/*
  006_amount_baseline_rules.sql
  Safe, idempotent script for SQL Server.
  - Seeds Group B amount baseline rules into fraud_rules_config
  - Seeds manual-review policies into fraud_policy_rules
*/

/* ====================================================
   RULES: fraud_rules_config
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'ACCOUNT_CURRENT_AMOUNT_SPIKE_30D')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('ACCOUNT_CURRENT_AMOUNT_SPIKE_30D',
     'Card transaction amount unusually high vs 30-day average',
     'Detects a transaction amount much higher than the payment account average over the last 30 days.',
     'accountCurrentAmountToAverage30dRatio',
     '>=',
     5,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'ACCOUNT_TODAY_TOTAL_SPIKE_30D')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('ACCOUNT_TODAY_TOTAL_SPIKE_30D',
     'Card daily spend unusually high vs 30-day average',
     'Detects a payment account spending much more today than its normal daily activity over the last 30 days.',
     'accountTodayTotalToAverageDaily30dRatio',
     '>=',
     3,
     'HIGH',
     25,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'MERCHANT_TODAY_TOTAL_SPIKE_7D')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('MERCHANT_TODAY_TOTAL_SPIKE_7D',
     'Merchant daily received amount unusually high vs 7-day average',
     'Detects a merchant receiving much more today than its normal daily activity over the last 7 days.',
     'merchantTodayTotalToAverageDaily7dRatio',
     '>=',
     3,
     'MEDIUM',
     15,
     1,
     SYSUTCDATETIME());
END;
GO

/* ====================================================
   POLICIES: fraud_policy_rules
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'ACCOUNT_AMOUNT_SPIKE_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('ACCOUNT_AMOUNT_SPIKE_REVIEW',
     'Account amount spike review',
     'Manual review when the current transaction amount is at least 5x the account 30-day average.',
     'accountCurrentAmountToAverage30dRatio',
     '>=',
     5,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review transaction because current amount is at least 5x the account''s 30-day average.',
     85,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'ACCOUNT_DAILY_SPIKE_REVIEW')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('ACCOUNT_DAILY_SPIKE_REVIEW',
     'Account daily spend spike review',
     'Manual review when today''s account spend is at least 3x normal daily activity over the last 30 days.',
     'accountTodayTotalToAverageDaily30dRatio',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review transaction because today''s account spend is at least 3x normal daily activity.',
     80,
     1,
     SYSUTCDATETIME());
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'MERCHANT_DAILY_SPIKE_MONITOR')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('MERCHANT_DAILY_SPIKE_MONITOR',
     'Merchant daily received spike monitor',
     'Manual review when a merchant''s received amount today is at least 3x its normal 7-day daily activity.',
     'merchantTodayTotalToAverageDaily7dRatio',
     '>=',
     3,
     NULL,
     NULL,
     NULL,
     'MANUAL_REVIEW',
     'Review merchant activity because today''s received amount is at least 3x normal 7-day activity.',
     75,
     1,
     SYSUTCDATETIME());
END;
GO
