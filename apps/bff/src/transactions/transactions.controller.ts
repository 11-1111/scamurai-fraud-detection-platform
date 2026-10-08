import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('bff/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get('fraud-debug')
  @ApiOperation({ summary: 'Debug: fetch fraud profile for a given identifier' })
  @ApiQuery({ name: 'type', required: true, description: 'Identifier type (e.g. email, ip)' })
  @ApiQuery({ name: 'value', required: true, description: 'Identifier value' })
  async getFraudDebug(
    @Query('type') type: string,
    @Query('value') value: string,
  ) {
    return this.service.getFraudProfileDebug(type, value);
  }

  @Get()
  @ApiOperation({
    summary: 'Search transactions enriched with fraud profile and page correlations',
  })
  async getTransactions(@Query() query: Record<string, unknown>) {
    return this.service.getTransactions(query);
  }
}
