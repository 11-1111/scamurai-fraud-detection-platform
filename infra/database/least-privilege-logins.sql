/*
  least-privilege-logins.sql

  Creates the two runtime logins Scamurai needs, with the narrowest rights
  that let it do its job:

    scamurai_app   reads TransactionsDb, reads and writes FraudDb
    scamurai_seed  writes TransactionsDb, no access to FraudDb

  Neither can change a schema. Migrations run separately, as a principal that
  can execute DDL, which keeps "deploy a schema change" and "serve traffic"
  as different levels of access.

  Run once per server, after the first migration has created both databases:

    sqlcmd -S <server> -U sa -C \
      -v AppPassword="<generated>" SeedPassword="<generated>" \
      -i infra/database/least-privilege-logins.sql

  Idempotent: re-running it adds anything missing and leaves the rest alone.
  It does not reset an existing login's password.

  Do not create the seeder on a server holding real payment data. It exists
  so the synthetic generator can write sample traffic, and nothing else.
*/

:setvar SourceDatabase TransactionsDb
:setvar FraudDatabase FraudDb

SET NOCOUNT ON;
GO

/* ====================================================
   Server-level logins
   ==================================================== */

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'scamurai_app')
BEGIN
  CREATE LOGIN scamurai_app
    WITH PASSWORD = '$(AppPassword)',
         CHECK_POLICY = ON,
         DEFAULT_DATABASE = [$(FraudDatabase)];
  PRINT 'Created login scamurai_app.';
END
ELSE
  PRINT 'Login scamurai_app already exists; password left unchanged.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'scamurai_seed')
BEGIN
  CREATE LOGIN scamurai_seed
    WITH PASSWORD = '$(SeedPassword)',
         CHECK_POLICY = ON,
         DEFAULT_DATABASE = [$(SourceDatabase)];
  PRINT 'Created login scamurai_seed.';
END
ELSE
  PRINT 'Login scamurai_seed already exists; password left unchanged.';
GO

/* ====================================================
   TransactionsDb: the engine observes, it does not write
   ==================================================== */

USE [$(SourceDatabase)];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'scamurai_app')
  CREATE USER scamurai_app FOR LOGIN scamurai_app;
GO

ALTER ROLE db_datareader ADD MEMBER scamurai_app;
GO

/*
  Explicitly denied rather than merely ungranted. A later change that adds
  scamurai_app to a broader role cannot quietly hand it write access to
  payment records: DENY wins over any GRANT.
*/
DENY INSERT, UPDATE, DELETE, ALTER, REFERENCES TO scamurai_app;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'scamurai_seed')
  CREATE USER scamurai_seed FOR LOGIN scamurai_seed;
GO

/* The generator inserts sample traffic and clears it on --truncate. */
GRANT SELECT, INSERT, DELETE ON dbo.Transactions TO scamurai_seed;
GO

/* ====================================================
   FraudDb: the engine's own data
   ==================================================== */

USE [$(FraudDatabase)];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'scamurai_app')
  CREATE USER scamurai_app FOR LOGIN scamurai_app;
GO

ALTER ROLE db_datareader ADD MEMBER scamurai_app;
ALTER ROLE db_datawriter ADD MEMBER scamurai_app;
GO

/*
  Writing rows is the job; reshaping the schema is not. Migrations run as a
  different principal, so the application has no reason to hold DDL rights
  and every reason not to.
*/
DENY ALTER, CREATE TABLE, CREATE VIEW, CREATE PROCEDURE TO scamurai_app;
GO

/*
  The alert audit trail is append-only by design. Enforcing that here means a
  future bug cannot rewrite the record of who decided what.
*/
DENY UPDATE, DELETE ON dbo.fraud_alert_history TO scamurai_app;
GO

PRINT 'Least-privilege logins configured.';
GO
