import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import type { AlertStatus } from '../../fraud/types/alert.types';

/*
 * Kept beside the AlertStatus union so the two cannot drift: the union is a
 * compile-time type and erases, so the runtime guard has to list the values
 * itself.
 */
export const ALERT_STATUSES: readonly AlertStatus[] = [
  'OPEN',
  'ASSIGNED',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
  'DISMISSED',
];

export class UpdateAlertStatusDto {
  @ApiProperty({
    description: 'The status to move the alert to.',
    enum: ALERT_STATUSES,
  })
  @IsIn(ALERT_STATUSES)
  status: AlertStatus;

  @ApiPropertyOptional({
    description: 'Why the status changed.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Who changed the status. Self-reported until authentication is in ' +
      'place.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  performedBy?: string;
}
