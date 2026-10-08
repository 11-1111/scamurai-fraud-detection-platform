import type {
    ListTransactionsParams,
    ListTransactionsResult,
    TransactionRepository,
  } from "../../application/ports/TransactionRepository";

  import type { TransactionsResponseDTO } from "../../application/dto/TransactionDTO";
  import { mapTransactionDTOToDomain } from "../../application/mappers/transactionMapper";

  import allData from "../mock/transactions.json";
  import pendingData from "../mock/PendingTranscations.json";
  import incomingData from "../mock/IncomingTransactions.json";
  import cardData from "../mock/CardTransactions.json";

  const MOCK_SOURCES: Record<"all" | "pending" | "incoming" | "card", TransactionsResponseDTO> = {
    all: allData as unknown as TransactionsResponseDTO,
    pending: pendingData as unknown as TransactionsResponseDTO,
    incoming: incomingData as unknown as TransactionsResponseDTO,
    card: cardData as unknown as TransactionsResponseDTO,
  };

  export class MockTransactionRepository implements TransactionRepository {
    async list(params: ListTransactionsParams): Promise<ListTransactionsResult> {
    const { page, pageSize, source = "all", filters } = params;
    const data = MOCK_SOURCES[source as keyof typeof MOCK_SOURCES];

    // Map all transactions to domain entities first
    let filtered = data.transactions.map(mapTransactionDTOToDomain);

    // Apply filters if provided
    if (filters) {
      filtered = filtered.filter((transaction) => {
        // Merchant Name filter (case-insensitive partial match)
        if (
          filters.merchantName &&
          !transaction.merchantName
            .toLowerCase()
            .includes(filters.merchantName.toLowerCase())
        ) {
          return false;
        }

        // Customer Email filter (case-insensitive partial match)
        if (
          filters.customerEmail &&
          !transaction.customerEmail
            .toLowerCase()
            .includes(filters.customerEmail.toLowerCase())
        ) {
          return false;
        }

        // Phone Number filter (case-insensitive partial match)
        if (filters.phoneNumber) {
          const phoneMatch =
            transaction.phoneNumber?.toLowerCase().includes(filters.phoneNumber.toLowerCase()) ||
            transaction.paymentAccount?.toLowerCase().includes(filters.phoneNumber.toLowerCase());
          if (!phoneMatch) {
            return false;
          }
        }

        // IP Address filter (case-insensitive partial match)
        if (
          filters.ipAddress &&
          !transaction.customerIp?.toLowerCase().includes(filters.ipAddress.toLowerCase())
        ) {
          return false;
        }

        // Confirmation Code filter (case-insensitive partial match)
        if (
          filters.confirmationCode &&
          !transaction.confirmationCode
            .toLowerCase()
            .includes(filters.confirmationCode.toLowerCase())
        ) {
          return false;
        }

        // Order Tracking ID filter (case-insensitive partial match)
        if (
          filters.orderTrackingId &&
          !transaction.orderTrackingId
            ?.toLowerCase()
            .includes(filters.orderTrackingId.toLowerCase())
        ) {
          return false;
        }

        // Order Number filter (case-insensitive partial match)
        if (
          filters.orderNumber &&
          !transaction.orderNumber
            ?.toLowerCase()
            .includes(filters.orderNumber.toLowerCase())
        ) {
          return false;
        }

        // Bank Auth Code filter (case-insensitive partial match)
        if (
          filters.bankAuthCode &&
          !transaction.bankAuthCode
            ?.toLowerCase()
            .includes(filters.bankAuthCode.toLowerCase())
        ) {
          return false;
        }

        // Device Fingerprint filter (case-insensitive partial match)
        if (
          filters.deviceFingerprint &&
          !transaction.deviceFingerprint
            ?.toLowerCase()
            .includes(filters.deviceFingerprint.toLowerCase())
        ) {
          return false;
        }

        // Date From filter
        if (filters.dateFrom) {
          const transactionDate = new Date(transaction.date);
          const fromDate = new Date(filters.dateFrom);
          if (transactionDate < fromDate) {
            return false;
          }
        }

        // Date To filter
        if (filters.dateTo) {
          const transactionDate = new Date(transaction.date);
          const toDate = new Date(filters.dateTo);
          // Set to end of day for inclusive comparison
          toDate.setHours(23, 59, 59, 999);
          if (transactionDate > toDate) {
            return false;
          }
        }

        return true;
      });
    }

    // Calculate pagination
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end);

    return {
      total,
      items,
      pageCorrelations: {
        scope: "CURRENT_PAGE",
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      },
      fraudProfile: null,
    };
  }
  }
  