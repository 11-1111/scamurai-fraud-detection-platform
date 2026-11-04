# Databases

Scamurai reads from one database and owns another.

| Database | Owner | Scamurai's access | Schema source |
|---|---|---|---|
| `TransactionsDb` | the payment platform | read only | `apps/fraud-engine/database/source/` |
| `FraudDb` | Scamurai | read and write | `apps/fraud-engine/database/scripts/` |
| Neo4j graph | Scamurai | read and write | `apps/fraud-engine/database/neo4j/` |

Both SQL Server connections run with TypeORM's `synchronize` disabled. That is
deliberate: letting an ORM reshape a database that holds payment records is
how data gets lost. It does mean the scripts above are the only thing that
creates or changes a schema, applied by the migration runner:

```bash
npm run db:migrate         # apply anything outstanding
npm run db:migrate:check   # report outstanding work, change nothing
```

## Separating read from write

The engine's purpose is to observe the payment platform, not to change it. A
single login with blanket rights on both databases is the easiest thing to
configure and the hardest to defend: a bug in a feature calculator becomes a
write to production payment data.

Three roles, by what each one actually does:

| Role | `TransactionsDb` | `FraudDb` | Used by |
|---|---|---|---|
| migrator | DDL | DDL | the migration runner, during deploys |
| application | `SELECT` | `SELECT`, `INSERT`, `UPDATE` | fraud engine, transactions API |
| seeder | `INSERT`, `DELETE` | none | the synthetic data generator, non-production only |

`least-privilege-logins.sql` creates the application and seeder logins with
exactly those grants. Run it once per server, after the first migration, as a
principal that can create logins:

```bash
sqlcmd -S <server> -U sa -C \
  -v AppPassword="<generated>" SeedPassword="<generated>" \
  -i infra/database/least-privilege-logins.sql
```

Then point the applications at the application login.

## What the local stack does instead

`infra/docker/docker-compose.yml` connects everything as `sa`. That is a
deliberate shortcut for throwaway containers, and the reason this document
exists: the moment the platform runs on a real server, the logins above are
what it should use. The compose file says so at the point where it sets the
credentials.
