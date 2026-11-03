// 001_constraints.cypher
// Idempotent. Safe to re-run: every statement uses IF NOT EXISTS.
//
// The ingestion path MERGEs one Transaction node per transaction and one node
// per identifier it carries. Until now the graph had no constraints and no
// indexes at all, which cost two things:
//
//   1. Correctness. MERGE without a uniqueness constraint is not atomic
//      across concurrent sessions. Two workers merging the same email at the
//      same time can each create a node, after which the identifier network
//      is silently split in two and a shared-identifier ring stops being
//      visible as one component.
//
//   2. Speed. Every MERGE on a value property was a full label scan. A
//      uniqueness constraint is backed by an index, so these become seeks.
//
// Labels and property names here mirror the MERGE in
// src/ingestion/ingestion.service.ts and the label whitelist in
// src/fraud/engines/graph.engine.ts. Keep all three in step.

// ---------------------------------------------------------------
// Node keys
// ---------------------------------------------------------------

CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT email_value_unique IF NOT EXISTS
FOR (e:Email) REQUIRE e.value IS UNIQUE;

CREATE CONSTRAINT phone_value_unique IF NOT EXISTS
FOR (p:Phone) REQUIRE p.value IS UNIQUE;

CREATE CONSTRAINT ip_value_unique IF NOT EXISTS
FOR (i:IP) REQUIRE i.value IS UNIQUE;

CREATE CONSTRAINT payment_account_value_unique IF NOT EXISTS
FOR (pa:PaymentAccount) REQUIRE pa.value IS UNIQUE;

CREATE CONSTRAINT device_fingerprint_value_unique IF NOT EXISTS
FOR (fp:DeviceFingerprint) REQUIRE fp.value IS UNIQUE;

CREATE CONSTRAINT merchant_value_unique IF NOT EXISTS
FOR (m:Merchant) REQUIRE m.value IS UNIQUE;

// ---------------------------------------------------------------
// Existence of the key property
//
// A node merged without its key property would be unreachable from every
// traversal, which is worse than a write failure. Enforce the property is
// there. Requires Neo4j Enterprise; the migration runner reports these as
// skipped on Community rather than failing the run.
// ---------------------------------------------------------------

CREATE CONSTRAINT transaction_id_exists IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.id IS NOT NULL;

CREATE CONSTRAINT email_value_exists IF NOT EXISTS
FOR (e:Email) REQUIRE e.value IS NOT NULL;

CREATE CONSTRAINT phone_value_exists IF NOT EXISTS
FOR (p:Phone) REQUIRE p.value IS NOT NULL;

CREATE CONSTRAINT ip_value_exists IF NOT EXISTS
FOR (i:IP) REQUIRE i.value IS NOT NULL;

CREATE CONSTRAINT payment_account_value_exists IF NOT EXISTS
FOR (pa:PaymentAccount) REQUIRE pa.value IS NOT NULL;

CREATE CONSTRAINT device_fingerprint_value_exists IF NOT EXISTS
FOR (fp:DeviceFingerprint) REQUIRE fp.value IS NOT NULL;

CREATE CONSTRAINT merchant_value_exists IF NOT EXISTS
FOR (m:Merchant) REQUIRE m.value IS NOT NULL;

// ---------------------------------------------------------------
// Supporting indexes
//
// The uniqueness constraints above already index each key property, so these
// cover only the properties a query filters or orders on afterwards.
// ---------------------------------------------------------------

// Time-boxing a network query to a recent window, which is how an analyst
// reads a ring: who touched this identifier in the last N days.
CREATE INDEX transaction_date_index IF NOT EXISTS
FOR (t:Transaction) ON (t.date);

// Replay and authorisation lookups starting from a transaction attribute
// rather than from an identifier node.
CREATE INDEX transaction_order_tracking_id_index IF NOT EXISTS
FOR (t:Transaction) ON (t.orderTrackingId);

CREATE INDEX transaction_status_index IF NOT EXISTS
FOR (t:Transaction) ON (t.status);

// Merchant nodes are keyed on email but displayed and searched by name.
CREATE INDEX merchant_name_index IF NOT EXISTS
FOR (m:Merchant) ON (m.name);
