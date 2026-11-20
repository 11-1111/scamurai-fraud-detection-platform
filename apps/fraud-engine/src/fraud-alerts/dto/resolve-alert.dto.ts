import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import type { AlertResolution } from '../../fraud/types/alert.types';

/* See ALERT_STATUSES: the union erases, so the values are listed for runtime. */
export const ALERT_RESOLUTIONS: readonly AlertResolution[] = [
  'CONFIRMED_FRAUD',
  'FALSE_POSITIVE',
  'DUPLICATE',
  'INSUFFICIENT_EVIDENCE',
  'CUSTOMER_CONFIRMED',
  'MERCHANT_CONFIRMED',
];

export class ResolveAlertDto {
  @ApiProperty({
    description: 'The outcome the alert is being closed with.',
    enum: ALERT_RESOLUTIONS,
  })
  @IsIn(ALERT_RESOLUTIONS)
  resolution: AlertResolution;

  @ApiPropertyOptional({
    description: 'Supporting detail for the resolution.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  note?: string;

  @ApiPropertyOptional({
    description:
      'Who resolved the alert. Self-reported until authentication is in ' +
      'place.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  resolvedBy?: string;
}
