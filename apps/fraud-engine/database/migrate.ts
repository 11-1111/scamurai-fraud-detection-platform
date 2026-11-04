/*
 * Schema migration runner.
 *
 * Applies the numbered SQL scripts and Cypher files in this directory, in
 * filename order, recording each one so a second run is a no-op:
 *
 *   database/source/*.sql   -> TransactionsDb  (the upstream source database)
 *   database/scripts/*.sql  -> FraudDb         (the fraud engine's own database)
 *   database/neo4j/*.cypher -> the identifier graph
 *
 * Both TypeORM connections run with synchronize disabled, which is the right
 * choice for a database with real data in it but means nothing creates the
 * schema automatically. This is what creates it.
 *
 *   npm run db:migrate          apply anything outstanding
 *   npm run db:migrate -- --check   verify, change nothing (for CI)
 *
 * Each file is applied inside a transaction and its SHA-256 recorded. A file
 * whose contents changed after it was applied is reported as drift and stops
 * the run, rather than being silently skipped -- editing an applied migration
 * in place is how two environments quietly stop matching.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import neo4j from 'neo4j-driver';
import * as sql from 'mssql';

const MIGRATIONS_TABLE = 'schema_migrations';
const checkOnly = process.argv.includes('--check');

/*
 * The runner is a plain script rather than a Nest application, so it has no
 * ConfigModule to read .env for it. Values already in the environment win,
 * which is what lets the container pass configuration in without a file.
 */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) {
      continue;
    }

    const value = trimmed.slice(separator + 1).trim();
    process.env[key] = value.replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadEnvFile(join(__dirname, '..', '.env'));

type SqlTarget = {
  label: string;
  database: string;
  directory: string;
  host: string;
  port?: number;
  instanceName?: string;
  username: string;
  password: string;
};

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalPort(key: string): number | undefined {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer, received "${raw}".`);
  }
  return parsed;
}

function connectionConfig(
  target: Pick<
    SqlTarget,
    'host' | 'port' | 'instanceName' | 'username' | 'password'
  >,
  database: string,
): sql.config {
  return {
    server: target.host,
    port: target.port,
    database,
    user: target.username,
    password: target.password,
    connectionTimeout: 30_000,
    requestTimeout: 600_000,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      useUTC: true,
      enableArithAbort: true,
      ...(target.instanceName ? { instanceName: target.instanceName } : {}),
    },
  };
}

function sha256(contents: string): string {
  return createHash('sha256').update(contents, 'utf8').digest('hex');
}

function migrationFiles(directory: string, extension: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return [];
  }

  // Filename order is the migration order, which is why they are zero-padded.
  return entries.filter((name) => name.endsWith(extension)).sort();
}

/*
 * GO is a client-side batch separator, not a T-SQL statement, so the driver
 * never sees it -- the runner has to split on it and send each batch
 * separately. Only a line consisting of GO on its own counts.
 */
function splitSqlBatches(contents: string): string[] {
  return contents
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);
}

async function ensureDatabaseExists(target: SqlTarget): Promise<void> {
  const adminUser = process.env.DB_ADMIN_USERNAME?.trim() || target.username;
  const adminPassword =
    process.env.DB_ADMIN_PASSWORD?.trim() || target.password;

  const pool = await new sql.ConnectionPool(
    connectionConfig(
      { ...target, username: adminUser, password: adminPassword },
      'master',
    ),
  ).connect();

  try {
    const result = await pool
      .request()
      .input('name', sql.NVarChar, target.database)
      .query<{ name: string }>(
        'SELECT name FROM sys.databases WHERE name = @name',
      );

    if (result.recordset.length > 0) {
      return;
    }

    if (checkOnly) {
      throw new Error(`Database ${target.database} does not exist.`);
    }

    // CREATE DATABASE cannot be parameterised, hence the identifier quoting.
    const safeName = target.database.replace(/]/g, ']]');
    await pool.request().batch(`CREATE DATABASE [${safeName}]`);
    console.log(`  created database ${target.database}`);
  } finally {
    await pool.close();
  }
}

async function ensureMigrationsTable(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().batch(`
    IF OBJECT_ID('dbo.${MIGRATIONS_TABLE}', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.${MIGRATIONS_TABLE} (
        filename   NVARCHAR(260) NOT NULL
                     CONSTRAINT PK_${MIGRATIONS_TABLE} PRIMARY KEY,
        checksum   CHAR(64) NOT NULL,
        applied_at DATETIME2 NOT NULL
                     CONSTRAINT DF_${MIGRATIONS_TABLE}_applied_at DEFAULT SYSUTCDATETIME()
      );
    END;
  `);
}

async function migrateSqlTarget(target: SqlTarget): Promise<number> {
  const files = migrationFiles(target.directory, '.sql');
  console.log(
    `\n${target.label} (${target.database}): ${files.length} migration file(s)`,
  );

  if (files.length === 0) {
    return 0;
  }

  await ensureDatabaseExists(target);

  const pool = await new sql.ConnectionPool(
    connectionConfig(target, target.database),
  ).connect();

  try {
    await ensureMigrationsTable(pool);

    const appliedRows = await pool
      .request()
      .query<{ filename: string; checksum: string }>(
        `SELECT filename, checksum FROM dbo.${MIGRATIONS_TABLE}`,
      );
    const applied = new Map(
      appliedRows.recordset.map((row) => [row.filename, row.checksum]),
    );

    let pending = 0;

    for (const filename of files) {
      const contents = readFileSync(join(target.directory, filename), 'utf8');
      const checksum = sha256(contents);
      const previous = applied.get(filename);

      if (previous === checksum) {
        continue;
      }

      if (previous && previous !== checksum) {
        throw new Error(
          `${filename} has changed since it was applied to ${target.database}. ` +
            `Add a new migration instead of editing an applied one.`,
        );
      }

      pending += 1;

      if (checkOnly) {
        console.log(`  PENDING ${filename}`);
        continue;
      }

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        for (const batch of splitSqlBatches(contents)) {
          await new sql.Request(transaction).batch(batch);
        }

        await new sql.Request(transaction)
          .input('filename', sql.NVarChar(260), filename)
          .input('checksum', sql.Char(64), checksum)
          .query(
            `INSERT INTO dbo.${MIGRATIONS_TABLE} (filename, checksum)
             VALUES (@filename, @checksum)`,
          );

        await transaction.commit();
        console.log(`  applied ${filename}`);
      } catch (error) {
        await transaction.rollback();
        throw new Error(
          `${filename} failed against ${target.database}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (pending === 0) {
      console.log('  up to date');
    }

    return pending;
  } finally {
    await pool.close();
  }
}

/*
 * Cypher has no GO, and the driver takes one statement per call, so split on
 * semicolons. Line comments are stripped first so a semicolon inside one
 * cannot end a statement early.
 */
function splitCypherStatements(contents: string): string[] {
  return contents
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function migrateNeo4j(directory: string): Promise<number> {
  const files = migrationFiles(directory, '.cypher');
  console.log(`\nNeo4j graph: ${files.length} migration file(s)`);

  if (files.length === 0) {
    return 0;
  }

  const driver = neo4j.driver(
    required('NEO4J_URI'),
    neo4j.auth.basic(required('NEO4J_USER'), required('NEO4J_PASSWORD')),
  );

  try {
    const session = driver.session();
    let pending = 0;

    try {
      await session.run(
        `CREATE CONSTRAINT schema_migration_filename_unique IF NOT EXISTS
         FOR (m:SchemaMigration) REQUIRE m.filename IS UNIQUE`,
      );

      const result = await session.run(
        'MATCH (m:SchemaMigration) RETURN m.filename AS filename, m.checksum AS checksum',
      );
      const applied = new Map<string, string>(
        result.records.map((record) => [
          record.get('filename') as string,
          record.get('checksum') as string,
        ]),
      );

      for (const filename of files) {
        const contents = readFileSync(join(directory, filename), 'utf8');
        const checksum = sha256(contents);
        const previous = applied.get(filename);

        if (previous === checksum) {
          continue;
        }

        if (previous && previous !== checksum) {
          throw new Error(
            `${filename} has changed since it was applied to the graph. ` +
              `Add a new migration instead of editing an applied one.`,
          );
        }

        pending += 1;

        if (checkOnly) {
          console.log(`  PENDING ${filename}`);
          continue;
        }

        let skipped = 0;

        for (const statement of splitCypherStatements(contents)) {
          try {
            await session.run(statement);
          } catch (error) {
            /*
             * Property-existence constraints are an Enterprise feature. On
             * Community they are unavailable rather than wrong, so note them
             * and carry on instead of failing a local stack.
             */
            const message =
              error instanceof Error ? error.message : String(error);
            if (/IS NOT NULL/i.test(statement) && /Enterprise/i.test(message)) {
              skipped += 1;
              continue;
            }
            throw new Error(`${filename} failed: ${message}`);
          }
        }

        await session.run(
          `MERGE (m:SchemaMigration {filename: $filename})
           SET m.checksum = $checksum, m.appliedAt = datetime()`,
          { filename, checksum },
        );

        console.log(
          `  applied ${filename}${
            skipped > 0
              ? ` (${skipped} Enterprise-only constraint(s) skipped)`
              : ''
          }`,
        );
      }

      if (pending === 0) {
        console.log('  up to date');
      }

      return pending;
    } finally {
      await session.close();
    }
  } finally {
    await driver.close();
  }
}

async function main(): Promise<void> {
  console.log(
    checkOnly
      ? 'Checking for outstanding migrations (nothing will be written).'
      : 'Applying outstanding migrations.',
  );

  const here = __dirname;

  const targets: SqlTarget[] = [
    {
      label: 'Source database',
      database: required('SOURCE_DB_NAME'),
      directory: join(here, 'source'),
      host: required('SOURCE_DB_HOST'),
      port: optionalPort('SOURCE_DB_PORT'),
      instanceName: process.env.SOURCE_DB_INSTANCE?.trim() || undefined,
      username: required('SOURCE_DB_USERNAME'),
      password: required('SOURCE_DB_PASSWORD'),
    },
    {
      label: 'Fraud database',
      database: required('FRAUD_DB_NAME'),
      directory: join(here, 'scripts'),
      host: required('FRAUD_DB_HOST'),
      port: optionalPort('FRAUD_DB_PORT'),
      instanceName: process.env.FRAUD_DB_INSTANCE?.trim() || undefined,
      username: required('FRAUD_DB_USERNAME'),
      password: required('FRAUD_DB_PASSWORD'),
    },
  ];

  let pending = 0;
  for (const target of targets) {
    pending += await migrateSqlTarget(target);
  }
  pending += await migrateNeo4j(join(here, 'neo4j'));

  if (checkOnly && pending > 0) {
    throw new Error(`${pending} migration(s) outstanding.`);
  }

  console.log(
    checkOnly ? '\nSchema is up to date.' : '\nMigrations complete.',
  );
}

main().catch((error: unknown) => {
  console.error(
    `\nMigration failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});
