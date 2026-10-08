/*
  008_duplicate_order_tracking_rules.sql
  Safe, idempotent script for SQL Server.
  - Seeds the duplicate successful order tracking rule into fraud_rules_config
  - Seeds the blocking policy into fraud_policy_rules
*/

/* ====================================================
   RULE: fraud_rules_config
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_rules_config WHERE rule_code = 'DUPLICATE_SUCCESSFUL_ORDER_TRACKING')
BEGIN
  INSERT INTO dbo.fraud_rules_config
    (rule_code, rule_name, description, feature_name, operator, threshold_value, severity, score_impact, is_enabled, created_at)
  VALUES
    ('DUPLICATE_SUCCESSFUL_ORDER_TRACKING',
     'Duplicate successful Order Tracking ID',
     'A successful transaction already exists for this Order Tracking ID. Possible replay attack or duplicate settlement attempt.',
     'orderTrackingIdSuccessExists',
     '=',
     1,
     'CRITICAL',
     100,
     1,
     SYSUTCDATETIME());
END;
GO

/* ====================================================
   POLICY: fraud_policy_rules
   ==================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.fraud_policy_rules WHERE policy_code = 'BLOCK_DUPLICATE_ORDER_TRACKING')
BEGIN
  INSERT INTO dbo.fraud_policy_rules
    (policy_code, policy_name, description, condition_feature, operator, condition_value, min_risk_score, max_risk_score, risk_level, decision, action_label, priority, is_enabled, created_at)
  VALUES
    ('BLOCK_DUPLICATE_ORDER_TRACKING',
     'Block duplicate order tracking',
     'Possible replay attack or duplicate settlement attempt: a successful transaction already exists for this Order Tracking ID.',
     'orderTrackingIdSuccessExists',
     '=',
     1,
     NULL,
     NULL,
     NULL,
     'BLOCK',
     'Block duplicate successful Order Tracking ID.',
     100,
     1,
     SYSUTCDATETIME());
END;
GO
