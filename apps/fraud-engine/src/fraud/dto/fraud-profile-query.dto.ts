import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

import { SUPPORTED_IDENTIFIER_TYPES } from '../types/fraud.types';

/*
 * Depth is bounded here as well as in the graph engine. The engine clamps it
 * because it must never be handed an unbounded traversal; rejecting it here
 * means a caller who asks for depth 50 is told so rather than quietly served
 * depth 5.
 */
const MAX_DEPTH = 5;

export class FraudProfileQueryDto {
  @ApiProperty({
    description: 'Identifier type to build the network around.',
    enum: SUPPORTED_IDENTIFIER_TYPES,
  })
  @IsIn(SUPPORTED_IDENTIFIER_TYPES)
  type: string;

  @ApiProperty({
    description: 'The identifier value.',
    example: 'analyst@example.com',
  })
  @IsString()
  @Length(1, 255)
  value: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_DEPTH, default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DEPTH)
  depth?: number;
}
