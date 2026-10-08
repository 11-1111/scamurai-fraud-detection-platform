import {
  FraudAlertDetailDto,
  FraudAlertHistoryItemDto,
  FraudAlertNoteDto,
  FraudAlertSummaryDto,
  FraudAlertsListResponseDto,
  FraudFeatureCatalogItemDto,
  FraudGraphDto,
  FraudPolicyActionDto,
  FraudPolicyDto,
  FraudRiskLevelDto,
  FraudRuleDto,
  FraudTriggeredRuleDto,
} from '../dto/fraud.dto';
import {
  UpstreamFraudAlertDetail,
  UpstreamFraudAlertSummary,
  UpstreamFraudAlertsListResponse,
  UpstreamFraudFeatureCatalogItem,
  UpstreamFraudPolicy,
  UpstreamFraudPolicyAction,
  UpstreamFraudRiskLevel,
  UpstreamFraudRule,
  UpstreamFraudTriggeredRule,
} from '../dto/upstream-fraud.types';
import { toUtcIsoString } from '../../common/utils/date.util';

export function mapAlertSummary(
  upstream: UpstreamFraudAlertSummary,
): FraudAlertSummaryDto {
  return {
    id: upstream.id,
    fraudTransactionId: upstream.transactionId ?? null,
    rootIdentifierType: upstream.rootIdentifier.type,
    rootIdentifierValue: upstream.rootIdentifier.value,
    riskScore: upstream.riskScore,
    riskLevel: upstream.riskLevel,
    severity: upstream.highestSeverity ?? null,
    decision: upstream.finalDecision,
    status: upstream.alertStatus,
    merchantName: null,
    customerName: null,
    customerEmail: null,
    paymentAccount: null,
    createdAt: toUtcIsoString(upstream.createdAt) ?? '',
    updatedAt: toUtcIsoString(upstream.updatedAt),
    assignedTo: upstream.assignedTo ?? null,
  };
}

export function mapTriggeredRule(
  upstream: UpstreamFraudTriggeredRule,
): FraudTriggeredRuleDto {
  return {
    ruleId: upstream.ruleId ?? upstream.id ?? null,
    ruleCode: upstream.ruleCode ?? '',
    ruleName: upstream.ruleName ?? '',
    featureName: upstream.featureName ?? null,
    operator: upstream.operator ?? null,
    thresholdValue: upstream.thresholdValue ?? null,
    actualValue: upstream.actualValue ?? upstream.featureValue ?? null,
    scoreImpact: upstream.scoreImpact ?? null,
    severity: upstream.severity ?? null,
    reason: upstream.message ?? upstream.reason ?? null,
  };
}

export function mapPolicyAction(
  upstream: UpstreamFraudPolicyAction,
): FraudPolicyActionDto {
  return {
    policyCode: upstream.policyCode ?? '',
    policyName: upstream.policyName ?? '',
    decision: upstream.decision ?? '',
    actionLabel: upstream.actionLabel ?? '',
    priority: upstream.priority ?? null,
  };
}

function mapGraph(input: unknown): FraudGraphDto {
  if (input == null || typeof input !== 'object') {
    return { nodes: [], edges: [] };
  }

  const graph = input as {
    nodes?: Array<{ id?: string; label?: string; type?: string }>;
    edges?: Array<{
      id?: string;
      source?: string;
      target?: string;
      label?: string;
    }>;
  };

  return {
    nodes: (graph.nodes ?? []).map((node) => ({
      id: node.id ?? '',
      label: node.label ?? '',
      type: node.type ?? '',
    })),
    edges: (graph.edges ?? []).map((edge) => ({
      id: edge.id ?? '',
      source: edge.source ?? '',
      target: edge.target ?? '',
      label: edge.label ?? '',
    })),
  };
}

export function mapAlertDetail(
  upstream: UpstreamFraudAlertDetail,
): FraudAlertDetailDto {
  return {
    ...mapAlertSummary(upstream),
    defaultDecision: upstream.defaultDecision ?? null,
    resolution: upstream.resolution ?? null,
    features: upstream.features ?? {},
    relatedIdentifiers: upstream.relatedIdentifiers ?? {},
    graph: mapGraph(upstream.graph),
    triggeredRules: (upstream.triggeredRules ?? []).map(mapTriggeredRule),
    policyActions: (upstream.policyActions ?? []).map(mapPolicyAction),
    reasons: upstream.reasons ?? [],
    notes: (upstream.notes ?? []).map(
      (note): FraudAlertNoteDto => ({
        id: note.id,
        note: note.note,
        createdBy: note.createdBy ?? null,
        createdAt: toUtcIsoString(note.createdAt) ?? '',
      }),
    ),
    history: (upstream.history ?? []).map(
      (item): FraudAlertHistoryItemDto => ({
        id: item.id,
        actionType: item.actionType,
        previousStatus: item.previousStatus ?? null,
        newStatus: item.newStatus ?? null,
        previousAssignee: item.previousAssignee ?? null,
        newAssignee: item.newAssignee ?? null,
        resolution: item.resolution ?? null,
        comment: item.comment ?? null,
        performedBy: item.performedBy ?? null,
        createdAt: toUtcIsoString(item.createdAt) ?? '',
      }),
    ),
  };
}

export function mapAlertsList(
  upstream: UpstreamFraudAlertsListResponse,
): FraudAlertsListResponseDto {
  return {
    page: upstream.page,
    pageSize: upstream.pageSize,
    total: upstream.total,
    alerts: upstream.alerts.map(mapAlertSummary),
  };
}

export function mapFeatureCatalogItem(
  upstream: UpstreamFraudFeatureCatalogItem,
): FraudFeatureCatalogItemDto {
  return {
    featureName: upstream.featureName,
    label: upstream.label,
    description: upstream.description,
    category: upstream.category,
    dataType: upstream.dataType,
    supportedOperators: upstream.supportedOperators,
    unit: upstream.unit ?? null,
    windowSeconds: upstream.windowSeconds ?? null,
    version: upstream.version,
  };
}

export function mapRule(upstream: UpstreamFraudRule): FraudRuleDto {
  return {
    id: upstream.id,
    ruleCode: upstream.ruleCode,
    ruleName: upstream.ruleName,
    description: upstream.description ?? null,
    featureName: upstream.featureName,
    operator: upstream.operator,
    thresholdValue: Number(upstream.thresholdValue),
    scoreImpact: upstream.scoreImpact,
    severity: upstream.severity,
    message: null,
    isEnabled: upstream.isEnabled,
    createdAt: toUtcIsoString(upstream.createdAt) ?? '',
    updatedAt: toUtcIsoString(upstream.updatedAt),
  };
}

export function mapRiskLevel(upstream: UpstreamFraudRiskLevel): FraudRiskLevelDto {
  return {
    id: upstream.id,
    code: upstream.levelCode ?? '',
    name: upstream.levelName ?? '',
    minScore: upstream.minScore,
    maxScore: upstream.maxScore ?? null,
    defaultDecision: upstream.defaultDecision ?? null,
    displayColor: upstream.displayColor ?? null,
    priority: upstream.priority ?? null,
    isEnabled: upstream.isEnabled,
  };
}

export function mapPolicy(upstream: UpstreamFraudPolicy): FraudPolicyDto {
  return {
    id: upstream.id,
    policyCode: upstream.policyCode,
    policyName: upstream.policyName,
    riskLevel: upstream.riskLevel ?? null,
    minScore: upstream.minScore ?? null,
    maxScore: upstream.maxScore ?? null,
    decision: upstream.decision,
    actionLabel: upstream.actionLabel ?? null,
    priority: upstream.priority ?? null,
    isEnabled: upstream.isEnabled,
    featureName: upstream.featureName ?? null,
    operator: upstream.operator ?? null,
    thresholdValue: upstream.thresholdValue ?? null,
  };
}
