export class ListAlertsQueryDto {
  status?: string;
  riskLevel?: string;
  decision?: string;
  assignedTo?: string;
  rootIdentifierType?: string;
  rootIdentifierValue?: string;
  page?: number;
  pageSize?: number;
}
