import { AlertStatus } from '../../fraud/types/alert.types';

export class UpdateAlertStatusDto {
  status: AlertStatus;
  comment?: string;
  performedBy?: string;
}
