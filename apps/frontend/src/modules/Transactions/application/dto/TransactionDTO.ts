export interface TransactionsResponseDTO {
    total_transactions: number;
    transactions: TransactionDTO[];
  }
  
  export interface TransactionDTO {
    date: string;
    merchant: { name: string; email: string };
    amount: {
      full: string;
      currency: string;
      value: string;
      payment_method: string;
    };
    payment_account: string;
    status: { text: string; type: string };
    customer: { name: string; email: string; ip_address: string };
    confirmation_code: string;
    merchant_ref: string;
    view_url: string;
    device_fingerprint?: string;
  }
  