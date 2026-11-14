/*
 * Asks Neo4j how it would run the identifier-network queries, and fails if
 * the answer is a scan.
 *
 * The traversal in GraphEngine is bounded by a node budget and a degree cap,
 * both of which unit tests can verify against a fake driver. One thing they
 * cannot verify is whether the Cypher is planned the way it was written:
 * `elementId(source) IN $frontier` is only cheap if Neo4j resolves it with
 * NodeByElementIdSeek, and `(root:Email {value: $value})` is only cheap if
 * the uniqueness constraint exists to seek. Get either wrong and the queries
 * still return correct results, just by reading every node in the database --
 * which is exactly the failure this traversal was rewritten to remove, back
 * again in a form no test would notice.
 *
 * EXPLAIN plans the query without running it, so this needs a schema but no
 * data. It runs in CI after the migrations.
 *
 *   npm run db:explain-graph
 */

import neo4j from 'neo4j-driver';

import { loadEnvFile, requiredEnv } from '../load-env';
import {
  GRAPH_LABEL_BY_IDENTIFIER_TYPE,
  buildClosureQuery,
  buildExpandQuery,
  buildRootQuery,
} from '../../src/fraud/engines/graph-queries';

loadEnvFile();

/*
 * Reading every node in the database, whatever the query was asking for.
 * Never acceptable here.
 */
const FORBIDDEN_OPERATORS = ['AllNodesScan'];

/*
 * Reading every node carrying a label. Acceptable on a small label, ruinous
 * on Transaction, and for these queries it means an index that should exist
 * does not.
 */
const FORBIDDEN_FOR_ROOT = ['NodeByLabelScan'];

type PlanNode = {
  operatorType?: string;
  children?: PlanNode[];
};

function collectOperators(plan: PlanNode | undefined): string[] {
  if (!plan) {
    return [];
  }

  const operators = plan.operatorType ? [plan.operatorType] : [];
  for (const child of plan.children ?? []) {
    operators.push(...collectOperators(child));
  }
  return operators;
}

type Check = {
  name: string;
  query: string;
  params: Record<string, unknown>;
  forbidden: string[];
  /** At least one of these must appear, when given. */
  expectOneOf?: string[];
};

function buildChecks(): Check[] {
  const labels = Array.from(
    new Set(
      Object.values(GRAPH_LABEL_BY_IDENTIFIER_TYPE).filter(
        (label): label is string => Boolean(label),
      ),
    ),
  ).sort();

  const rootChecks: Check[] = labels.map((label) => ({
    name: `root lookup on :${label}`,
    query: buildRootQuery(label),
    params: { value: 'explain-only@example.com' },
    forbidden: [...FORBIDDEN_OPERATORS, ...FORBIDDEN_FOR_ROOT],
    // Either name is a seek against the constraint's backing index.
    expectOneOf: ['NodeUniqueIndexSeek', 'NodeIndexSeek'],
  }));

  return [
    ...rootChecks,
    {
      name: 'frontier expansion',
      query: buildExpandQuery(),
      params: {
        frontier: ['4:00000000-0000-0000-0000-000000000000:0'],
        // LIMIT rejects a float, and plain JavaScript numbers arrive as one.
        rowLimit: neo4j.int(100),
      },
      forbidden: FORBIDDEN_OPERATORS,
      expectOneOf: ['NodeByElementIdSeek'],
    },
    {
      name: 'subgraph closure',
      query: buildClosureQuery(),
      params: {
        nodeIds: ['4:00000000-0000-0000-0000-000000000000:0'],
        rowLimit: neo4j.int(1_000),
      },
      forbidden: FORBIDDEN_OPERATORS,
      expectOneOf: ['NodeByElementIdSeek'],
    },
  ];
}

async function main(): Promise<void> {
  const driver = neo4j.driver(
    requiredEnv('NEO4J_URI'),
    neo4j.auth.basic(requiredEnv('NEO4J_USER'), requiredEnv('NEO4J_PASSWORD')),
  );

  const failures: string[] = [];

  try {
    const session = driver.session();

    try {
      for (const check of buildChecks()) {
        const result = await session.run(
          `EXPLAIN ${check.query}`,
          check.params,
        );

        const operators = collectOperators(
          result.summary.plan as PlanNode | undefined,
        );

        if (operators.length === 0) {
          failures.push(`${check.name}: Neo4j returned no plan to inspect`);
          continue;
        }

        const offending = operators.filter((operator) =>
          check.forbidden.includes(operator),
        );

        const satisfied =
          !check.expectOneOf ||
          check.expectOneOf.some((operator) => operators.includes(operator));

        if (offending.length > 0) {
          failures.push(
            `${check.name}: planned as ${offending.join(', ')} — ` +
              `expected one of ${check.expectOneOf?.join(', ') ?? 'a seek'}`,
          );
          continue;
        }

        if (!satisfied) {
          failures.push(
            `${check.name}: none of ${check.expectOneOf?.join(', ') ?? ''} ` +
              `in plan (${Array.from(new Set(operators)).join(', ')})`,
          );
          continue;
        }

        console.log(`  ok   ${check.name}`);
      }
    } finally {
      await session.close();
    }
  } finally {
    await driver.close();
  }

  if (failures.length > 0) {
    throw new Error(
      `Graph traversal queries are not planned as seeks:\n  - ${failures.join(
        '\n  - ',
      )}`,
    );
  }

  console.log('\nEvery traversal query plans as an index or element-id seek.');
}

main().catch((error: unknown) => {
  console.error(
    `\n${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
