import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';
import { RelatedIdentifiers } from '../types/fraud.types';

export interface FeatureContext {
  type: string;
  value: string;
  relatedIdentifiers: RelatedIdentifiers;
  transaction?: FraudTransactionEntity | null;
}
