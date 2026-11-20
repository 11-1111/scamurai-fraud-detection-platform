import { Injectable, Logger } from '@nestjs/common';
import neo4j, { Node, Relationship } from 'neo4j-driver';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { FraudGraph, GraphEdge, GraphNode } from '../types/fraud.types';
import {
  GRAPH_LABEL_BY_IDENTIFIER_TYPE,
  buildClosureQuery,
  buildExpandQuery,
  buildRootQuery,
} from './graph-queries';

const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 5;

/*
 * The most nodes a single network will return. A fraud analyst cannot read
 * more than this, and it is what bounds the work: every query below is capped
 * by what is left of this budget.
 */
const NODE_BUDGET = 250;

/*
 * A node with more relationships than this is shown but not expanded through.
 *
 * This is a fraud-domain judgement, not just a performance guard. A shared
 * NAT address, a payment processor's own merchant record or a popular
 * prepaid-card BIN connects thousands of unrelated people. Expanding through
 * one does not reveal a ring; it drowns the ring that was there in a hairball
 * where everything appears connected to everything.
 *
 * The root is exempt: if an analyst asks about a busy IP directly, its
 * immediate neighbours are the answer to their question.
 */
const HUB_DEGREE_LIMIT = 500;

/* Rows one hop may contribute, so no single hop can exhaust the budget. */
const HOP_ROW_LIMIT = 100;

/*
 * Server-side ceiling, enforced by Neo4j rather than by this process. Without
 * it a pathological query holds its HTTP request open until something else
 * gives up, and the request handler has no way to reclaim it.
 */
const QUERY_TIMEOUT_MS = 5_000;

const EMPTY_GRAPH: FraudGraph = { nodes: [], edges: [] };

type RootNode = { id: string; node: Node; degree: number };

@Injectable()
export class GraphEngine {
  private readonly logger = new Logger(GraphEngine.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  /*
   * The identifier network around one identifier, as a breadth-first
   * expansion with an explicit budget.
   *
   * The previous implementation asked for `MATCH path = (root)-[*1..n]-(x)
   * RETURN path LIMIT 100`: every relationship type, and a limit on *paths*.
   * That has three problems. Paths overlap heavily, so a hundred of them can
   * describe barely a dozen distinct nodes while the same edges are returned
   * again and again. Which hundred arrive is arbitrary, so the analyst sees
   * whichever corner the planner reached first with nothing marking the
   * result as partial. And expansion through a hub is unbounded, which is
   * where the cost actually lives.
   *
   * Expanding hop by hop costs one round trip per level -- at most five --
   * and buys a result that is bounded, deterministic in size, honest about
   * being truncated, and refuses to expand through hubs.
   */
  async getNetwork(
    type: string,
    value: string,
    depth = DEFAULT_DEPTH,
  ): Promise<FraudGraph> {
    /*
     * An unreachable graph degrades rather than failing the caller.
     *
     * Everything else about an evaluation still works without Neo4j: the
     * relational features read fraud_transactions, and related identifiers
     * read fraud_identifiers. Only the network view is lost, and refusing to
     * score a transaction over that would stop ingestion entirely for a
     * dependency most of the decision does not use.
     *
     * The flag is what makes this safe. An empty network and an unavailable
     * one look identical, and an analyst reading "no connections found" as
     * evidence of innocence is the exact wrong conclusion -- so the caller is
     * told which it was.
     */
    try {
      return await this.buildNetwork(type, value, depth);
    } catch (error) {
      this.logger.warn(
        `Identifier network unavailable for ${type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return { nodes: [], edges: [], degraded: true };
    }
  }

  private async buildNetwork(
    type: string,
    value: string,
    depth: number,
  ): Promise<FraudGraph> {
    const label = GRAPH_LABEL_BY_IDENTIFIER_TYPE[type.trim().toLowerCase()];
    if (!label) {
      return EMPTY_GRAPH;
    }

    const identifierValue = value.trim();
    if (!identifierValue) {
      return EMPTY_GRAPH;
    }

    const maxDepth = Number.isFinite(depth)
      ? Math.max(1, Math.min(Math.floor(depth), MAX_DEPTH))
      : DEFAULT_DEPTH;

    const root = await this.loadRoot(label, identifierValue);
    if (!root) {
      return EMPTY_GRAPH;
    }

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    this.addNode(nodeMap, root.node);

    const visited = new Set<string>([root.id]);
    let frontier: string[] = [root.id];
    let truncated = false;

    for (let hop = 0; hop < maxDepth && frontier.length > 0; hop += 1) {
      const remainingBudget = NODE_BUDGET - nodeMap.size;
      if (remainingBudget <= 0) {
        truncated = true;
        break;
      }

      const rowLimit = Math.min(remainingBudget, HOP_ROW_LIMIT);
      const rows = await this.expandFrontier(frontier, rowLimit);

      /*
       * A full page means there were more neighbours than the budget allowed,
       * so the result is a slice rather than the whole network.
       */
      if (rows.length >= rowLimit) {
        truncated = true;
      }

      const nextFrontier: string[] = [];

      for (const row of rows) {
        this.addNode(nodeMap, row.neighbour);
        this.addEdge(edgeMap, row.relationship);

        const neighbourId = row.neighbour.elementId;
        if (visited.has(neighbourId)) {
          continue;
        }
        visited.add(neighbourId);

        if (row.neighbourDegree > HUB_DEGREE_LIMIT) {
          /*
           * Shown, so the analyst can see the connection exists, but not
           * expanded through.
           */
          this.logger.debug(
            `Not expanding through hub ${neighbourId} (degree ${row.neighbourDegree}).`,
          );
          continue;
        }

        nextFrontier.push(neighbourId);
      }

      frontier = nextFrontier;
    }

    /*
     * The expansion above only returns edges it travelled along, so two nodes
     * discovered at the same depth come back unconnected even when an edge
     * joins them. Those edges are the whole point of a network view: a ring
     * is visible precisely because its members interconnect rather than
     * hanging separately off the root.
     */
    await this.addEdgesWithinSubgraph(Array.from(visited), edgeMap);

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
      truncated,
      /*
       * Stated rather than left absent, so a caller never has to tell an
       * unset field from a healthy read. The whole value of the flag is that
       * "no connections" and "could not look" stop being the same answer.
       */
      degraded: false,
    };
  }

  /*
   * The label is resolved from GRAPH_LABEL_BY_IDENTIFIER_TYPE above, so it is
   * one of a fixed set of literals rather than caller input; the value is
   * always a parameter. Cypher cannot parameterise a label.
   */
  private async loadRoot(
    label: string,
    value: string,
  ): Promise<RootNode | null> {
    const records = await this.neo4jService.run(
      buildRootQuery(label),
      { value },
      { timeout: QUERY_TIMEOUT_MS },
    );

    const record = records[0];
    if (!record) {
      return null;
    }

    return {
      id: record.get('id') as string,
      node: record.get('root') as Node,
      degree: toJsNumber(record.get('degree')),
    };
  }

  private async expandFrontier(
    frontier: string[],
    rowLimit: number,
  ): Promise<
    Array<{
      relationship: Relationship;
      neighbour: Node;
      neighbourDegree: number;
    }>
  > {
    const records = await this.neo4jService.run(
      buildExpandQuery(),
      {
        frontier,
        // Cypher's LIMIT rejects a float, and the driver sends every plain
        // JavaScript number as one.
        rowLimit: neo4j.int(rowLimit),
      },
      { timeout: QUERY_TIMEOUT_MS },
    );

    return records.map((record) => ({
      relationship: record.get('relationship') as Relationship,
      neighbour: record.get('neighbour') as Node,
      neighbourDegree: toJsNumber(record.get('neighbourDegree')),
    }));
  }

  private async addEdgesWithinSubgraph(
    nodeIds: string[],
    edgeMap: Map<string, GraphEdge>,
  ): Promise<void> {
    if (nodeIds.length < 2) {
      return;
    }

    const records = await this.neo4jService.run(
      buildClosureQuery(),
      {
        nodeIds,
        // Bounded by the node budget: a subgraph this size cannot hold more
        // interesting edges than an analyst will read.
        rowLimit: neo4j.int(NODE_BUDGET * 4),
      },
      { timeout: QUERY_TIMEOUT_MS },
    );

    for (const record of records) {
      this.addEdge(edgeMap, record.get('relationship') as Relationship);
    }
  }

  private addNode(nodeMap: Map<string, GraphNode>, node: Node): void {
    const nodeId = node.elementId;
    if (nodeMap.has(nodeId)) {
      return;
    }

    const labels = node.labels ?? [];
    const primaryLabel = labels[0] ?? 'Node';
    const value = this.toDisplayString(node.properties?.value);
    const transactionId = this.toDisplayString(node.properties?.id);
    const fallbackLabel = transactionId || nodeId;
    const label = value || fallbackLabel;

    nodeMap.set(nodeId, {
      id: nodeId,
      label,
      type: primaryLabel,
    });
  }

  private addEdge(
    edgeMap: Map<string, GraphEdge>,
    relationship: Relationship,
  ): void {
    const edgeId = relationship.elementId;
    if (edgeMap.has(edgeId)) {
      return;
    }

    edgeMap.set(edgeId, {
      id: edgeId,
      source: relationship.startNodeElementId,
      target: relationship.endNodeElementId,
      label: relationship.type,
    });
  }

  private toDisplayString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }
}

/*
 * Neo4j returns integers as its own lossless Integer type, not as JavaScript
 * numbers, so a degree read straight from a record compares as NaN against a
 * numeric threshold -- quietly, since NaN comparisons are merely false.
 */
function toJsNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (neo4j.isInt(value)) {
    return value.toNumber();
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  return 0;
}
