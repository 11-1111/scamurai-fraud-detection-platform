import { PageCorrelations } from './correlation.dto';
import { FraudProfile } from './fraud-profile.dto';
import { BackendTransaction } from '../types/backend.types';
import { FraudSummaryDto } from '../../fraud/dto/fraud.dto';

export interface TransactionsResponseDto {
  page: number;
  pageSize: number;
  total: number;
  transactions: BackendTransaction[];
  pageCorrelations: PageCorrelations;
  fraudProfile: FraudProfile | null;
  fraudSummary: FraudSummaryDto | null;
}
