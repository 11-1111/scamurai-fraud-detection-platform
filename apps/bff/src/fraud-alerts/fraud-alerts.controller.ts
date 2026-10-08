import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { FraudAlertsService } from './fraud-alerts.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { AssignAlertDto } from './dto/assign-alert.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { AddNoteDto } from './dto/add-note.dto';

@ApiTags('Fraud Alerts')
@Controller('bff/fraud/alerts')
export class FraudAlertsController {
  constructor(private readonly service: FraudAlertsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated fraud alert statistics' })
  getStats() {
    return this.service.getAlertStats();
  }

  @Get()
  @ApiOperation({ summary: 'List fraud alerts with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'pageSize', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'riskLevel', required: false, type: String })
  @ApiQuery({ name: 'decision', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'rootIdentifierType', required: false, type: String })
  @ApiQuery({ name: 'rootIdentifierValue', required: false, type: String })
  getAlerts(@Query() query: QueryAlertsDto) {
    return this.service.getAlerts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single fraud alert by ID' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  getAlert(@Param('id') id: string) {
    return this.service.getAlert(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get the action history for a fraud alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  getAlertHistory(@Param('id') id: string) {
    return this.service.getAlertHistory(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign a fraud alert to a user' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiBody({ type: AssignAlertDto })
  assignAlert(@Param('id') id: string, @Body() body: AssignAlertDto) {
    return this.service.assignAlert(id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the status of a fraud alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiBody({ type: UpdateStatusDto })
  updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    return this.service.updateAlertStatus(id, body);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve a fraud alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiBody({ type: ResolveAlertDto })
  resolveAlert(@Param('id') id: string, @Body() body: ResolveAlertDto) {
    return this.service.resolveAlert(id, body);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a fraud alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiBody({ type: AddNoteDto })
  addNote(@Param('id') id: string, @Body() body: AddNoteDto) {
    return this.service.addNote(id, body);
  }
}
