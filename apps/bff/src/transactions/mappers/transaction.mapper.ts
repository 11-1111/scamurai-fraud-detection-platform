import { toUtcIsoString } from '../../common/utils/date.util';
import { BackendTransaction } from '../types/backend.types';

export function mapBackendTransaction(
  transaction: BackendTransaction,
): BackendTransaction {
  const normalizedDate = toUtcIsoString(transaction.date);

  return {
    ...transaction,
    date: normalizedDate ?? transaction.date,
  };
}

export function mapBackendTransactions(
  transactions: BackendTransaction[],
): BackendTransaction[] {
  return transactions.map(mapBackendTransaction);
}
