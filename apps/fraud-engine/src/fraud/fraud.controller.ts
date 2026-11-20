import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateFraudRuleDto } from './dto/create-fraud-rule.dto';
import { FraudProfileQueryDto } from './dto/fraud-profile-query.dto';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
import { FraudConfigService } from './fraud-config.service';
import { FraudService } from './fraud.service';

@ApiTags('Fraud Analysis')
@Controller('fraud')
export class FraudController {
  constructor(
    private readonly fraudService: FraudService,
    private readonly fraudConfigService: FraudConfigService,
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Legacy health route',
    deprecated: true,
    description: 'Superseded by /health/live and /health/ready.',
  })
  health() {
    return this.fraudService.health();
  }

  @Get('relationships')
  getRelationships(@Query() query: FraudProfileQueryDto) {
    return this.fraudService.getRelationships(query);
  }

  @Get('network')
  @ApiOperation({
    summary: 'Identifier network around an identifier',
    description:
      'Breadth-first expansion on a node budget. Hub nodes are returned but ' +
      'not expanded through, and `truncated` is set when the network was ' +
      'larger than the budget allowed.',
  })
  getNetwork(@Query() query: FraudProfileQueryDto) {
    return this.fraudService.getNetwork(query);
  }

  @Get('risk-score')
  getRiskScore(@Query() query: FraudProfileQueryDto) {
    return this.fraudService.getRiskScore(query);
  }

  @Get('profile')
  getProfile(@Query() query: FraudProfileQueryDto) {
    return this.fraudService.getProfile(query);
  }

  @Get('config/features')
  getFeatureCatalog() {
    return this.fraudConfigService.getFeatures();
  }

  @Get('config/rules')
  getRulesConfig() {
    return this.fraudConfigService.getRules();
  }

  @Get('config/rules/:id')
  getRuleById(@Param('id', ParseIntPipe) id: number) {
    return this.fraudConfigService.getRuleById(id);
  }

  @Post('config/rules')
  @ApiOperation({
    summary: 'Create a detection rule',
    description:
      'The feature name is validated against the feature catalogue and the ' +
      'operator against what that feature supports, so a rule that could ' +
      'never evaluate cannot be stored.',
  })
  createRule(@Body() dto: CreateFraudRuleDto) {
    return this.fraudConfigService.createRule(dto);
  }

  @Patch('config/rules/:id')
  updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFraudRuleDto,
  ) {
    return this.fraudConfigService.updateRule(id, dto);
  }

  @Patch('config/rules/:id/enable')
  enableRule(@Param('id', ParseIntPipe) id: number) {
    return this.fraudConfigService.enableRule(id);
  }

  @Patch('config/rules/:id/disable')
  disableRule(@Param('id', ParseIntPipe) id: number) {
    return this.fraudConfigService.disableRule(id);
  }

  @Get('config/risk-levels')
  getRiskLevelsConfig() {
    return this.fraudService.getRiskLevelsConfig();
  }

  @Get('config/policies')
  getPoliciesConfig() {
    return this.fraudService.getPoliciesConfig();
  }
}
