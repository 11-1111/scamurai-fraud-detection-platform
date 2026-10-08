import type { InjectionKey } from "vue";
import { HttpTransactionRepository } from "../infrastructure/repositories/HttpTransactionRepository";
import { ListTransactions } from "../application/use-cases/ListTransactions";
import type { TransactionRepository } from "../application/ports/TransactionRepository";

export const TRANSACTION_REPO: InjectionKey<TransactionRepository> = Symbol("TRANSACTION_REPO");
export const LIST_TRANSACTIONS: InjectionKey<ListTransactions> = Symbol("LIST_TRANSACTIONS");

export function createTransactionsProviders() {
  const repo = new HttpTransactionRepository();
  const listTransactions = new ListTransactions(repo);

  return [
    [TRANSACTION_REPO, repo],
    [LIST_TRANSACTIONS, listTransactions],
  ] as const;
}
