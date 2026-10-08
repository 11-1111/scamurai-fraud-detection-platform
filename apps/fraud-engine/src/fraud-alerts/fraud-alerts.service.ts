import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudAlertHistoryEntity } from '../database/entities/fraud-alert-history.entity';
import { FraudAlertNoteEntity } from '../database/entities/fraud-alert-note.entity';
import { FraudAlertPolicyActionEntity } from '../database/entities/fraud-alert-policy-action.entity';
import { FraudAlertTriggeredRuleEntity } from '../database/entities/fraud-alert-triggered-rule.entity';
import { FraudAlertEntity } from '../database/entities/fraud-alert.entity';
import {
  AlertListQuery,
  AlertResolution,
  AlertStatus,
  FraudAlertDetail,
  FraudAlertSummary,
} from '../fraud/types/alert.types';

@Injectable()
export class FraudAlertsService {
  constructor(
    @InjectRepository(FraudAlertEntity, 'fraud')
    private readonly alertRepo: Repository<FraudAlertEntity>,
    @InjectRepository(FraudAlertTriggeredRuleEntity, 'fraud')
    private readonly alertRuleRepo: Repository<FraudAlertTriggeredRuleEntity>,
    @InjectRepository(FraudAlertPolicyActionEntity, 'fraud')
    private readonly alertPolicyRepo: Repository<FraudAlertPolicyActionEntity>,
    @InjectRepository(FraudAlertNoteEntity, 'fraud')
    private readonly alertNoteRepo: Repository<FraudAlertNoteEntity>,
    @InjectRepository(FraudAlertHistoryEntity, 'fraud')
    private readonly alertHistoryRepo: Repository<FraudAlertHistoryEntity>,
  ) {}

  async listAlerts(query: AlertListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.max(Number(query.pageSize) || 20, 1);

    const qb = this.alertRepo.createQueryBuilder('alert');

    if (query.status) {
      qb.andWhere('alert.alert_status = :status', { status: query.status });
    }
    if (query.riskLevel) {
      qb.andWhere('alert.risk_level = :riskLevel', { riskLevel: query.riskLevel });
    }
    if (query.decision) {
      qb.andWhere('alert.final_decision = :decision', { decision: query.decision });
    }
    if (query.assignedTo) {
      qb.andWhere('alert.assigned_to = :assignedTo', { assignedTo: query.assignedTo });
    }
    if (query.rootIdentifierType) {
      qb.andWhere('alert.root_identifier_type = :rootIdentifierType', {
        rootIdentifierType: query.rootIdentifierType,
      });
    }
    if (query.rootIdentifierValue) {
      qb.andWhere('alert.root_identifier_value = :rootIdentifierValue', {
        rootIdentifierValue: query.rootIdentifierValue,
      });
    }

    qb.orderBy('alert.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [alerts, total] = await qb.getManyAndCount();

    return {
      page,
      pageSize,
      total,
      alerts: alerts.map((alert) => this.toSummary(alert)),
    };
  }

  async getAlertById(id: string): Promise<FraudAlertDetail> {
    const alert = await this.getAlertEntityById(id);
    const [triggeredRules, policyActions, notes, history] = await Promise.all([
      this.alertRuleRepo.find({
        where: { alertId: id },
        order: { createdAt: 'ASC' },
      }),
      this.alertPolicyRepo.find({
        where: { alertId: id },
        order: { priority: 'DESC' },
      }),
      this.alertNoteRepo.find({
        where: { alertId: id },
        order: { createdAt: 'ASC' },
      }),
      this.alertHistoryRepo.find({
        where: { alertId: id },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      ...this.toSummary(alert),
      features: this.parseJson<Record<string, number>>(alert.featuresJson, {}),
      relatedIdentifiers: this.parseJson<unknown>(alert.relatedIdentifiersJson, {}),
      graph: this.parseJson<unknown>(alert.graphJson, {}),
      triggeredRules,
      policyActions,
      reasons: this.parseJson<string[]>(alert.reasonsJson, []),
      notes,
      history: history.map((item) => ({
        id: item.id,
        actionType: item.actionType,
        previousStatus: item.previousStatus ?? null,
        newStatus: item.newStatus ?? null,
        previousAssignee: item.previousAssignee ?? null,
        newAssignee: item.newAssignee ?? null,
        resolution: item.resolution ?? null,
        comment: item.comment ?? null,
        performedBy: item.performedBy ?? null,
        createdAt: item.createdAt,
      })),
    };
  }

  async updateStatus(
    id: string,
    status: AlertStatus,
    options?: { comment?: string; performedBy?: string },
  ) {
    this.ensureValidStatus(status);

    const alert = await this.getAlertEntityById(id);
    const previousStatus = alert.alertStatus;
    const now = new Date();
    alert.alertStatus = status;
    alert.updatedAt = now;
    if (status === 'CLOSED') {
      alert.closedAt = now;
    }
    await this.alertRepo.save(alert);
    await this.recordHistory({
      alertId: id,
      actionType: 'STATUS_CHANGED',
      previousStatus,
      newStatus: status,
      performedBy: options?.performedBy?.trim() || null,
      comment: options?.comment?.trim() || null,
    });
    return this.toSummary(alert);
  }

  async assignAlert(
    id: string,
    assignedTo: string,
    options?: { comment?: string; performedBy?: string },
  ) {
    if (!assignedTo?.trim()) {
      throw new BadRequestException('assignedTo is required.');
    }

    const alert = await this.getAlertEntityById(id);
    const previousAssignee = alert.assignedTo ?? null;
    const previousStatus = alert.alertStatus;
    const now = new Date();
    alert.assignedTo = assignedTo.trim();
    alert.assignedAt = now;
    if (alert.alertStatus === 'OPEN') {
      alert.alertStatus = 'ASSIGNED';
    }
    alert.updatedAt = now;
    await this.alertRepo.save(alert);
    await this.recordHistory({
      alertId: id,
      actionType: 'ASSIGNED',
      previousStatus,
      newStatus: alert.alertStatus,
      previousAssignee,
      newAssignee: alert.assignedTo,
      performedBy:
        options?.performedBy?.trim() || alert.assignedTo || null,
      comment: options?.comment?.trim() || null,
    });
    return this.toSummary(alert);
  }

  async resolveAlert(
    id: string,
    resolution: AlertResolution,
    note?: string,
    resolvedBy?: string,
  ) {
    this.ensureValidResolution(resolution);

    const alert = await this.getAlertEntityById(id);
    const previousStatus = alert.alertStatus;
    const now = new Date();
    alert.alertStatus = 'RESOLVED';
    alert.resolution = resolution;
    alert.resolvedAt = now;
    alert.updatedAt = now;
    await this.alertRepo.save(alert);

    if (note?.trim()) {
      await this.alertNoteRepo.save(
        this.alertNoteRepo.create({
          alertId: id,
          note: note.trim(),
          createdBy: resolvedBy?.trim() || undefined,
          createdAt: now,
        }),
      );
    }

    await this.recordHistory({
      alertId: id,
      actionType: 'RESOLVED',
      previousStatus,
      newStatus: 'RESOLVED',
      resolution,
      comment: note?.trim() || null,
      performedBy: resolvedBy?.trim() || null,
    });

    return this.getAlertById(id);
  }

  async addNote(id: string, note: string, createdBy?: string) {
    if (!note?.trim()) {
      throw new BadRequestException('note is required.');
    }

    const alert = await this.getAlertEntityById(id);
    const now = new Date();
    await this.alertNoteRepo.save(
      this.alertNoteRepo.create({
        alertId: id,
        note: note.trim(),
        createdBy: createdBy?.trim() || undefined,
        createdAt: now,
      }),
    );
    alert.updatedAt = now;
    await this.alertRepo.save(alert);
    await this.recordHistory({
      alertId: id,
      actionType: 'NOTE_ADDED',
      previousStatus: alert.alertStatus,
      newStatus: alert.alertStatus,
      comment: note.trim(),
      performedBy: createdBy?.trim() || null,
    });

    return this.getAlertById(id);
  }

  async getAlertHistory(id: string) {
    await this.getAlertEntityById(id);
    const history = await this.alertHistoryRepo.find({
      where: { alertId: id },
      order: { createdAt: 'DESC' },
    });

    return history.map((item) => ({
      id: item.id,
      actionType: item.actionType,
      previousStatus: item.previousStatus ?? null,
      newStatus: item.newStatus ?? null,
      previousAssignee: item.previousAssignee ?? null,
      newAssignee: item.newAssignee ?? null,
      resolution: item.resolution ?? null,
      comment: item.comment ?? null,
      performedBy: item.performedBy ?? null,
      createdAt: item.createdAt,
    }));
  }

  async getAlertStats() {
    const statuses = ['OPEN', 'ASSIGNED', 'UNDER_REVIEW', 'RESOLVED'] as const;
    const statusCounts = await Promise.all(
      statuses.map((status) =>
        this.alertRepo.count({ where: { alertStatus: status } }),
      ),
    );
    const [totalCritical, totalHigh] = await Promise.all([
      this.alertRepo.count({ where: { riskLevel: 'CRITICAL' } }),
      this.alertRepo.count({ where: { riskLevel: 'HIGH' } }),
    ]);

    const byDecision = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.final_decision', 'decision')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.final_decision')
      .getRawMany<{ decision: string; count: string }>();

    const byRiskLevel = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.risk_level', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.risk_level')
      .getRawMany<{ riskLevel: string; count: string }>();

    return {
      totalOpen: statusCounts[0],
      totalAssigned: statusCounts[1],
      totalUnderReview: statusCounts[2],
      totalResolved: statusCounts[3],
      totalCritical,
      totalHigh,
      byDecision: byDecision.map((item) => ({
        decision: item.decision,
        count: Number(item.count),
      })),
      byRiskLevel: byRiskLevel.map((item) => ({
        riskLevel: item.riskLevel,
        count: Number(item.count),
      })),
    };
  }

  private async getAlertEntityById(id: string): Promise<FraudAlertEntity> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Fraud alert ${id} not found.`);
    }
    return alert;
  }

  private toSummary(alert: FraudAlertEntity): FraudAlertSummary {
    return {
      id: alert.id,
      transactionId: alert.transactionId,
      rootIdentifier: {
        type: alert.rootIdentifierType,
        value: alert.rootIdentifierValue,
      },
      riskScore: alert.riskScore,
      riskLevel: alert.riskLevel,
      defaultDecision: alert.defaultDecision ?? null,
      finalDecision: alert.finalDecision,
      highestSeverity: alert.highestSeverity ?? null,
      alertStatus: alert.alertStatus,
      resolution: alert.resolution ?? null,
      assignedTo: alert.assignedTo ?? null,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt ?? null,
    };
  }

  private ensureValidStatus(status: string): void {
    const validStatuses: AlertStatus[] = [
      'OPEN',
      'ASSIGNED',
      'UNDER_REVIEW',
      'RESOLVED',
      'CLOSED',
      'DISMISSED',
    ];
    if (!validStatuses.includes(status as AlertStatus)) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`,
      );
    }
  }

  private ensureValidResolution(resolution: string): void {
    const validResolutions: AlertResolution[] = [
      'CONFIRMED_FRAUD',
      'FALSE_POSITIVE',
      'DUPLICATE',
      'INSUFFICIENT_EVIDENCE',
      'CUSTOMER_CONFIRMED',
      'MERCHANT_CONFIRMED',
    ];
    if (!validResolutions.includes(resolution as AlertResolution)) {
      throw new BadRequestException(
        `Invalid resolution "${resolution}". Allowed values: ${validResolutions.join(', ')}`,
      );
    }
  }

  private parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) {
      return fallback;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private async recordHistory(input: {
    alertId: string;
    actionType: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    previousAssignee?: string | null;
    newAssignee?: string | null;
    resolution?: string | null;
    comment?: string | null;
    performedBy?: string | null;
  }) {
    await this.alertHistoryRepo.save(
      this.alertHistoryRepo.create({
        alertId: input.alertId,
        actionType: input.actionType,
        previousStatus: input.previousStatus ?? undefined,
        newStatus: input.newStatus ?? undefined,
        previousAssignee: input.previousAssignee ?? undefined,
        newAssignee: input.newAssignee ?? undefined,
        resolution: input.resolution ?? undefined,
        comment: input.comment ?? undefined,
        performedBy: input.performedBy ?? undefined,
        createdAt: new Date(),
      }),
    );
  }
}
