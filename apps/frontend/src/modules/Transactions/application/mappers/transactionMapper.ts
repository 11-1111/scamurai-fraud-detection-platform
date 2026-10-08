import type { TransactionDTO } from "../dto/TransactionDTO";
import type { Transaction, TransactionStatusType } from "../../domain/entities/Transaction";

const toStatusType = (t: string | null | undefined): TransactionStatusType => {
  if (t === "danger" || t === "success" || t === "warning" || t === "info") return t;
  if (t === "failed") return "danger";
  return "info";
};

// Extract tracking ID from view URL
const extractTrackingId = (url: string): string | undefined => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("trackingId") || undefined;
  } catch {
    return undefined;
  }
};

export const mapTransactionDTOToDomain = (dto: TransactionDTO): Transaction => ({
  date: dto.date ?? "",
  merchantName: dto.merchant?.name ?? "",
  merchantEmail: dto.merchant?.email ?? "",

  amountFull: dto.amount?.full ?? "",
  currency: dto.amount?.currency ?? "",
  amountValue: Number(dto.amount?.value ?? 0),
  paymentMethod: dto.amount?.payment_method ?? "",

  paymentAccount: dto.payment_account ?? "",

  statusText: dto.status?.text ?? "",
  statusType: toStatusType(dto.status?.type),

  customerName: dto.customer?.name ?? "",
  customerEmail: dto.customer?.email ?? "",
  customerIp: dto.customer?.ip_address ?? "",

  confirmationCode: dto.confirmation_code ?? "",
  merchantRef: dto.merchant_ref ?? "",
  viewUrl: dto.view_url ?? "",
  orderTrackingId: extractTrackingId(dto.view_url ?? ""),
  orderNumber: dto.merchant_ref ?? "",
  phoneNumber: undefined,
  bankAuthCode: undefined,
  deviceFingerprint: dto.device_fingerprint ?? undefined,
});
