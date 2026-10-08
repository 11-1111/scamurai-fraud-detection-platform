export interface CorrelatedIdentifier {
  value: string;
  count: number;
}

export interface PageCorrelations {
  scope: 'CURRENT_PAGE';
  emails: CorrelatedIdentifier[];
  phones: CorrelatedIdentifier[];
  ips: CorrelatedIdentifier[];
  paymentAccounts: CorrelatedIdentifier[];
  fingerprints: CorrelatedIdentifier[];
}
