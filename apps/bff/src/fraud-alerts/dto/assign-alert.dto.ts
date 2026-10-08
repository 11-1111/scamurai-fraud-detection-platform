import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignAlertDto {
  @ApiProperty({ description: 'User to assign the alert to', example: 'analyst@company.com' })
  @IsString()
  @IsNotEmpty()
  assignedTo: string;

  @ApiPropertyOptional({ description: 'Optional comment recorded in alert history' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'User performing the action' })
  @IsOptional()
  @IsString()
  performedBy?: string;
}
