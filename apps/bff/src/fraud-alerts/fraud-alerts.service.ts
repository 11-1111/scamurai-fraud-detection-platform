import { Injectable } from '@nestjs/common';

import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';
import {
  FraudAlertDetailResponseDto,
  FraudAlertsListResponseDto,
  FraudIngestionSyncResponseDto,
} from '../fraud/dto/fraud.dto';
import {
  UpstreamFraudAlertDetail,
  UpstreamFraudAlertsListResponse,
  UpstreamIngestionSyncResponse,
} from '../fraud/dto/upstream-fraud.types';
import {
  mapAlertDetail,
  mapAlertsList,
} from '../fraud/mappers/fraud.mapper';
import { QueryAlertsDto } from '../fraud-alerts/dto/query-alerts.dto';
import { AssignAlertDto } from '../fraud-alerts/dto/assign-alert.dto';
import { UpdateStatusDto } from '../fraud-alerts/dto/update-status.dto';
import { ResolveAlertDto } from '../fraud-alerts/dto/resolve-alert.dto';
import { AddNoteDto } from '../fraud-alerts/dto/add-note.dto';

@Injectable()
export class FraudAlertsService {
  constructor(private readonly fraudClient: FraudServiceClient) {}

  async getAlerts(query: QueryAlertsDto): Promise<FraudAlertsListResponseDto> {
    const upstream = await this.fraudClient.get<UpstreamFraudAlertsListResponse>(
      '/fraud/alerts',
      { params: this.toQueryParams(query) },
    );
    return mapAlertsList(upstream);
  }

  getAlertStats(): Promise<unknown> {
    return this.fraudClient.get('/fraud/alerts/stats');
  }

  async getAlert(id: string): Promise<FraudAlertDetailResponseDto> {
    const upstream = await this.fraudClient.get<UpstreamFraudAlertDetail>(
      `/fraud/alerts/${id}`,
    );
    return { alert: mapAlertDetail(upstream) };
  }

  getAlertHistory(id: string): Promise<unknown> {
    return this.fraudClient.get(`/fraud/alerts/${id}/history`);
  }

  assignAlert(id: string, body: AssignAlertDto): Promise<unknown> {
    return this.fraudClient.patch(`/fraud/alerts/${id}/assign`, { body });
  }

  updateAlertStatus(id: string, body: UpdateStatusDto): Promise<unknown> {
    return this.fraudClient.patch(`/fraud/alerts/${id}/status`, { body });
  }

  async resolveAlert(
    id: string,
    body: ResolveAlertDto,
  ): Promise<FraudAlertDetailResponseDto> {
    const upstream = await this.fraudClient.patch<UpstreamFraudAlertDetail>(
      `/fraud/alerts/${id}/resolve`,
      { body },
    );
    return { alert: mapAlertDetail(upstream) };
  }

  async addNote(
    id: string,
    body: AddNoteDto,
  ): Promise<FraudAlertDetailResponseDto> {
    const upstream = await this.fraudClient.post<UpstreamFraudAlertDetail>(
      `/fraud/alerts/${id}/notes`,
      { body },
    );
    return { alert: mapAlertDetail(upstream) };
  }

  private toQueryParams(query: QueryAlertsDto): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(query).filter(([, value]) => value != null && value !== ''),
    );
  }
}
