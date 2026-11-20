import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class AddAlertNoteDto {
  @ApiProperty({
    description: 'The note to attach to the alert.',
    maxLength: 2000,
    example: 'Customer confirmed the charge was theirs.',
  })
  @IsString()
  @Length(1, 2000)
  note: string;

  /*
   * Self-reported, and recorded as such. Until requests carry an
   * authenticated principal this is whatever the caller claimed, which is
   * why the audit trail stores it rather than trusting it.
   */
  @ApiPropertyOptional({
    description:
      'Who added the note. Self-reported until authentication is in place.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  createdBy?: string;
}
