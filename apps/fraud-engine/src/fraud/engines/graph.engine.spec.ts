import neo4j, { Node, Record as Neo4jRecord, Relationship } from 'neo4j-driver';

import { GraphEngine } from './graph.engine';

/*
 * Bounded graph traversal.
 *
 * The previous query was `MATCH path = (root)-[*1..n]-(x) RETURN path LIMIT
 * 100`: every relationship type, and a limit counted in paths. These tests
 * pin the three properties that replaced it -- relationship types are named,
 * work is capped by an explicit node budget, and expansion refuses to pass
 * through hub nodes -- plus the two runtime details that make it work at all:
 * LIMIT must receive a driver integer rather than a float, and degrees come
 * back as driver integers rather than JavaScript numbers.
 */

function fakeNode(elementId: string, label: string, value: string): Node {
  return {
    elementId,
    labels: [label],
    properties: { value },
  } as unknown as Node;
}

function fakeRelationship(
  elementId: string,
  startNodeElementId: string,
  endNodeElementId: string,
  type = 'USED_IP',
): Relationship {
  return {
    elementId,
    startNodeElementId,
    endNodeElementId,
    type,
  } as unknown as Relationship;
}

function fakeRecord(fields: Record<string, unknown>): Neo4jRecord {
  return {
    get: (key: string) => fields[key],
  } as unknown as Neo4jRecord;
}

type QueryCall = {
  query: string;
  params: Record<string, unknown>;
  config?: { timeout?: number };
};

type Handlers = {
  /** null means the root identifier does not exist in the graph. */
  root?: { node: Node; degree: number } | null;
  /** Called once per hop, with the row limit the engine asked for. */
  hop?: (hopIndex: number, rowLimit: number) => Neo4jRecord[];
  closure?: Neo4jRecord[];
};

function createNeo4jService(handlers: Handlers) {
  const calls: QueryCall[] = [];
  let hopIndex = 0;

  const run = jest.fn(
    (
      query: string,
      params: Record<string, unknown> = {},
      config?: { timeout?: number },
    ) => {
      calls.push({ query, params, config });

      // Routed on markers unique to each of the three queries the engine
      // issues, so a change in query text surfaces here rather than silently
      // matching the wrong branch.
      if (query.includes('MATCH (root:')) {
        const root = handlers.root;
        if (!root) {
          return Promise.resolve([]);
        }
        return Promise.resolve([
          fakeRecord({
            root: root.node,
            id: root.node.elementId,
            degree: neo4j.int(root.degree),
          }),
        ]);
      }

      if (query.includes('IN $frontier')) {
        const limit = params.rowLimit;
        const rowLimit = neo4j.isInt(limit) ? limit.toNumber() : Number(limit);
        const rows = handlers.hop ? handlers.hop(hopIndex, rowLimit) : [];
        hopIndex += 1;
        return Promise.resolve(rows);
      }

      if (query.includes('IN $nodeIds')) {
        return Promise.resolve(handlers.closure ?? []);
      }

      throw new Error(`Unexpected query:\n${query}`);
    },
  );

  return {
    service: { run } as never,
    run,
    calls,
    hopCalls: () => calls.filter((call) => call.query.includes('IN $frontier')),
  };
}

const ROOT = fakeNode('root-1', 'IP', '41.90.64.12');

describe('GraphEngine.getNetwork', () => {
  it('returns nothing for an identifier type that is not in the graph', async () => {
    const neo4jStub = createNeo4jService({});
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('confirmation_code', 'ABC123');

    expect(graph).toEqual({ nodes: [], edges: [] });
    // No label to resolve means no reason to touch the database.
    expect(neo4jStub.run).not.toHaveBeenCalled();
  });

  it('returns nothing when the identifier has no node', async () => {
    const neo4jStub = createNeo4jService({ root: null });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12');

    expect(graph).toEqual({ nodes: [], edges: [] });
    expect(neo4jStub.hopCalls()).toHaveLength(0);
  });

  it('names the relationship types it traverses', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 4 },
      hop: () => [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    await engine.getNetwork('ip', '41.90.64.12');

    const hopQuery = neo4jStub.hopCalls()[0].query;

    expect(hopQuery).toContain('USED_EMAIL|USED_PHONE|USED_IP');
    expect(hopQuery).toContain('USED_PAYMENT_ACCOUNT|USED_DEVICE');
    expect(hopQuery).toContain('BELONGS_TO_MERCHANT');

    // No unfiltered variable-length expansion anywhere.
    for (const call of neo4jStub.calls) {
      expect(call.query).not.toMatch(/-\[\s*\*/);
      expect(call.query).not.toMatch(/\[\w*\s*\*\s*1\.\./);
    }
  });

  it('gives every query a server-side timeout', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: () => [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    await engine.getNetwork('ip', '41.90.64.12');

    expect(neo4jStub.calls.length).toBeGreaterThan(0);
    for (const call of neo4jStub.calls) {
      expect(call.config?.timeout).toBeGreaterThan(0);
    }
  });

  it('passes LIMIT as a driver integer, which Cypher requires', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: () => [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    await engine.getNetwork('ip', '41.90.64.12');

    // A plain JavaScript number reaches Cypher as a float, and LIMIT rejects
    // floats at runtime -- a failure no type checker catches.
    const rowLimit = neo4jStub.hopCalls()[0].params.rowLimit;
    expect(neo4j.isInt(rowLimit)).toBe(true);
  });

  it('collects neighbours and the edges reaching them', async () => {
    const card = fakeNode('card-1', 'PaymentAccount', '4111********1111');

    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: (hopIndex) =>
        hopIndex === 0
          ? [
              fakeRecord({
                relationship: fakeRelationship('rel-1', 'root-1', 'card-1'),
                neighbour: card,
                neighbourDegree: neo4j.int(3),
              }),
            ]
          : [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12');

    expect(graph.nodes).toEqual([
      { id: 'root-1', label: '41.90.64.12', type: 'IP' },
      { id: 'card-1', label: '4111********1111', type: 'PaymentAccount' },
    ]);
    expect(graph.edges).toEqual([
      {
        id: 'rel-1',
        source: 'root-1',
        target: 'card-1',
        label: 'USED_IP',
      },
    ]);
    expect(graph.truncated).toBe(false);
  });

  it('shows a hub but does not expand through it', async () => {
    // A shared NAT address or a processor's own merchant record: thousands of
    // unrelated people hang off it, so expanding turns the network into a
    // hairball in which everything looks connected.
    const hub = fakeNode('hub-1', 'Merchant', 'payments@processor.example');

    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: (hopIndex) =>
        hopIndex === 0
          ? [
              fakeRecord({
                relationship: fakeRelationship(
                  'rel-1',
                  'root-1',
                  'hub-1',
                  'BELONGS_TO_MERCHANT',
                ),
                neighbour: hub,
                neighbourDegree: neo4j.int(5_000),
              }),
            ]
          : [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12', 3);

    // The connection is visible to the analyst.
    expect(graph.nodes.map((node) => node.id)).toContain('hub-1');

    // But it was never expanded, so only the first hop ran.
    expect(neo4jStub.hopCalls()).toHaveLength(1);
  });

  it('still expands the root when the root itself is a hub', async () => {
    // Asking about a busy IP is a legitimate question, and its immediate
    // neighbours are the answer; the degree cap is for nodes in between.
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 50_000 },
      hop: () => [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    await engine.getNetwork('ip', '41.90.64.12');

    expect(neo4jStub.hopCalls()).toHaveLength(1);
  });

  it('reports truncation when a hop fills its row limit', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: (hopIndex, rowLimit) =>
        hopIndex === 0
          ? Array.from({ length: rowLimit }, (_unused, index) =>
              fakeRecord({
                relationship: fakeRelationship(
                  `rel-${index}`,
                  'root-1',
                  `node-${index}`,
                ),
                neighbour: fakeNode(`node-${index}`, 'Email', `a${index}@x.io`),
                neighbourDegree: neo4j.int(2),
              }),
            )
          : [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12', 1);

    expect(graph.truncated).toBe(true);
  });

  it('stops expanding once the node budget is spent', async () => {
    // Every hop returns a full page of fresh nodes, so the budget runs out
    // before the requested depth does.
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: (hopIndex, rowLimit) =>
        Array.from({ length: rowLimit }, (_unused, index) =>
          fakeRecord({
            relationship: fakeRelationship(
              `rel-${hopIndex}-${index}`,
              'root-1',
              `node-${hopIndex}-${index}`,
            ),
            neighbour: fakeNode(
              `node-${hopIndex}-${index}`,
              'Email',
              `h${hopIndex}n${index}@x.io`,
            ),
            neighbourDegree: neo4j.int(2),
          }),
        ),
    });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12', 5);

    expect(graph.truncated).toBe(true);

    // The budget, not the depth, is what stopped it: fewer than five hops ran
    // and the node count never exceeded the cap.
    expect(neo4jStub.hopCalls().length).toBeLessThan(5);
    expect(graph.nodes.length).toBeLessThanOrEqual(250);
  });

  it('clamps the requested depth', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      // One fresh neighbour per hop, so the frontier never empties and depth
      // is the only thing that can stop the expansion.
      hop: (hopIndex) => [
        fakeRecord({
          relationship: fakeRelationship(
            `rel-${hopIndex}`,
            `node-${hopIndex - 1}`,
            `node-${hopIndex}`,
          ),
          neighbour: fakeNode(`node-${hopIndex}`, 'Email', `n${hopIndex}@x.io`),
          neighbourDegree: neo4j.int(2),
        }),
      ],
    });
    const engine = new GraphEngine(neo4jStub.service);

    await engine.getNetwork('ip', '41.90.64.12', 99);

    expect(neo4jStub.hopCalls()).toHaveLength(5);
  });

  it('adds edges between nodes found at the same depth', async () => {
    // Two accounts both reached from the root, with an edge of their own.
    // That edge is what makes a ring look like a ring instead of two
    // unrelated spokes, and the hop queries never travel along it.
    const first = fakeNode('email-1', 'Email', 'one@example.com');
    const second = fakeNode('email-2', 'Email', 'two@example.com');

    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 2 },
      hop: (hopIndex) =>
        hopIndex === 0
          ? [
              fakeRecord({
                relationship: fakeRelationship('rel-1', 'root-1', 'email-1'),
                neighbour: first,
                neighbourDegree: neo4j.int(2),
              }),
              fakeRecord({
                relationship: fakeRelationship('rel-2', 'root-1', 'email-2'),
                neighbour: second,
                neighbourDegree: neo4j.int(2),
              }),
            ]
          : [],
      closure: [
        fakeRecord({
          relationship: fakeRelationship(
            'rel-cross',
            'email-1',
            'email-2',
            'USED_DEVICE',
          ),
        }),
      ],
    });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12', 1);

    expect(graph.edges.map((edge) => edge.id)).toContain('rel-cross');
  });

  it('degrades instead of failing when the graph is unreachable', async () => {
    const neo4jStub = createNeo4jService({});
    // Every query rejects: Neo4j is down rather than empty.
    neo4jStub.run.mockRejectedValue(new Error('ServiceUnavailable'));
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12');

    /*
     * Refusing to answer would stop every evaluation over a dependency most
     * of a decision does not use: relational features and related
     * identifiers both read SQL and are unaffected.
     */
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.degraded).toBe(true);
  });

  it('does not mark a genuinely empty network as degraded', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 0 },
      hop: () => [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    const graph = await engine.getNetwork('ip', '41.90.64.12');

    /*
     * The distinction is the whole point. "No connections found" and "could
     * not look" are the same response shape and opposite conclusions.
     */
    expect(graph.nodes).toHaveLength(1);
    expect(graph.degraded).toBe(false);
  });

  it('skips the closure query when there is nothing to close over', async () => {
    const neo4jStub = createNeo4jService({
      root: { node: ROOT, degree: 0 },
      hop: () => [],
    });
    const engine = new GraphEngine(neo4jStub.service);

    await engine.getNetwork('ip', '41.90.64.12');

    expect(
      neo4jStub.calls.filter((call) => call.query.includes('IN $nodeIds')),
    ).toHaveLength(0);
  });
});
