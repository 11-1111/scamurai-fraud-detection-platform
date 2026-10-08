import type {
    ListTransactionsParams,
    ListTransactionsResult,
    TransactionRepository,
} from "../ports/TransactionRepository";

export class ListTransactions {
    constructor(private readonly repo: TransactionRepository) { }

    execute(params: ListTransactionsParams): Promise<ListTransactionsResult> {
        return this.repo.list(params);
    }
}

// Its job is to define the action: “List transactions”, without caring where the data comes from (mock JSON, API, DB).