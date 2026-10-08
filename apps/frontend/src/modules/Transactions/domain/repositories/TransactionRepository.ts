import type { Transaction } from "../entities/Transaction"

export interface TransactionRepository {
  list(): Promise<{ total: number; items: Transaction[] }>
}

// list(): Promise<Something>
// “list() will return Something, but not instantly. It will return it in the future.”
