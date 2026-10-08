import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const ALLOWED_OPERATORS = ['>', '>=', '<', '<=', '==', '!='] as const;

export class CreateFraudRuleDto {
  @ApiProperty({ example: 'EMAIL_MANY_IPS' })
  @IsString()
  @IsNotEmpty()
  ruleCode: string;

  @ApiProperty({ example: 'Email linked to many IPs' })
  @IsString()
  @IsNotEmpty()
  ruleName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'unique_ips_linked' })
  @IsString()
  @IsNotEmpty()
  featureName: string;

  @ApiProperty({ enum: ALLOWED_OPERATORS, example: '>' })
  @IsIn([...ALLOWED_OPERATORS])
  operator: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  thresholdValue: number;

  @ApiProperty({ enum: ALLOWED_SEVERITIES, example: 'HIGH' })
  @IsIn([...ALLOWED_SEVERITIES])
  severity: string;

  @ApiProperty({ example: 25, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  scoreImpact: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateFraudRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ruleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  featureName?: string;

  @ApiPropertyOptional({ enum: ALLOWED_OPERATORS })
  @IsOptional()
  @IsIn([...ALLOWED_OPERATORS])
  operator?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  thresholdValue?: number;

  @ApiPropertyOptional({ enum: ALLOWED_SEVERITIES })
  @IsOptional()
  @IsIn([...ALLOWED_SEVERITIES])
  severity?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scoreImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
