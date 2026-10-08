import { AlertResolution } from '../../fraud/types/alert.types';

export class ResolveAlertDto {
  resolution: AlertResolution;
  note?: string;
  resolvedBy?: string;
}
