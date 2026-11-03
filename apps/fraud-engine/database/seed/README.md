# Synthetic data

`seed.ts` writes payment traffic into the source database with known fraud
patterns planted in it.

```bash
npm run db:seed                            # 100k transactions over 30 days
npm run db:seed -- --count 5000 --days 7   # a smaller, faster window
npm run db:seed -- --truncate              # replace what is there
npm run db:seed -- --manifest rings.json   # also write the label file
```

## Why the labels matter

Each planted ring states the features it is built to trip. The manifest the
generator writes is a label set: ring id, every transaction id in it, and the
features expected to fire.

Without labels, "the engine raised an alert" is the only observable fact. With
them, a rule's precision and recall are computable, a threshold change can be
compared against the previous one instead of argued about, and a regression in
a feature calculator shows up as a number rather than as silence.

## The rings

| Ring | Shape | Expected features |
|---|---|---|
| `device-cycling-cards` | One device, 12 cards, under an hour | `deviceDistinctCardsLast1Hour` |
| `card-testing-burst` | 40 declines in 9 minutes, then a $1 success | `failedTxnCountPerCardLast15Minutes`, `failedTxnCountPerDeviceLast15Minutes` |
| `account-takeover` | 30 days of small purchases, then 40x from a new device | `accountCurrentAmountToAverage30dRatio`, `accountTodayTotalToAverageDaily30dRatio` |
| `shared-identifier-ring` | 8 unrelated customers behind one IP and device | `ipDistinctCardsLast15Minutes` |
| `order-replay` | One order tracking id charged five times | `orderTrackingIdSuccessExists` |
| `merchant-ref-fanout` | One merchant ref, 9 payment accounts in a day | `merchantRefDistinctPaymentAccounts24h` |
| `merchant-card-sweep` | 11 cards at one merchant in 15 minutes | `merchantDistinctCardsLast15Minutes`, `merchantTodayTotalToAverageDaily7dRatio` |
| `failed-contact-velocity` | Declines against one email and phone, rotating cards | `failedTxnCountPerEmailLast15Minutes`, `failedTxnCountPerPhoneLast15Minutes` |

Between them the rings exercise all twelve feature calculators in the engine.

## Two deliberate choices

**Recurring customers, not unique ones.** Background traffic is drawn from a
pool of roughly `count / 12` people. Every baseline and ratio feature compares
a transaction against that account's own history; with a unique customer per
transaction each ratio divides by a single observation and the dataset teaches
nothing.

**Colliding `CreatedAt` values.** One batch of rows shares an identical
`CreatedAt`. Upstream systems insert in batches and `DATETIME2` ties are
ordinary at volume, so any watermark that stores only a timestamp will skip
rows in that batch. The condition belongs in the sample data, not only in a
test that a reader has to go and find.

## Reproducibility

The generator is seeded (`--seed`, default `20261103`) and uses no unseeded
randomness, including for UUIDs. The same arguments produce byte-identical
output, so a test can assert on exact transaction ids.
