import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FraudAlertsController } from './fraud-alerts.controller';
import { FraudAlertsService } from './fraud-alerts.service';

const mockService = () => ({
  getAlerts: jest.fn(),
  getAlertStats: jest.fn(),
  getAlert: jest.fn(),
  getAlertHistory: jest.fn(),
  assignAlert: jest.fn(),
  updateAlertStatus: jest.fn(),
  resolveAlert: jest.fn(),
  addNote: jest.fn(),
});

describe('FraudAlertsController', () => {
  let controller: FraudAlertsController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    service = mockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FraudAlertsController],
      providers: [{ provide: FraudAlertsService, useValue: service }],
    }).compile();

    controller = module.get<FraudAlertsController>(FraudAlertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── GET /bff/fraud/alerts ─────────────────────────────────────────────────

  describe('getAlerts', () => {
    it('delegates to service and returns payload on success', async () => {
      const payload = { data: [{ id: 'a1' }], total: 1 };
      service.getAlerts.mockResolvedValueOnce(payload);

      const result = await controller.getAlerts({ status: 'OPEN' });

      expect(service.getAlerts).toHaveBeenCalledWith({ status: 'OPEN' });
      expect(result).toEqual(payload);
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.getAlerts.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getAlerts({})).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  // ── GET /bff/fraud/alerts/stats ───────────────────────────────────────────

  describe('getStats', () => {
    it('delegates to service and returns stats on success', async () => {
      const stats = { total: 5, open: 3 };
      service.getAlertStats.mockResolvedValueOnce(stats);

      const result = await controller.getStats();

      expect(service.getAlertStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.getAlertStats.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getStats()).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  // ── GET /bff/fraud/alerts/:id ─────────────────────────────────────────────

  describe('getAlert', () => {
    it('returns alert on success', async () => {
      const alert = { id: 'abc-123', status: 'OPEN' };
      service.getAlert.mockResolvedValueOnce(alert);

      const result = await controller.getAlert('abc-123');

      expect(service.getAlert).toHaveBeenCalledWith('abc-123');
      expect(result).toEqual(alert);
    });

    it('propagates NotFoundException from service (404)', async () => {
      service.getAlert.mockRejectedValueOnce(new NotFoundException('Alert not found.'));

      await expect(controller.getAlert('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.getAlert.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getAlert('abc-123')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  // ── GET /bff/fraud/alerts/:id/history ────────────────────────────────────

  describe('getAlertHistory', () => {
    it('returns history array on success', async () => {
      const history = [
        {
          id: 1,
          actionType: 'STATUS_CHANGE',
          previousStatus: 'OPEN',
          newStatus: 'IN_REVIEW',
          performedBy: 'analyst',
          createdAt: '2026-07-06T10:00:00Z',
        },
      ];
      service.getAlertHistory.mockResolvedValueOnce(history);

      const result = await controller.getAlertHistory('abc-123');

      expect(service.getAlertHistory).toHaveBeenCalledWith('abc-123');
      expect(result).toEqual(history);
    });

    it('propagates NotFoundException from service (404)', async () => {
      service.getAlertHistory.mockRejectedValueOnce(
        new NotFoundException('Alert not found.'),
      );

      await expect(controller.getAlertHistory('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.getAlertHistory.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getAlertHistory('abc-123')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  // ── PATCH /bff/fraud/alerts/:id/assign ───────────────────────────────────

  describe('assignAlert', () => {
    it('delegates to service on success', async () => {
      const response = { id: 'abc-123', assignedTo: 'analyst@co.com' };
      service.assignAlert.mockResolvedValueOnce(response);

      const result = await controller.assignAlert('abc-123', { assignedTo: 'analyst@co.com' });

      expect(service.assignAlert).toHaveBeenCalledWith('abc-123', {
        assignedTo: 'analyst@co.com',
      });
      expect(result).toEqual(response);
    });

    it('propagates NotFoundException from service (404)', async () => {
      service.assignAlert.mockRejectedValueOnce(new NotFoundException('Alert not found.'));

      await expect(
        controller.assignAlert('missing', { assignedTo: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.assignAlert.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(
        controller.assignAlert('abc-123', { assignedTo: 'x' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── PATCH /bff/fraud/alerts/:id/status ───────────────────────────────────

  describe('updateStatus', () => {
    it('delegates to service on success', async () => {
      const response = { id: 'abc-123', status: 'IN_REVIEW' };
      service.updateAlertStatus.mockResolvedValueOnce(response);

      const result = await controller.updateStatus('abc-123', { status: 'IN_REVIEW' });

      expect(service.updateAlertStatus).toHaveBeenCalledWith('abc-123', {
        status: 'IN_REVIEW',
      });
      expect(result).toEqual(response);
    });

    it('propagates NotFoundException from service (404)', async () => {
      service.updateAlertStatus.mockRejectedValueOnce(
        new NotFoundException('Alert not found.'),
      );

      await expect(
        controller.updateStatus('missing', { status: 'OPEN' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.updateAlertStatus.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(
        controller.updateStatus('abc-123', { status: 'OPEN' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── PATCH /bff/fraud/alerts/:id/resolve ──────────────────────────────────

  describe('resolveAlert', () => {
    it('delegates to service with resolve body on success', async () => {
      const response = { id: 'abc-123', status: 'RESOLVED' };
      service.resolveAlert.mockResolvedValueOnce(response);

      const body = { resolution: 'FALSE_POSITIVE', note: 'Verified safe', resolvedBy: 'analyst' };
      const result = await controller.resolveAlert('abc-123', body);

      expect(service.resolveAlert).toHaveBeenCalledWith('abc-123', body);
      expect(result).toEqual(response);
    });

    it('delegates to service with only required resolution field', async () => {
      const response = { id: 'abc-123', status: 'RESOLVED' };
      service.resolveAlert.mockResolvedValueOnce(response);

      const result = await controller.resolveAlert('abc-123', { resolution: 'CONFIRMED_FRAUD' });

      expect(service.resolveAlert).toHaveBeenCalledWith('abc-123', { resolution: 'CONFIRMED_FRAUD' });
      expect(result).toEqual(response);
    });

    it('propagates NotFoundException from service (404)', async () => {
      service.resolveAlert.mockRejectedValueOnce(new NotFoundException('Alert not found.'));

      await expect(
        controller.resolveAlert('missing', { resolution: 'FALSE_POSITIVE' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.resolveAlert.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(
        controller.resolveAlert('abc-123', { resolution: 'FALSE_POSITIVE' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── POST /bff/fraud/alerts/:id/notes ─────────────────────────────────────

  describe('addNote', () => {
    it('delegates to service on success', async () => {
      const noteResponse = { id: 'n1', note: 'Confirmed fraud' };
      service.addNote.mockResolvedValueOnce(noteResponse);

      const result = await controller.addNote('abc-123', { note: 'Confirmed fraud' });

      expect(service.addNote).toHaveBeenCalledWith('abc-123', { note: 'Confirmed fraud' });
      expect(result).toEqual(noteResponse);
    });

    it('delegates to service with optional createdBy', async () => {
      const noteResponse = { id: 'n2', note: 'Verified', createdBy: 'analyst' };
      service.addNote.mockResolvedValueOnce(noteResponse);

      const result = await controller.addNote('abc-123', { note: 'Verified', createdBy: 'analyst' });

      expect(service.addNote).toHaveBeenCalledWith('abc-123', {
        note: 'Verified',
        createdBy: 'analyst',
      });
      expect(result).toEqual(noteResponse);
    });

    it('propagates NotFoundException from service (404)', async () => {
      service.addNote.mockRejectedValueOnce(new NotFoundException('Alert not found.'));

      await expect(
        controller.addNote('missing', { note: 'note' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException from service (502)', async () => {
      service.addNote.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(
        controller.addNote('abc-123', { note: 'note' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});
