import type { ColumnDef } from "@tanstack/vue-table";
import type { Transaction } from "../../domain/entities/Transaction";

import { h } from "vue";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-vue-next";
import FraudSummaryBadge from "./FraudSummaryBadge.vue";
import { splitDateTime } from "@/lib/formatDateTime";

const getStatusClasses = (statusType: string | undefined): string => {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-[#374151]";
  switch (statusType) {
    case "danger":
    case "failed":
      return `${baseClasses} bg-[#F0E7E7]`;
    case "warning":
      return `${baseClasses} bg-[#E7EAF0]`;
    case "pending":
      return `${baseClasses} bg-[#F9FCF8]`;
    case "success":
      return `${baseClasses} bg-[#E6EDE3]`;
    default:
      return `${baseClasses} bg-[#DFE2F0]`;
  }
};

export interface TransactionColumnsOptions {
  onView: (transaction: Transaction) => void;
}

export function createTransactionColumns(
  options: TransactionColumnsOptions
): ColumnDef<Transaction>[] {
  return [
    {
      id: "date",
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const { date, time } = splitDateTime(row.original.date);
        return h("div", { class: "flex flex-col min-w-[110px]" }, [
          h("p", { class: "font-semibold text-gray-900 dark:text-slate-100 whitespace-nowrap" }, date),
          time
            ? h("p", { class: "text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap mt-0.5" }, time)
            : null,
        ]);
      },
      enableHiding: false,
    },
    {
      id: "fraudSummary",
      accessorFn: (row) => row.fraudSummary?.riskLevel ?? "",
      header: "Fraud",
      cell: ({ row }) => h(FraudSummaryBadge, { summary: row.original.fraudSummary }),
      enableHiding: false,
    },
    {
      id: "merchantName",
      accessorKey: "merchantName",
      header: "Merchant",
      cell: ({ row }) =>
        h("div", { class: "flex flex-col min-w-[120px]" }, [
          h("span", { class: "font-bold text-[#16659E]" }, row.original.merchantName || "—"),
          h("span", { class: "text-xs text-slate-500 truncate max-w-[160px]" }, row.original.merchantEmail || ""),
        ]),
      enableHiding: false,
    },
    {
      id: "amountAndPayment",
      header: "Amount",
      cell: ({ row }) => {
        const account = row.original.paymentAccount || row.original.paymentMethod || "—";
        return h("div", { class: "flex flex-col gap-1 min-w-[130px]" }, [
          h("span", { class: "font-bold text-gray-900 dark:text-slate-100 whitespace-nowrap" },
            row.original.amountFull || "—"
          ),
          h("div", { class: "flex flex-col gap-0.5" }, [
            h("span", { class: "text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500" },
              "Payment account"
            ),
            h("span", {
              class: "text-xs font-mono text-[#374151] dark:text-slate-300 truncate max-w-[160px]",
              title: account,
            }, account),
          ]),
        ]);
      },
      enableHiding: false,
    },
    {
      id: "statusText",
      accessorKey: "statusText",
      header: "Status",
      cell: ({ row }) =>
        h(
          "span",
          { class: getStatusClasses(row.original.statusType) },
          row.original.statusText
        ),
      enableHiding: false,
    },
    {
      id: "customerDetails",
      header: "Customer Details",
      cell: ({ row }) =>
        h("div", { class: "flex flex-col gap-0.5 min-w-[140px]" }, [
          h("p", { class: "font-medium text-gray-900 dark:text-slate-100 truncate max-w-[180px]" },
            row.original.customerName || "—"
          ),
          h("p", { class: "text-xs text-slate-500 truncate max-w-[180px]" },
            row.original.customerEmail || "—"
          ),
          h(
            "span",
            { class: "inline-flex w-fit bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400" },
            row.original.customerIp || "—"
          ),
        ]),
      enableHiding: false,
    },
    {
      id: "deviceFingerprint",
      accessorKey: "deviceFingerprint",
      header: "Device Fingerprint",
      cell: ({ row }) =>
        h(
          "span",
          { class: "font-mono text-xs text-[#374151] dark:text-slate-300 truncate max-w-[120px] block", title: row.original.deviceFingerprint || undefined },
          row.original.deviceFingerprint || "—"
        ),
      enableHiding: false,
    },
    {
      id: "view",
      header: "",
      cell: ({ row }) =>
        h(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            class: "h-8 gap-1.5 border-slate-200 dark:border-slate-700 text-[#16659E] hover:bg-slate-50 dark:hover:bg-slate-800",
            "aria-label": `View details for ${row.original.customerName || "transaction"}`,
            onClick: (e: Event) => {
              e.stopPropagation();
              options.onView(row.original);
            },
          },
          () => [h(Eye, { class: "h-3.5 w-3.5" }), "View"]
        ),
      enableHiding: false,
    },
  ];
}

/** @deprecated Use createTransactionColumns({ onView }) */
export const transactionColumns: ColumnDef<Transaction>[] = createTransactionColumns({
  onView: () => {},
});
