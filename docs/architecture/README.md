# Architecture

## Context

```mermaid
flowchart LR
    analyst([Fraud analyst])
    payments[(Payment platform<br/>TransactionsDb)]

    subgraph scamurai[Scamurai]
        frontend[Frontend<br/>Vue 3]
        bff[BFF<br/>NestJS]
        engine[Fraud engine<br/>NestJS]
        txapi[Transactions API<br/>ASP.NET Core 8]
        frauddb[(FraudDb<br/>SQL Server)]
        graph[(Identifier graph<br/>Neo4j)]
        queue[(Job queue<br/>Redis + BullMQ)]
    end

    analyst --> frontend
    frontend --> bff
    bff --> engine
    txapi -- read only --> payments
    engine -- read only --> payments
    engine --> frauddb
    engine --> graph
    engine --> queue
```

The dashboard never talks to the engine directly. Every request passes through
the BFF, which is the layer that validates input and the only one a browser
can reach. The engine and the transactions API stay internal, which is why the
Apache vhost in `infra/apache/` deliberately does not proxy them.

## How a transaction becomes an alert

```mermaid
sequenceDiagram
    participant Cron as Scheduler
    participant Queue as BullMQ
    participant Ing as Ingestion
    participant Src as TransactionsDb
    participant Fraud as FraudDb
    participant Graph as Neo4j

    Cron->>Queue: enqueue poll (deterministic job id)
    Queue->>Ing: run poll
    Ing->>Src: rows newer than the watermark
    rect rgb(240, 240, 240)
    note over Ing,Fraud: one transaction
    Ing->>Fraud: upsert transaction
    Ing->>Fraud: insert identifiers
    Ing->>Fraud: record the graph write in the outbox
    end
    Ing->>Graph: MERGE transaction and identifier nodes
    Ing->>Fraud: discharge the outbox entry
    Ing->>Fraud: evaluation: features, rules, score, policy
    Ing->>Fraud: alert, if the policy says so
    Ing->>Fraud: advance the watermark
```

The scheduler derives the job id from the source name rather than the clock,
so several engine replicas enqueueing the same minute's poll produce one job
rather than one each. That is what makes the engine horizontally scalable
without a leader election.

### Why the graph write goes through an outbox

`FraudDb` and Neo4j cannot share a transaction, and writing to both in
sequence means any failure between them leaves the two disagreeing with
nothing recording that a write is owed.

So the commit that makes a transaction visible also records, in the same
transaction, that the graph owes a write. Ingestion then projects into the
graph immediately and deletes its own outbox entry, which is the normal path.
A drain worker picks up whatever is left -- the process dying between the
commit and the projection, or Neo4j being unavailable when the transaction
arrived -- with backoff, and parks a row that exhausts its attempts.

The entry stores a transaction id and no payload. The drain rebuilds the
write from `fraud_transactions`, so there is one source of truth for what a
transaction is and a replayed entry can never write stale values. Every
clause of the projection is a `MERGE`, so applying it twice is the same as
applying it once.

The two stores can lag. They cannot diverge.

Scoring runs in stages, each replaceable on its own:

| Stage | Input | Output |
|---|---|---|
| Feature engine | transaction + history | named feature values |
| Rules engine | feature values + configured rules | triggered rules |
| Risk score engine | triggered rules | a score |
| Risk classification | score + configured levels | a level |
| Policy engine | level, score, severity | a decision |
| Alert engine | decision + context | an alert |

Rules, risk levels and policies live in `FraudDb`, not in code, so a threshold
changes without a deploy. Feature calculators are code, registered through a
DI token: adding one is a new class, not an edit to a switch statement.

## Why two databases

`TransactionsDb` belongs to the payment platform. Scamurai reads it and never
writes to it — enforced by the grants in `infra/database/`, not only by
convention. Everything Scamurai derives lands in `FraudDb`.

Both connections run with TypeORM's `synchronize` disabled. An ORM that
reshapes a database holding payment records is a data-loss incident waiting
for a schema drift. The numbered scripts under
`apps/fraud-engine/database/` are therefore the only source of truth, applied
by the migration runner and verified from empty datastores on every CI run.

## The identifier graph

Relational queries answer "how many cards has this device used this hour".
They do not answer "are these nine accounts the same person", because that
question is about connectivity rather than aggregation.

Nodes are identifiers — `Email`, `Phone`, `IP`, `PaymentAccount`,
`DeviceFingerprint`, `Merchant` — plus one `Transaction` node per transaction,
joined by `USED_*` relationships. A ring sharing a device and an IP behind
eight unrelated names is one connected component in the graph and eight
unremarkable rows in SQL.

Each label has a uniqueness constraint. Without one, `MERGE` is not atomic
across sessions: two workers merging the same email concurrently each create a
node, the component silently splits, and the ring stops being visible as one
thing.

## Frontend layering

Each feature module under `apps/frontend/src/modules/` is split four ways:

```
domain/          entities and value objects, no framework imports
application/     use cases, depending on repository interfaces
infrastructure/  HTTP implementations of those interfaces
presentation/    components and composables
```

Dependencies point inward. The `domain` layer does not know Vue exists, which
is what lets a use case be tested without mounting a component or stubbing
`fetch`.

## Known gaps

Tracked rather than hidden:

- **No authentication anywhere in the stack.** Every endpoint is anonymous,
  and actor identity on an alert action is self-reported from the request
  body — so the alert audit trail records whatever the caller claimed. The
  largest outstanding gap by some distance.
- **No graceful degradation.** A datastore being unavailable stops ingestion
  rather than continuing on what still works. The graph outbox makes this
  safe to change -- a deferred graph write is now recorded rather than lost
  -- but the policy has not been changed yet.
- **Manual sync has no distributed lock.** `POST /ingestion/sync` can run
  concurrently with the scheduled poll, or with itself.
- **The risk score is an additive model.** Rule impacts are not independent,
  so two rules firing on the same behaviour count twice; the total is an
  ordering signal rather than a probability. The configured risk bands are
  ranges on this scale, so recalibrating the two together is the only safe
  way to change it.
- **Nothing collects or ships the signals.** The engine exposes Prometheus
  metrics and both services write correlated JSON logs, but the compose stack
  has no Prometheus, Grafana or log aggregator, so the data is only as useful
  as whatever happens to be scraping it.
- **No distributed tracing.** A correlation id joins log lines across
  services, which answers "what happened to this request". It does not give
  spans or timings per hop, so "which call was slow" still means comparing
  timestamps by hand.
