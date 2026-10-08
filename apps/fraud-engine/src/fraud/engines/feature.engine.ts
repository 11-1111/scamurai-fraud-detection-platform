import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FraudIdentifierEntity } from '../../database/entities/fraud-identifier.entity';
import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';
import { FeatureCalculator } from '../features/feature-calculator.interface';
import { sortFeatureCalculators } from '../features/feature-calculator.sort';
import { FeatureContext } from '../features/feature-context';
import { FEATURE_CALCULATORS } from '../features/feature-registry';
import { FeatureUtilsService } from '../features/feature-utils.service';
import {
  CalculatedFeature,
  FeatureCalculationResult,
  FraudFeatureValue,
  FraudFeatures,
} from '../types/fraud.types';

const BASELINE_FEATURE_META: Record<
  string,
  { label: string; description: string; unit?: string }
> = {
  emailCount: {
    label: 'Related email count',
    description: 'Number of related email identifiers.',
    unit: 'accounts',
  },
  phoneCount: {
    label: 'Related phone count',
    description: 'Number of related phone identifiers.',
    unit: 'accounts',
  },
  ipCount: {
    label: 'Related IP count',
    description: 'Number of related IP identifiers.',
    unit: 'accounts',
  },
  paymentAccountCount: {
    label: 'Related payment account count',
    description: 'Number of related payment accounts.',
    unit: 'accounts',
  },
  fingerprintCount: {
    label: 'Related device fingerprint count',
    description: 'Number of related device fingerprints.',
    unit: 'accounts',
  },
  merchantCount: {
    label: 'Related merchant count',
    description: 'Number of related merchants.',
    unit: 'accounts',
  },
  confirmationCodeCount: {
    label: 'Related confirmation code count',
    description: 'Number of related confirmation codes.',
    unit: 'accounts',
  },
  orderTrackingIdCount: {
    label: 'Related order tracking ID count',
    description: 'Number of related order tracking IDs.',
    unit: 'accounts',
  },
  bankAuthCodeCount: {
    label: 'Related bank auth code count',
    description: 'Number of related bank auth codes.',
    unit: 'accounts',
  },
  uniqueEmailsLinked: {
    label: 'Unique emails linked',
    description: 'Unique emails linked to the root identifier network.',
    unit: 'accounts',
  },
  uniqueEmailsPerPaymentAccount: {
    label: 'Unique emails per payment account',
    description: 'Unique emails linked when payment accounts are present.',
    unit: 'accounts',
  },
  uniqueEmailsPerIp: {
    label: 'Unique emails per IP',
    description: 'Unique emails linked when IPs are present.',
    unit: 'accounts',
  },
  transactionCount: {
    label: 'Related transaction count',
    description: 'Total related transactions for the identifier.',
    unit: 'transactions',
  },
  failedTransactionCount: {
    label: 'Failed transaction count',
    description: 'Failed related transactions for the identifier.',
    unit: 'transactions',
  },
  successfulTransactionCount: {
    label: 'Successful transaction count',
    description: 'Successful related transactions for the identifier.',
    unit: 'transactions',
  },
  totalAmountValue: {
    label: 'Total amount value',
    description: 'Sum of related transaction amounts.',
    unit: 'ratio',
  },
  averageAmountValue: {
    label: 'Average amount value',
    description: 'Average related transaction amount.',
    unit: 'ratio',
  },
};

@Injectable()
export class FeatureEngine {
  private readonly logger = new Logger(FeatureEngine.name);
  private readonly sortedCalculators: FeatureCalculator[];

  constructor(
    @InjectRepository(FraudTransactionEntity, 'fraud')
    private readonly fraudTransactionRepo: Repository<FraudTransactionEntity>,
    @InjectRepository(FraudIdentifierEntity, 'fraud')
    private readonly fraudIdentifierRepo: Repository<FraudIdentifierEntity>,
    private readonly utils: FeatureUtilsService,
    @Inject(FEATURE_CALCULATORS)
    calculators: FeatureCalculator[],
  ) {
    this.sortedCalculators = sortFeatureCalculators(calculators);
  }

  async calculateFeatures(
    input: FeatureContext,
  ): Promise<FeatureCalculationResult> {
    const calculatedAt = new Date();
    const baseline = await this.calculateBaselineFeatures(input);
    const calculatedFeatures: CalculatedFeature[] = [];

    for (const [name, value] of Object.entries(baseline)) {
      const meta = BASELINE_FEATURE_META[name];
      calculatedFeatures.push({
        name,
        label: meta?.label ?? name,
        description: meta?.description,
        category: 'General',
        value,
        unit: meta?.unit,
        calculatedAt,
      });
    }

    for (const calculator of this.sortedCalculators) {
      let value: FraudFeatureValue = calculator.defaultValue;

      try {
        value = await calculator.calculate(input);
      } catch (error) {
        value = calculator.defaultValue;
        this.logger.error(
          `Feature "${calculator.featureName}" calculation failed: ${
            (error as Error).message
          }. Using defaultValue=${String(calculator.defaultValue)}.`,
        );
      }

      calculatedFeatures.push({
        name: calculator.featureName,
        label: calculator.label,
        description: calculator.description,
        category: calculator.category,
        value,
        unit: calculator.unit,
        windowSeconds: calculator.windowSeconds,
        calculatedAt,
      });
    }

    const featureMap = Object.fromEntries(
      calculatedFeatures.map((feature) => [feature.name, feature.value]),
    );

    return {
      calculatedFeatures,
      featureMap,
    };
  }

  private async calculateBaselineFeatures(
    input: FeatureContext,
  ): Promise<FraudFeatures> {
    const type = input.type;
    const value = input.value;
    const relatedIdentifiers = input.relatedIdentifiers;

    const emailCount = relatedIdentifiers.emails.length;
    const phoneCount = relatedIdentifiers.phones.length;
    const ipCount = relatedIdentifiers.ips.length;
    const paymentAccountCount = relatedIdentifiers.paymentAccounts.length;
    const fingerprintCount = relatedIdentifiers.fingerprints.length;
    const merchantCount = relatedIdentifiers.merchants.length;
    const confirmationCodeCount = relatedIdentifiers.confirmationCodes.length;
    const orderTrackingIdCount = relatedIdentifiers.orderTrackingIds.length;
    const bankAuthCodeCount = relatedIdentifiers.bankAuthCodes.length;

    const uniqueEmailsLinked =
      emailCount + (type.trim().toLowerCase() === 'email' ? 1 : 0);
    const uniqueEmailsPerPaymentAccount =
      paymentAccountCount > 0 ? uniqueEmailsLinked : 0;
    const uniqueEmailsPerIp = ipCount > 0 ? uniqueEmailsLinked : 0;

    const transactionIds = await this.getRelatedTransactionIds(type, value);
    if (transactionIds.length === 0) {
      return {
        emailCount,
        phoneCount,
        ipCount,
        paymentAccountCount,
        fingerprintCount,
        merchantCount,
        confirmationCodeCount,
        orderTrackingIdCount,
        bankAuthCodeCount,
        uniqueEmailsLinked,
        uniqueEmailsPerPaymentAccount,
        uniqueEmailsPerIp,
        transactionCount: 0,
        failedTransactionCount: 0,
        successfulTransactionCount: 0,
        totalAmountValue: 0,
        averageAmountValue: 0,
      };
    }

    const transactions = await this.fraudTransactionRepo.find({
      where: { id: In(transactionIds) },
    });

    const transactionCount = transactions.length;
    let failedTransactionCount = 0;
    let successfulTransactionCount = 0;
    let totalAmountValue = 0;

    for (const relatedTransaction of transactions) {
      const statusText = relatedTransaction.statusText ?? '';
      const statusType = relatedTransaction.statusType ?? '';
      if (this.utils.isFailedStatus(statusText, statusType)) {
        failedTransactionCount += 1;
      }
      if (this.utils.isSuccessfulStatus(statusText, statusType)) {
        successfulTransactionCount += 1;
      }
      totalAmountValue += Number(relatedTransaction.amountValue ?? 0);
    }

    const averageAmountValue =
      transactionCount > 0 ? totalAmountValue / transactionCount : 0;

    return {
      emailCount,
      phoneCount,
      ipCount,
      paymentAccountCount,
      fingerprintCount,
      merchantCount,
      confirmationCodeCount,
      orderTrackingIdCount,
      bankAuthCodeCount,
      uniqueEmailsLinked,
      uniqueEmailsPerPaymentAccount,
      uniqueEmailsPerIp,
      transactionCount,
      failedTransactionCount,
      successfulTransactionCount,
      totalAmountValue,
      averageAmountValue,
    };
  }

  private async getRelatedTransactionIds(
    type: string,
    value: string,
  ): Promise<string[]> {
    const normalizedType = type.trim().toLowerCase();
    const normalizedValue = value.trim();

    const rows = await this.fraudIdentifierRepo
      .createQueryBuilder('fi')
      .select('DISTINCT fi.transaction_id', 'transactionId')
      .where('fi.identifier_type = :type', { type: normalizedType })
      .andWhere('fi.identifier_value = :value', { value: normalizedValue })
      .getRawMany<{ transactionId: string }>();

    return rows
      .map((row) => row.transactionId)
      .filter((transactionId): transactionId is string =>
        Boolean(transactionId),
      );
  }
}
