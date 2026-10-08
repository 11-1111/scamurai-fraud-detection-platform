import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAlertDto {
  @ApiProperty({ description: 'Resolution outcome', example: 'FALSE_POSITIVE' })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiPropertyOptional({ description: 'Optional note recorded with the resolution' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'User who resolved the alert' })
  @IsOptional()
  @IsString()
  resolvedBy?: string;
}
