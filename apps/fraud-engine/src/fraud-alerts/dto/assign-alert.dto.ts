import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class AssignAlertDto {
  @ApiProperty({
    description: 'The analyst the alert is assigned to.',
    maxLength: 255,
    example: 'analyst@example.com',
  })
  @IsString()
  @Length(1, 255)
  assignedTo: string;

  @ApiPropertyOptional({
    description: 'Why the alert was assigned.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Who performed the assignment. Self-reported until authentication is ' +
      'in place.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  performedBy?: string;
}
