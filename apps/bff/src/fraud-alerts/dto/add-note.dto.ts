import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddNoteDto {
  @ApiProperty({ description: 'Note text' })
  @IsString()
  @IsNotEmpty()
  note: string;

  @ApiPropertyOptional({ description: 'User who created the note' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
