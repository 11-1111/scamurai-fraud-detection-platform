# Scamurai — Fraud Detection & Risk Analysis Platform

A fraud detection platform for payment transactions: ingests transactions,
derives behavioural features, evaluates configurable rules, scores risk,
applies policy, and raises alerts an analyst can work through — with an
identifier graph that exposes rings a per-transaction view cannot see.

Vue 3 · NestJS · ASP.NET Core 8 · SQL Server · Redis · Neo4j · Docker

## Run it

Requires Docker with the Compose plugin, and roughly 4 GB of memory for the
datastores.

```bash
git clone https://github.com/11-1111/Scamurai.git
cd Scamurai
cp infra/docker/.env.example infra/docker/.env
npm run up:seed
```

That builds all four applications, starts SQL Server, Redis and Neo4j, applies
every migration to empty databases, and generates 100,000 synthetic
transactions with fraud rings planted in them. First run takes a few minutes,
mostly pulling images.

Then open **http://localhost:8080**.

| Service | URL |
|---|---|
| Dashboard | http://localhost:8080 |
| BFF (Swagger) | http://localhost:3000/api/docs |
| Fraud engine | http://localhost:4000 |
| Transactions API | http://localhost:5289/api/transactions/search?page=1&pageSize=25 |
| Neo4j browser | http://localhost:7474 |

`npm run up` does the same without the synthetic data. `npm run down` stops
the stack; `npm run down:clean` also discards the volumes.

## Architecture

Four applications:

| Application | Technology | Responsibility |
|---|---|---|
| Frontend | Vue 3 + TypeScript | Fraud monitoring dashboard |
| BFF | NestJS | API aggregation, validation, the only layer a browser reaches |
| Fraud engine | NestJS | Ingestion, features, rules, scoring, policy, alerts |
| Transactions API | ASP.NET Core 8 | Read access to the payment platform's transactions |

Scoring runs as replaceable stages — features, rules, risk score, risk level,
policy, alert. Rules, risk levels and policies are rows in the database rather
than code, so a threshold changes without a deploy. Feature calculators are
code, registered through a DI token, so adding one is a new class rather than
an edit to a switch statement.

[`docs/architecture/`](docs/architecture/README.md) covers the data flow, why
there are two databases, what the identifier graph is for, and the gaps that
are known rather than hidden.

## Repository structure

```text
apps/
  frontend/           Vue 3 dashboard, layered per feature module
  bff/                NestJS backend-for-frontend
  fraud-engine/       NestJS detection service
    database/
      source/         TransactionsDb schema (read by the engine)
      scripts/        FraudDb schema and seeded configuration
      neo4j/          graph constraints and indexes
      seed/           synthetic data generator
      migrate.ts      migration runner
  transactions-api/   ASP.NET Core 8 transactions service

infra/
  docker/             compose stack and nginx config
  database/           database roles and least-privilege logins
  apache/             reverse proxy vhost for a single-server deployment

docs/
  architecture/       diagrams, data flow, design decisions
```

## Databases and migrations

Two SQL Server databases and one graph. `TransactionsDb` belongs to the
payment platform and is read only; `FraudDb` is Scamurai's own. Both
connections run with TypeORM's `synchronize` disabled, so the numbered scripts
under `apps/fraud-engine/database/` are the only source of truth.

```bash
npm run db:migrate         # apply anything outstanding
npm run db:migrate:check   # report outstanding work, change nothing
```

The runner creates the databases if they are absent, applies each file in a
transaction, and records its SHA-256. A file edited after it was applied stops
the run rather than being silently skipped. CI builds the whole schema from
empty datastores on every push.

See [`infra/database/`](infra/database/README.md) for the logins a real
deployment should use — the local stack connects as `sa`, which is a
convenience for throwaway containers and nothing more.

## Synthetic data

```bash
npm run db:seed -- --count 5000 --days 7 --manifest rings.json
```

Eight fraud patterns are planted at known times: a device cycling twelve
cards, a forty-decline card-testing burst, an account takeover, a ring of
eight accounts behind one device, an order replay, a merchant-ref fan-out, a
merchant card sweep, and contact-level decline velocity. Between them they
exercise all twelve feature calculators.

The manifest is a label set — which transactions belong to which ring, and
which features each should trip — so rule precision and recall are
measurable rather than arguable. Generation is deterministic: the same seed
produces identical output, UUIDs included.

[`apps/fraud-engine/database/seed/`](apps/fraud-engine/database/seed/README.md)
describes each ring.

## Development without Docker

Needs Node 20.11+, .NET 8 SDK, and SQL Server, Redis and Neo4j reachable from
the host.

```bash
npm install                 # one install for all three Node apps
cp apps/fraud-engine/.env.example apps/fraud-engine/.env
cp apps/bff/.env.example apps/bff/.env
cp apps/frontend/.env.example apps/frontend/.env
# fill in the datastore credentials, then:
npm run db:migrate
npm run dev:engine          # :4000
npm run dev:bff             # :3000
npm run dev:frontend        # :5173
cd apps/transactions-api && dotnet run
```

## Tests

```bash
npm run lint
npm run test
npm run build
```

Coverage is currently thin — the engines have unit tests for features and
rules, and the rest do not. Expanding it is the next piece of work, alongside
authentication.

## License

MIT. See [LICENSE](LICENSE).
