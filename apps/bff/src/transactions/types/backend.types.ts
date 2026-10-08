export interface BackendTransaction {
  date: string;
  paymentAccount: string | null;
  confirmation_code: string | null;

  merchant: {
    name: string;
    email?: string;
  };

  amount: {
    value: string;
    currency: string;
    payment_method?: string;
  };

  status: {
    text: string;
    type: string;
  };

  customer: {
    email?: string;
    phone?: string;
    ipAddress?: string;
  };

  orderTrackingId?: string;
  bankAuthCode?: string;
  deviceFingerprint?: string;
}

export interface BackendResponse {
  total_transactions: number;
  transactions: BackendTransaction[];
}
