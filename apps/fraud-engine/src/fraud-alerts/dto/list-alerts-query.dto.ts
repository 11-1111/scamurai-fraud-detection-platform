import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { ALERT_STATUSES } from './update-alert-status.dto';

/*
 * The page size is capped. Without a ceiling a single request can ask for
 * every alert in the database, which is both a denial-of-service lever and
 * the reason a dashboard "mysteriously" times out once the data grows.
 */
const MAX_PAGE_SIZE = 100;

export class ListAlertsQueryDto {
  @ApiPropertyOptional({ enum: ALERT_STATUSES })
  @IsOptional()
  @IsIn(ALERT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Configured risk level code.' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'Final decision recorded on the alert.' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  decision?: string;

  @ApiPropertyOptional({ description: 'Analyst the alert is assigned to.' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Identifier type the alert was raised from.',
    example: 'payment_account',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  rootIdentifierType?: string;

  @ApiPropertyOptional({ description: 'Identifier the alert was raised from.' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  rootIdentifierValue?: string;

  /*
   * Query parameters arrive as strings. Without @Type they stay strings, and
   * `"2" > 1` happens to work while `"10" < "9"` does not -- so paging breaks
   * only once there are ten pages.
   */
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
