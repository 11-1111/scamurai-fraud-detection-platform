import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';

import { FraudConfigService } from './fraud-config.service';
import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';
import { CreateFraudRuleDto } from './dto/create-rule.dto';

describe('FraudConfigService', () => {
  let service: FraudConfigService;
  let fraudClient: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
  };

  beforeEach(async () => {
    fraudClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudConfigService,
        { provide: FraudServiceClient, useValue: fraudClient },
      ],
    }).compile();

    service = module.get(FraudConfigService);
  });

  it('maps rules from upstream response', async () => {
    fraudClient.get.mockResolvedValueOnce([
      {
        id: 1,
        ruleCode: 'EMAIL_MANY_IPS',
        ruleName: 'Email linked to many IPs',
        featureName: 'uniqueIpsLinked',
        operator: '>',
        thresholdValue: 5,
        severity: 'HIGH',
        scoreImpact: 25,
        isEnabled: true,
        createdAt: '2026-08-03T10:00:00.000Z',
      },
    ]);

    const rules = await service.getRules();
    expect(rules[0].ruleCode).toBe('EMAIL_MANY_IPS');
  });

  it('forwards rule creation body unchanged', async () => {
    const body: CreateFraudRuleDto = {
      ruleCode: 'NEW_RULE',
      ruleName: 'New Rule',
      featureName: 'uniqueIpsLinked',
      operator: '>',
      thresholdValue: 5,
      severity: 'HIGH',
      scoreImpact: 25,
    };

    fraudClient.post.mockResolvedValueOnce({
      id: 99,
      ...body,
      isEnabled: true,
      createdAt: '2026-08-03T10:00:00.000Z',
    });

    await service.createRule(body);

    expect(fraudClient.post).toHaveBeenCalledWith('/fraud/config/rules', {
      body,
    });
  });

  it('propagates NotFoundException for missing rules', async () => {
    fraudClient.get.mockRejectedValueOnce(new NotFoundException('Resource not found.'));

    await expect(service.getRule('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propagates BadGatewayException for unexpected upstream failures', async () => {
    fraudClient.get.mockRejectedValueOnce(
      new BadGatewayException('Fraud service returned an unexpected error.'),
    );

    await expect(service.getRules()).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('CreateFraudRuleDto validation', () => {
  it('rejects invalid operators', async () => {
    const dto = Object.assign(new CreateFraudRuleDto(), {
      ruleCode: 'NEW_RULE',
      ruleName: 'New Rule',
      featureName: 'uniqueIpsLinked',
      operator: 'INVALID',
      thresholdValue: 5,
      severity: 'HIGH',
      scoreImpact: 25,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'operator')).toBe(true);
  });

  it('rejects scoreImpact outside 0-100', async () => {
    const dto = Object.assign(new CreateFraudRuleDto(), {
      ruleCode: 'NEW_RULE',
      ruleName: 'New Rule',
      featureName: 'uniqueIpsLinked',
      operator: '>',
      thresholdValue: 5,
      severity: 'HIGH',
      scoreImpact: 150,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'scoreImpact')).toBe(true);
  });
});
