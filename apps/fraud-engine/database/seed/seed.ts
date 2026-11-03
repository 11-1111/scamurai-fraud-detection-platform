/*
 * Synthetic transaction generator.
 *
 * Writes realistic payment traffic into the source database, with known fraud
 * patterns planted in it at known times. Everything the platform can do is
 * invisible without this: the dashboard has nothing to show, a load test has
 * nothing to load, and a rule's precision is unmeasurable because no
 * transaction is labelled.
 *
 *   npm run db:seed                                  100k transactions, 30 days
 *   npm run db:seed -- --count 5000 --days 7         smaller window
 *   npm run db:seed -- --truncate                    replace existing rows
 *   npm run db:seed -- --manifest rings.json         write the label file
 *
 * Deterministic by construction. The same --seed produces byte-identical
 * output, so a regression test can assert on exact transaction ids and a
 * reviewer comparing two runs is comparing like with like.
 *
 * Every planted ring is designed to trip specific feature calculators, named
 * in RINGS below. The manifest it writes is the label set: ring id, the
 * transaction ids in it, and the rules each one is expected to fire. That
 * label set is what turns "the engine raised an alert" into "the engine
 * raised the right alert", and what a precision/recall report is computed
 * from.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as sql from 'mssql';

/* ----------------------------------------------------------------
   Configuration
   ---------------------------------------------------------------- */

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

loadEnvFile(join(__dirname, '..', '..', '.env'));

function flag(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  }

  const parsed = Number(process.argv[index + 1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive number.`);
  }
  return parsed;
}

function stringFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const options = {
  count: Math.floor(flag('count', 100_000)),
  days: Math.floor(flag('days', 30)),
  seed: Math.floor(flag('seed', 20_261_103)),
  batchSize: Math.floor(flag('batch', 1_000)),
  truncate: process.argv.includes('--truncate'),
  manifestPath: stringFlag('manifest'),
};

/* ----------------------------------------------------------------
   Deterministic randomness
   ---------------------------------------------------------------- */

/* mulberry32: small, fast, and good enough for sample data. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = createRandom(options.seed);

function randomInt(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

const HEX = '0123456789abcdef';

function hex(length: number): string {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += HEX[Math.floor(random() * 16)];
  }
  return out;
}

/*
 * A version-4 UUID drawn from the seeded generator rather than
 * crypto.randomUUID, so a run is reproducible.
 */
function uuid(): string {
  const variant = HEX[8 + Math.floor(random() * 4)];
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

/* ----------------------------------------------------------------
   Catalogs
   ---------------------------------------------------------------- */

const MERCHANTS = [
  { name: 'Nairobi Fresh Grocers', email: 'billing@nairobifresh.co.ke' },
  { name: 'Savanna Electronics', email: 'payments@savannaelectronics.com' },
  { name: 'Riverside Pharmacy', email: 'accounts@riversidepharma.co.ke' },
  { name: 'Coastline Travel', email: 'finance@coastlinetravel.com' },
  { name: 'Highland Coffee Roasters', email: 'orders@highlandroasters.co.ke' },
  { name: 'Uhuru Fuel Stations', email: 'billing@uhurufuel.co.ke' },
  { name: 'Zawadi Gift Cards', email: 'support@zawadigifts.com' },
  { name: 'Mara Safari Lodges', email: 'reservations@marasafari.com' },
  { name: 'Tandem Fitness', email: 'billing@tandemfitness.co.ke' },
  { name: 'Pixel Game Store', email: 'billing@pixelgamestore.com' },
] as const;

const FIRST_NAMES = [
  'Amina', 'Brian', 'Chepkoech', 'David', 'Esther', 'Faith', 'George',
  'Halima', 'Irene', 'James', 'Kevin', 'Lydia', 'Mercy', 'Nicholas',
  'Otieno', 'Patience', 'Quentin', 'Rose', 'Samuel', 'Teresa', 'Victor',
  'Wanjiku', 'Yusuf', 'Zipporah',
] as const;

const LAST_NAMES = [
  'Achieng', 'Barasa', 'Cheruiyot', 'Dube', 'Ekiru', 'Githinji', 'Hassan',
  'Imani', 'Juma', 'Kamau', 'Lusweti', 'Mutiso', 'Njoroge', 'Omondi',
  'Pwani', 'Rotich', 'Simiyu', 'Tanui', 'Were', 'Yegon',
] as const;

const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'proton.me', 'example.co.ke',
] as const;

const PAYMENT_METHODS = ['VISA', 'MASTERCARD', 'MPESA', 'AIRTEL_MONEY'] as const;
const CURRENCIES = ['KES', 'KES', 'KES', 'USD'] as const;

const STATUS = {
  completed: { text: 'Completed', type: 'success' },
  declined: { text: 'Declined', type: 'failed' },
  pending: { text: 'Pending', type: 'info' },
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

/* ----------------------------------------------------------------
   Identity helpers
   ---------------------------------------------------------------- */

type Person = {
  name: string;
  email: string;
  phone: string;
  card: string;
  device: string;
  ip: string;
};

function maskedCard(): string {
  return `4${hex(3).replace(/[a-f]/g, '7')}********${randomInt(1000, 9999)}`;
}

function phoneNumber(): string {
  return `+2547${randomInt(10_000_000, 99_999_999)}`;
}

function ipAddress(): string {
  return `${randomInt(41, 197)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function deviceFingerprint(): string {
  return `fp_${hex(24)}`;
}

function createPerson(): Person {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);

  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${randomInt(1, 999)}@${pick(EMAIL_DOMAINS)}`,
    phone: phoneNumber(),
    card: maskedCard(),
    device: deviceFingerprint(),
    ip: ipAddress(),
  };
}

/* ----------------------------------------------------------------
   Rows
   ---------------------------------------------------------------- */

type Row = {
  id: string;
  transactionDate: Date;
  amountValue: number;
  currencyCode: string;
  paymentMethod: string;
  merchantName: string;
  merchantEmail: string;
  customerName: string;
  customerEmail: string;
  ipAddress: string;
  phone: string;
  paymentAccount: string;
  confirmationCode: string;
  merchantRef: string;
  orderTrackingId: string;
  bankAuthCode: string | null;
  deviceFingerprint: string;
  statusText: string;
  statusType: string;
  createdAt: Date;
};

type RowOverrides = Partial<Row> & { at: Date };

function buildRow(person: Person, overrides: RowOverrides): Row {
  const merchant = pick(MERCHANTS);
  const status: Status = overrides.statusText
    ? { text: overrides.statusText, type: overrides.statusType ?? 'info' }
    : random() < 0.08
      ? STATUS.declined
      : STATUS.completed;

  const row: Row = {
    id: uuid(),
    transactionDate: overrides.at,
    amountValue: Number((50 + random() * 9_950).toFixed(2)),
    currencyCode: pick(CURRENCIES),
    paymentMethod: pick(PAYMENT_METHODS),
    merchantName: merchant.name,
    merchantEmail: merchant.email,
    customerName: person.name,
    customerEmail: person.email,
    ipAddress: person.ip,
    phone: person.phone,
    paymentAccount: person.card,
    confirmationCode: hex(10).toUpperCase(),
    merchantRef: `REF-${hex(8).toUpperCase()}`,
    orderTrackingId: uuid(),
    bankAuthCode: status.type === 'success' ? hex(6).toUpperCase() : null,
    deviceFingerprint: person.device,
    statusText: status.text,
    statusType: status.type,
    /*
     * CreatedAt is the ingestion watermark. It lands slightly after the
     * transaction itself, as it would when an upstream system writes its own
     * audit timestamp.
     */
    createdAt: new Date(overrides.at.getTime() + randomInt(200, 4_000)),
  };

  return { ...row, ...overrides };
}

/* ----------------------------------------------------------------
   Planted rings
   ---------------------------------------------------------------- */

type ManifestEntry = {
  ring: string;
  description: string;
  expectedFeatures: string[];
  transactionIds: string[];
  window: { from: string; to: string };
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Ring = {
  id: string;
  description: string;
  expectedFeatures: string[];
  build: (anchor: Date) => Row[];
};

const RINGS: Ring[] = [
  {
    id: 'device-cycling-cards',
    description:
      'One device runs twelve different cards in under an hour: a stolen-card ' +
      'cash-out, where the device is the only stable identifier.',
    expectedFeatures: ['deviceDistinctCardsLast1Hour'],
    build(anchor) {
      const operator = createPerson();
      const merchant = pick(MERCHANTS);

      return Array.from({ length: 12 }, (_, index) => {
        const victim = createPerson();
        return buildRow(
          { ...victim, device: operator.device, ip: operator.ip },
          {
            at: new Date(anchor.getTime() + index * 4 * MINUTE),
            merchantName: merchant.name,
            merchantEmail: merchant.email,
            amountValue: Number((2_000 + random() * 8_000).toFixed(2)),
            statusText: index % 4 === 3 ? 'Declined' : 'Completed',
            statusType: index % 4 === 3 ? 'failed' : 'success',
          },
        );
      });
    },
  },
  {
    id: 'card-testing-burst',
    description:
      'Forty declines against one card in nine minutes, then a small ' +
      'successful charge: the classic card-testing probe confirming the card ' +
      'is live before it is used in earnest.',
    expectedFeatures: [
      'failedTxnCountPerCardLast15Minutes',
      'failedTxnCountPerDeviceLast15Minutes',
    ],
    build(anchor) {
      const tester = createPerson();
      const merchant = pick(MERCHANTS);
      const rows: Row[] = [];

      for (let index = 0; index < 40; index += 1) {
        rows.push(
          buildRow(tester, {
            /* Forty attempts spread over nine minutes: ~13.5s apart. */
            at: new Date(anchor.getTime() + index * 13_500),
            merchantName: merchant.name,
            merchantEmail: merchant.email,
            amountValue: Number((1 + random() * 4).toFixed(2)),
            statusText: 'Declined',
            statusType: 'failed',
          }),
        );
      }

      rows.push(
        buildRow(tester, {
          at: new Date(anchor.getTime() + 10 * MINUTE),
          merchantName: merchant.name,
          merchantEmail: merchant.email,
          amountValue: 1.0,
          statusText: 'Completed',
          statusType: 'success',
        }),
      );

      return rows;
    },
  },
  {
    id: 'account-takeover',
    description:
      'An established account with thirty days of small, steady purchases, ' +
      'then one charge forty times its average from a device and IP it has ' +
      'never used, with the phone number changed.',
    expectedFeatures: [
      'accountCurrentAmountToAverage30dRatio',
      'accountTodayTotalToAverageDaily30dRatio',
    ],
    build(anchor) {
      const victim = createPerson();
      const rows: Row[] = [];

      /* Thirty days of ordinary history, ~1.5 transactions a day. */
      for (let day = 30; day >= 1; day -= 1) {
        const purchases = randomInt(1, 2);
        for (let index = 0; index < purchases; index += 1) {
          rows.push(
            buildRow(victim, {
              at: new Date(
                anchor.getTime() - day * DAY + randomInt(8, 20) * HOUR,
              ),
              amountValue: Number((300 + random() * 500).toFixed(2)),
              statusText: 'Completed',
              statusType: 'success',
            }),
          );
        }
      }

      /* The takeover itself: new device, new IP, new phone, large amount. */
      const attacker = createPerson();
      rows.push(
        buildRow(
          {
            ...victim,
            device: attacker.device,
            ip: attacker.ip,
            phone: attacker.phone,
          },
          {
            at: anchor,
            amountValue: 24_000,
            statusText: 'Completed',
            statusType: 'success',
          },
        ),
      );

      return rows;
    },
  },
  {
    id: 'shared-identifier-ring',
    description:
      'Eight apparently unrelated customers, each with their own name, email ' +
      'and card, all transacting from one IP and one device. Nothing about ' +
      'any single transaction looks wrong; the graph is the only thing that ' +
      'shows the ring.',
    expectedFeatures: ['ipDistinctCardsLast15Minutes'],
    build(anchor) {
      const shared = createPerson();

      return Array.from({ length: 8 }, (_, index) => {
        const member = createPerson();
        return buildRow(
          { ...member, ip: shared.ip, device: shared.device },
          {
            at: new Date(anchor.getTime() + index * 90_000),
            amountValue: Number((900 + random() * 2_500).toFixed(2)),
            statusText: 'Completed',
            statusType: 'success',
          },
        );
      });
    },
  },
  {
    id: 'order-replay',
    description:
      'One order tracking id charged successfully, then submitted four more ' +
      'times from the same device: a replay of a captured authorisation.',
    expectedFeatures: ['orderTrackingIdSuccessExists'],
    build(anchor) {
      const customer = createPerson();
      const merchant = pick(MERCHANTS);
      const orderTrackingId = uuid();
      const amount = Number((4_500 + random() * 2_000).toFixed(2));

      return Array.from({ length: 5 }, (_, index) =>
        buildRow(customer, {
          at: new Date(anchor.getTime() + index * 2 * MINUTE),
          merchantName: merchant.name,
          merchantEmail: merchant.email,
          orderTrackingId,
          amountValue: amount,
          statusText: index === 0 ? 'Completed' : 'Pending',
          statusType: index === 0 ? 'success' : 'info',
        }),
      );
    },
  },
  {
    id: 'merchant-ref-fanout',
    description:
      'A single merchant reference settled against nine different payment ' +
      'accounts inside a day, which is what a compromised or complicit ' +
      'merchant integration looks like from the outside.',
    expectedFeatures: ['merchantRefDistinctPaymentAccounts24h'],
    build(anchor) {
      const merchant = pick(MERCHANTS);
      const merchantRef = `REF-${hex(8).toUpperCase()}`;

      return Array.from({ length: 9 }, (_, index) => {
        const payer = createPerson();
        return buildRow(payer, {
          at: new Date(anchor.getTime() + index * 2 * HOUR),
          merchantName: merchant.name,
          merchantEmail: merchant.email,
          merchantRef,
          amountValue: Number((1_200 + random() * 3_000).toFixed(2)),
          statusText: 'Completed',
          statusType: 'success',
        });
      });
    },
  },
  {
    id: 'merchant-card-sweep',
    description:
      'Eleven distinct cards charged at one merchant within fifteen minutes, ' +
      'outside its normal pattern: a bust-out run against a single terminal.',
    expectedFeatures: [
      'merchantDistinctCardsLast15Minutes',
      'merchantTodayTotalToAverageDaily7dRatio',
    ],
    build(anchor) {
      const merchant = pick(MERCHANTS);

      return Array.from({ length: 11 }, (_, index) => {
        const payer = createPerson();
        return buildRow(payer, {
          at: new Date(anchor.getTime() + index * 70_000),
          merchantName: merchant.name,
          merchantEmail: merchant.email,
          amountValue: Number((6_000 + random() * 6_000).toFixed(2)),
          statusText: 'Completed',
          statusType: 'success',
        });
      });
    },
  },
  {
    id: 'failed-contact-velocity',
    description:
      'Repeated declines against one email and one phone number from rotating ' +
      'cards: credential stuffing against a checkout that identifies the ' +
      'customer by contact details.',
    expectedFeatures: [
      'failedTxnCountPerEmailLast15Minutes',
      'failedTxnCountPerPhoneLast15Minutes',
    ],
    build(anchor) {
      const target = createPerson();

      return Array.from({ length: 14 }, (_, index) =>
        buildRow(
          { ...target, card: maskedCard(), device: deviceFingerprint() },
          {
            at: new Date(anchor.getTime() + index * 50_000),
            amountValue: Number((80 + random() * 400).toFixed(2)),
            statusText: 'Declined',
            statusType: 'failed',
          },
        ),
      );
    },
  },
];

/* ----------------------------------------------------------------
   Generation
   ---------------------------------------------------------------- */

function generate(): { rows: Row[]; manifest: ManifestEntry[] } {
  const now = Date.now();
  const windowStart = now - options.days * DAY;
  const rows: Row[] = [];
  const manifest: ManifestEntry[] = [];

  /*
   * Background traffic. A pool of recurring customers rather than a unique
   * person per transaction, so baselines and velocity features have real
   * history to compare against -- with all-unique customers every ratio
   * feature divides by a single observation and the data teaches nothing.
   */
  const population = Math.max(50, Math.floor(options.count / 12));
  const people = Array.from({ length: population }, () => createPerson());

  for (let index = 0; index < options.count; index += 1) {
    const person = people[Math.floor(random() * people.length)];

    /*
     * Diurnal shape: more traffic in waking hours. Without it, every
     * "unusual hour" signal is meaningless because every hour is equal.
     */
    const dayOffset = Math.floor(random() * options.days);
    const hourOfDay =
      random() < 0.75 ? randomInt(8, 21) : randomInt(0, 23);
    const at = new Date(
      windowStart +
        dayOffset * DAY +
        hourOfDay * HOUR +
        randomInt(0, 59) * MINUTE +
        randomInt(0, 59) * 1_000,
    );

    rows.push(buildRow(person, { at }));
  }

  /* Plant each ring at a distinct, recent, reproducible moment. */
  RINGS.forEach((ring, index) => {
    const anchor = new Date(now - (index + 1) * 8 * HOUR);
    const ringRows = ring.build(anchor);
    rows.push(...ringRows);

    const times = ringRows.map((row) => row.transactionDate.getTime());
    manifest.push({
      ring: ring.id,
      description: ring.description,
      expectedFeatures: ring.expectedFeatures,
      transactionIds: ringRows.map((row) => row.id),
      window: {
        from: new Date(Math.min(...times)).toISOString(),
        to: new Date(Math.max(...times)).toISOString(),
      },
    });
  });

  /* Ingestion reads this table in CreatedAt order, so write it that way. */
  rows.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  /*
   * Give one batch of rows an identical CreatedAt. Upstream systems insert in
   * batches and DATETIME2 ties are ordinary at volume, so a watermark that
   * stores only a timestamp will skip rows here. The condition belongs in the
   * sample data rather than only in a test.
   */
  const collisionStart = Math.floor(rows.length * 0.4);
  const collisionAt = rows[collisionStart]?.createdAt;
  if (collisionAt) {
    for (let index = collisionStart; index < collisionStart + 25; index += 1) {
      if (rows[index]) {
        rows[index].createdAt = collisionAt;
      }
    }
  }

  return { rows, manifest };
}

/* ----------------------------------------------------------------
   Writing
   ---------------------------------------------------------------- */

function buildTable(): sql.Table {
  const table = new sql.Table('dbo.Transactions');
  table.create = false;

  table.columns.add('Id', sql.UniqueIdentifier, { nullable: false });
  table.columns.add('TransactionDate', sql.DateTime2, { nullable: false });
  table.columns.add('AmountValue', sql.Decimal(18, 2), { nullable: false });
  table.columns.add('CurrencyCode', sql.NVarChar(255), { nullable: false });
  table.columns.add('PaymentMethod', sql.NVarChar(255), { nullable: true });
  table.columns.add('MerchantName', sql.NVarChar(255), { nullable: false });
  table.columns.add('MerchantEmail', sql.NVarChar(255), { nullable: true });
  table.columns.add('CustomerName', sql.NVarChar(255), { nullable: true });
  table.columns.add('CustomerEmail', sql.NVarChar(255), { nullable: true });
  table.columns.add('IpAddress', sql.NVarChar(255), { nullable: true });
  table.columns.add('Phone', sql.NVarChar(255), { nullable: true });
  table.columns.add('PaymentAccount', sql.NVarChar(255), { nullable: true });
  table.columns.add('ConfirmationCode', sql.NVarChar(255), { nullable: true });
  table.columns.add('MerchantRef', sql.NVarChar(255), { nullable: true });
  table.columns.add('OrderTrackingId', sql.NVarChar(255), { nullable: true });
  table.columns.add('BankAuthCode', sql.NVarChar(255), { nullable: true });
  table.columns.add('DeviceFingerprint', sql.NVarChar(255), { nullable: true });
  table.columns.add('StatusText', sql.NVarChar(255), { nullable: false });
  table.columns.add('StatusType', sql.NVarChar(255), { nullable: false });
  table.columns.add('CreatedAt', sql.DateTime2, { nullable: false });

  return table;
}

function addRow(table: sql.Table, row: Row): void {
  table.rows.add(
    row.id,
    row.transactionDate,
    row.amountValue,
    row.currencyCode,
    row.paymentMethod,
    row.merchantName,
    row.merchantEmail,
    row.customerName,
    row.customerEmail,
    row.ipAddress,
    row.phone,
    row.paymentAccount,
    row.confirmationCode,
    row.merchantRef,
    row.orderTrackingId,
    row.bankAuthCode,
    row.deviceFingerprint,
    row.statusText,
    row.statusType,
    row.createdAt,
  );
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

async function main(): Promise<void> {
  console.log(
    `Generating ${options.count.toLocaleString()} background transactions ` +
      `over ${options.days} days, plus ${RINGS.length} planted rings ` +
      `(seed ${options.seed}).`,
  );

  const { rows, manifest } = generate();
  console.log(`${rows.length.toLocaleString()} rows to insert.`);

  const port = process.env.SOURCE_DB_PORT?.trim();
  const instance = process.env.SOURCE_DB_INSTANCE?.trim();

  const pool = await new sql.ConnectionPool({
    server: required('SOURCE_DB_HOST'),
    port: port ? Number(port) : undefined,
    database: required('SOURCE_DB_NAME'),
    user: required('SOURCE_DB_USERNAME'),
    password: required('SOURCE_DB_PASSWORD'),
    connectionTimeout: 30_000,
    requestTimeout: 600_000,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      useUTC: true,
      enableArithAbort: true,
      ...(instance && !port ? { instanceName: instance } : {}),
    },
  }).connect();

  try {
    if (options.truncate) {
      /*
       * DELETE rather than TRUNCATE: the fraud database holds foreign keys
       * onto these ids, and a truncate would be refused or would leave
       * dangling references behind.
       */
      console.log('Clearing existing transactions.');
      await pool.request().query('DELETE FROM dbo.Transactions');
    }

    const started = Date.now();

    for (let offset = 0; offset < rows.length; offset += options.batchSize) {
      const table = buildTable();
      for (const row of rows.slice(offset, offset + options.batchSize)) {
        addRow(table, row);
      }

      await pool.request().bulk(table);

      const done = Math.min(offset + options.batchSize, rows.length);
      if (done % (options.batchSize * 20) === 0 || done === rows.length) {
        console.log(`  ${done.toLocaleString()} / ${rows.length.toLocaleString()}`);
      }
    }

    const seconds = ((Date.now() - started) / 1_000).toFixed(1);
    console.log(`\nInserted ${rows.length.toLocaleString()} rows in ${seconds}s.`);
  } finally {
    await pool.close();
  }

  console.log('\nPlanted rings:');
  for (const entry of manifest) {
    console.log(
      `  ${entry.ring.padEnd(26)} ${String(entry.transactionIds.length).padStart(3)} txns  ` +
        `expects: ${entry.expectedFeatures.join(', ')}`,
    );
  }

  if (options.manifestPath) {
    writeFileSync(
      options.manifestPath,
      `${JSON.stringify({ seed: options.seed, generatedAt: new Date().toISOString(), rings: manifest }, null, 2)}\n`,
      'utf8',
    );
    console.log(`\nLabel manifest written to ${options.manifestPath}`);
  } else {
    console.log(
      '\nRe-run with --manifest <path> to write the label file used for ' +
        'precision and recall measurement.',
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    `\nSeed failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
