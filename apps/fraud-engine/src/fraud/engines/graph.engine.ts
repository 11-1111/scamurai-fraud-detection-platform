import { Injectable } from '@nestjs/common';
import { Node, Relationship } from 'neo4j-driver';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { FraudGraph, GraphEdge, GraphNode } from '../types/fraud.types';

const GRAPH_LABEL_BY_IDENTIFIER_TYPE: Record<string, string | null> = {
  email: 'Email',
  phone: 'Phone',
  ip: 'IP',
  payment_account: 'PaymentAccount',
  fingerprint: 'DeviceFingerprint',
  merchant_email: 'Merchant',
  merchant_name: 'Merchant',
  confirmation_code: null,
  order_tracking_id: null,
  bank_auth_code: null,
};

@Injectable()
export class GraphEngine {
  constructor(private readonly neo4jService: Neo4jService) {}

  async getNetwork(type: string, value: string, depth = 2): Promise<FraudGraph> {
    const label = GRAPH_LABEL_BY_IDENTIFIER_TYPE[type.trim().toLowerCase()];
    if (!label) {
      return { nodes: [], edges: [] };
    }

    const safeDepth = Number.isFinite(depth)
      ? Math.max(1, Math.min(Math.floor(depth), 5))
      : 2;

    const query = `
      MATCH path = (root:${label} {value: $value})-[*1..${safeDepth}]-(connected)
      RETURN path
      LIMIT 100
    `;

    const records = await this.neo4jService.run(query, { value: value.trim() });
    if (records.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    for (const record of records) {
      const path = record.get('path');
      if (!path) {
        continue;
      }

      for (const segment of path.segments ?? []) {
        this.addNode(nodeMap, segment.start);
        this.addNode(nodeMap, segment.end);
        this.addEdge(edgeMap, segment.relationship);
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
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
