export interface FraudNodeStyle {
  container: string;
  typeText: string;
  labelText: string;
  legendDot: string;
  legendLabel: string;
}

const UNKNOWN_STYLE: FraudNodeStyle = {
  container:
    "border-slate-300/80 bg-slate-50 dark:border-slate-500/50 dark:bg-slate-900/60",
  typeText: "text-slate-600 dark:text-slate-300",
  labelText: "text-slate-800 dark:text-slate-100",
  legendDot: "bg-slate-400",
  legendLabel: "Unknown",
};

const styles: Record<string, FraudNodeStyle> = {
  Transaction: {
    container:
      "border-blue-300/80 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-950/40",
    typeText: "text-blue-700 dark:text-blue-300",
    labelText: "text-blue-900 dark:text-blue-100",
    legendDot: "bg-blue-500",
    legendLabel: "Transaction",
  },
  Email: {
    container:
      "border-emerald-300/80 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-950/40",
    typeText: "text-emerald-700 dark:text-emerald-300",
    labelText: "text-emerald-900 dark:text-emerald-100",
    legendDot: "bg-emerald-500",
    legendLabel: "Email",
  },
  Phone: {
    container:
      "border-cyan-300/80 bg-cyan-50 dark:border-cyan-500/50 dark:bg-cyan-950/40",
    typeText: "text-cyan-700 dark:text-cyan-300",
    labelText: "text-cyan-900 dark:text-cyan-100",
    legendDot: "bg-cyan-500",
    legendLabel: "Phone",
  },
  IP: {
    container:
      "border-purple-300/80 bg-purple-50 dark:border-purple-500/50 dark:bg-purple-950/40",
    typeText: "text-purple-700 dark:text-purple-300",
    labelText: "text-purple-900 dark:text-purple-100",
    legendDot: "bg-purple-500",
    legendLabel: "IP",
  },
  PaymentAccount: {
    container:
      "border-orange-300/80 bg-orange-50 dark:border-orange-500/50 dark:bg-orange-950/40",
    typeText: "text-orange-700 dark:text-orange-300",
    labelText: "text-orange-900 dark:text-orange-100",
    legendDot: "bg-orange-500",
    legendLabel: "Payment Account",
  },
  DeviceFingerprint: {
    container:
      "border-yellow-300/80 bg-yellow-50 dark:border-yellow-500/50 dark:bg-yellow-950/40",
    typeText: "text-yellow-800 dark:text-yellow-300",
    labelText: "text-yellow-900 dark:text-yellow-100",
    legendDot: "bg-yellow-400",
    legendLabel: "Device",
  },
  Merchant: {
    container:
      "border-pink-300/80 bg-pink-50 dark:border-pink-500/50 dark:bg-pink-950/40",
    typeText: "text-pink-700 dark:text-pink-300",
    labelText: "text-pink-900 dark:text-pink-100",
    legendDot: "bg-pink-500",
    legendLabel: "Merchant",
  },
  Unknown: UNKNOWN_STYLE,
};

export function getNodeStyle(type: string): FraudNodeStyle {
  return styles[type] ?? UNKNOWN_STYLE;
}

export const LEGEND_ITEMS: FraudNodeStyle[] = [
  styles.Transaction,
  styles.Email,
  styles.IP,
  styles.PaymentAccount,
  styles.DeviceFingerprint,
  styles.Merchant,
  styles.Phone,
].filter((item): item is FraudNodeStyle => item != null);
