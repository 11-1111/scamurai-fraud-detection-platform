import { Controller, Get, Param, Patch, Post, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { FraudConfigService } from './fraud-config.service';
import { CreateFraudRuleDto, UpdateFraudRuleDto } from './dto/create-rule.dto';

@ApiTags('Fraud Config')
@Controller('bff/fraud/config')
export class FraudConfigController {
  constructor(private readonly service: FraudConfigService) {}

  @Get('features')
  @ApiOperation({ summary: 'Get all available fraud feature definitions' })
  getFeatures() {
    return this.service.getFeatures();
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all fraud detection rules' })
  getRules() {
    return this.service.getRules();
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get a single fraud detection rule by ID' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  getRule(@Param('id') id: string) {
    return this.service.getRule(id);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a new fraud detection rule' })
  @ApiBody({ type: CreateFraudRuleDto })
  createRule(@Body() body: CreateFraudRuleDto) {
    return this.service.createRule(body);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a fraud detection rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiBody({ type: UpdateFraudRuleDto })
  updateRule(@Param('id') id: string, @Body() body: UpdateFraudRuleDto) {
    return this.service.updateRule(id, body);
  }

  @Patch('rules/:id/enable')
  @ApiOperation({ summary: 'Enable a fraud detection rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  enableRule(@Param('id') id: string) {
    return this.service.enableRule(id);
  }

  @Patch('rules/:id/disable')
  @ApiOperation({ summary: 'Disable a fraud detection rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  disableRule(@Param('id') id: string) {
    return this.service.disableRule(id);
  }

  @Get('risk-levels')
  @ApiOperation({ summary: 'Get fraud risk level definitions' })
  getRiskLevels() {
    return this.service.getRiskLevels();
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get fraud policy configurations' })
  getPolicies() {
    return this.service.getPolicies();
  }
}
