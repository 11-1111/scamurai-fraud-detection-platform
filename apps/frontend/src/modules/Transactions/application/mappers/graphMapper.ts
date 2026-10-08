import type { Edge, Node } from "@vue-flow/core";
import type {
  FraudGraph,
  FraudGraphEdge,
  FraudGraphNode,
} from "../../domain/entities/Transaction";

export interface FraudFlowNodeData {
  label: string;
  type: string;
}

export interface MappedGraph {
  nodes: Node<FraudFlowNodeData>[];
  edges: Edge[];
}

const GRID_COLUMNS = 4;
const HORIZONTAL_SPACING = 260;
const VERTICAL_SPACING = 170;

export function normalizeNodeType(type: string): string {
  const normalized = type.trim().toLowerCase().replace(/[\s_-]/g, "");
  switch (normalized) {
    case "transaction":
      return "Transaction";
    case "email":
      return "Email";
    case "phone":
      return "Phone";
    case "ip":
    case "ipaddress":
      return "IP";
    case "paymentaccount":
      return "PaymentAccount";
    case "devicefingerprint":
    case "fingerprint":
      return "DeviceFingerprint";
    case "merchant":
      return "Merchant";
    default:
      return type.trim() || "Unknown";
  }
}

export function mapApiNode(node: FraudGraphNode, index: number): Node<FraudFlowNodeData> {
  return {
    id: node.id,
    type: "fraud",
    position: {
      x: (index % GRID_COLUMNS) * HORIZONTAL_SPACING,
      y: Math.floor(index / GRID_COLUMNS) * VERTICAL_SPACING,
    },
    draggable: true,
    data: {
      label: node.label,
      type: normalizeNodeType(node.type),
    },
  };
}

export function mapApiEdge(edge: FraudGraphEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: false,
  };
}

export function mapGraph(graph?: FraudGraph | null): MappedGraph {
  if (!graph) {
    return { nodes: [], edges: [] };
  }

  const nodes = (graph.nodes ?? []).map(mapApiNode);
  const edges = (graph.edges ?? []).map(mapApiEdge);

  return { nodes, edges };
}
