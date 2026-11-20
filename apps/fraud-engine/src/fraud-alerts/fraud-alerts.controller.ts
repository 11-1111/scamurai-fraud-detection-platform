import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddAlertNoteDto } from './dto/add-alert-note.dto';
import { AssignAlertDto } from './dto/assign-alert.dto';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { FraudAlertsService } from './fraud-alerts.service';

@ApiTags('Fraud Alerts')
@Controller('fraud/alerts')
export class FraudAlertsController {
  constructor(private readonly fraudAlertsService: FraudAlertsService) {}

  @Get()
  @ApiOperation({
    summary: 'List alerts',
    description: 'Paged, newest first. pageSize is capped at 100.',
  })
  listAlerts(@Query() query: ListAlertsQueryDto) {
    return this.fraudAlertsService.listAlerts(query);
  }

  @Get('stats')
  getStats() {
    return this.fraudAlertsService.getAlertStats();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.fraudAlertsService.getAlertById(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change the status of an alert',
    description:
      'Appended to the alert history, which is append-only: the record of ' +
      'who changed what is not rewritten.',
  })
  updateStatus(@Param('id') id: string, @Body() body: UpdateAlertStatusDto) {
    return this.fraudAlertsService.updateStatus(id, body.status, {
      comment: body.comment,
      performedBy: body.performedBy,
    });
  }

  @Patch(':id/assign')
  assignAlert(@Param('id') id: string, @Body() body: AssignAlertDto) {
    return this.fraudAlertsService.assignAlert(id, body.assignedTo, {
      comment: body.comment,
      performedBy: body.performedBy,
    });
  }

  @Patch(':id/resolve')
  @ApiOperation({
    summary: 'Resolve an alert',
    description:
      'The resolution is the label a precision measurement is computed ' +
      'from, so it is constrained to the known outcomes.',
  })
  resolveAlert(@Param('id') id: string, @Body() body: ResolveAlertDto) {
    return this.fraudAlertsService.resolveAlert(
      id,
      body.resolution,
      body.note,
      body.resolvedBy,
    );
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() body: AddAlertNoteDto) {
    return this.fraudAlertsService.addNote(id, body.note, body.createdBy);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.fraudAlertsService.getAlertHistory(id);
  }
}
