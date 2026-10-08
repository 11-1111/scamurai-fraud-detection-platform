import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FraudConfigController } from './fraud-config.controller';
import { FraudConfigService } from './fraud-config.service';

const mockService = () => ({
  getFeatures: jest.fn(),
  getRules: jest.fn(),
  getRule: jest.fn(),
  createRule: jest.fn(),
  updateRule: jest.fn(),
  enableRule: jest.fn(),
  disableRule: jest.fn(),
  getRiskLevels: jest.fn(),
  getPolicies: jest.fn(),
});

describe('FraudConfigController', () => {
  let controller: FraudConfigController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    service = mockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FraudConfigController],
      providers: [{ provide: FraudConfigService, useValue: service }],
    }).compile();

    controller = module.get<FraudConfigController>(FraudConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── GET /bff/fraud/config/features ────────────────────────────────────────

  describe('getFeatures', () => {
    it('returns features on success', async () => {
      const features = [{ name: 'email_tx_count_7d' }];
      service.getFeatures.mockResolvedValueOnce(features);

      expect(await controller.getFeatures()).toEqual(features);
      expect(service.getFeatures).toHaveBeenCalled();
    });

    it('propagates BadGatewayException (502)', async () => {
      service.getFeatures.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getFeatures()).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── GET /bff/fraud/config/rules ───────────────────────────────────────────

  describe('getRules', () => {
    it('returns rules on success', async () => {
      const rules = [{ ruleCode: 'EMAIL_MANY_IPS' }];
      service.getRules.mockResolvedValueOnce(rules);

      expect(await controller.getRules()).toEqual(rules);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.getRules.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getRules()).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── GET /bff/fraud/config/rules/:id ───────────────────────────────────────

  describe('getRule', () => {
    it('returns single rule on success', async () => {
      const rule = { id: '42', ruleCode: 'EMAIL_MANY_IPS' };
      service.getRule.mockResolvedValueOnce(rule);

      expect(await controller.getRule('42')).toEqual(rule);
      expect(service.getRule).toHaveBeenCalledWith('42');
    });

    it('propagates NotFoundException (404)', async () => {
      service.getRule.mockRejectedValueOnce(new NotFoundException('Resource not found.'));

      await expect(controller.getRule('999')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.getRule.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getRule('42')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── POST /bff/fraud/config/rules ──────────────────────────────────────────

  describe('createRule', () => {
    it('proxies body and returns created rule on success', async () => {
      const body = { ruleCode: 'NEW_RULE', featureName: 'email_tx_count_7d' };
      const created = { id: '99', ...body };
      service.createRule.mockResolvedValueOnce(created);

      expect(await controller.createRule(body)).toEqual(created);
      expect(service.createRule).toHaveBeenCalledWith(body);
    });

    it('propagates BadRequestException when fraud service returns validation error (400)', async () => {
      service.createRule.mockRejectedValueOnce(
        new BadRequestException('ruleCode must not be empty'),
      );

      await expect(controller.createRule({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.createRule.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.createRule({})).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── PATCH /bff/fraud/config/rules/:id ────────────────────────────────────

  describe('updateRule', () => {
    it('proxies body and returns updated rule on success', async () => {
      const body = { scoreImpact: 30 };
      const updated = { id: '42', ruleCode: 'EMAIL_MANY_IPS', scoreImpact: 30 };
      service.updateRule.mockResolvedValueOnce(updated);

      expect(await controller.updateRule('42', body)).toEqual(updated);
      expect(service.updateRule).toHaveBeenCalledWith('42', body);
    });

    it('propagates NotFoundException (404)', async () => {
      service.updateRule.mockRejectedValueOnce(new NotFoundException('Resource not found.'));

      await expect(controller.updateRule('999', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadRequestException when fraud service returns validation error', async () => {
      service.updateRule.mockRejectedValueOnce(
        new BadRequestException('scoreImpact must be a number'),
      );

      await expect(controller.updateRule('42', { scoreImpact: 'bad' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('propagates BadGatewayException (502)', async () => {
      service.updateRule.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.updateRule('42', {})).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── PATCH /bff/fraud/config/rules/:id/enable ─────────────────────────────

  describe('enableRule', () => {
    it('enables rule and returns response on success', async () => {
      const result = { id: '42', enabled: true };
      service.enableRule.mockResolvedValueOnce(result);

      expect(await controller.enableRule('42')).toEqual(result);
      expect(service.enableRule).toHaveBeenCalledWith('42');
    });

    it('propagates NotFoundException (404)', async () => {
      service.enableRule.mockRejectedValueOnce(new NotFoundException('Resource not found.'));

      await expect(controller.enableRule('999')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.enableRule.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.enableRule('42')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── PATCH /bff/fraud/config/rules/:id/disable ────────────────────────────

  describe('disableRule', () => {
    it('disables rule and returns response on success', async () => {
      const result = { id: '42', enabled: false };
      service.disableRule.mockResolvedValueOnce(result);

      expect(await controller.disableRule('42')).toEqual(result);
      expect(service.disableRule).toHaveBeenCalledWith('42');
    });

    it('propagates NotFoundException (404)', async () => {
      service.disableRule.mockRejectedValueOnce(new NotFoundException('Resource not found.'));

      await expect(controller.disableRule('999')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.disableRule.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.disableRule('42')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── GET /bff/fraud/config/risk-levels ────────────────────────────────────

  describe('getRiskLevels', () => {
    it('returns risk levels on success', async () => {
      const levels = [{ level: 'HIGH', minScore: 70 }];
      service.getRiskLevels.mockResolvedValueOnce(levels);

      expect(await controller.getRiskLevels()).toEqual(levels);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.getRiskLevels.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getRiskLevels()).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ── GET /bff/fraud/config/policies ───────────────────────────────────────

  describe('getPolicies', () => {
    it('returns policies on success', async () => {
      const policies = [{ policyCode: 'EMAIL_MANY_IPS_REVIEW' }];
      service.getPolicies.mockResolvedValueOnce(policies);

      expect(await controller.getPolicies()).toEqual(policies);
    });

    it('propagates BadGatewayException (502)', async () => {
      service.getPolicies.mockRejectedValueOnce(
        new BadGatewayException('Fraud service unavailable.'),
      );

      await expect(controller.getPolicies()).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});
