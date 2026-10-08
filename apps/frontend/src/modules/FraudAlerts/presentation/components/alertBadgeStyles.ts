export function riskLevelBadgeClass(level: string): string {
  switch (level?.toUpperCase()) {
    case "LOW":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "HIGH":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "CRITICAL":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

export function statusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case "ASSIGNED":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
    case "UNDER_REVIEW":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "RESOLVED":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "CLOSED":
    case "DISMISSED":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

export function decisionBadgeClass(decision: string): string {
  switch (decision?.toUpperCase()) {
    case "ALLOW":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "ALLOW_WITH_MONITORING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "MANUAL_REVIEW":
    case "REVIEW":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "BLOCK":
    case "HOLD":
    case "ESCALATE":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

export function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function formatFeatureKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export { formatDateTime as formatDate } from "@/lib/formatDateTime";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Alert Created",
  STATUS_CHANGED: "Status Changed",
  ASSIGNED: "Assigned",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  DISMISSED: "Dismissed",
  NOTE_ADDED: "Note Added",
};

export function actionTypeLabel(actionType: string): string {
  return ACTION_LABELS[actionType?.toUpperCase()] ?? formatLabel(actionType);
}

export function actionTypeBadgeClass(actionType: string): string {
  switch (actionType?.toUpperCase()) {
    case "CREATED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case "STATUS_CHANGED":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "ASSIGNED":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
    case "RESOLVED":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "CLOSED":
    case "DISMISSED":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "NOTE_ADDED":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}
