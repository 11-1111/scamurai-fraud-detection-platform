<script setup lang="ts">
import { computed } from "vue";
import type { FraudAlertFilters, FraudAlertStats } from "../../domain/entities/FraudAlert";

const props = defineProps<{
  stats: FraudAlertStats | null;
  loading?: boolean;
  filters?: FraudAlertFilters;
}>();

const emit = defineEmits<{
  filter: [filters: FraudAlertFilters];
}>();

type StatId = "open" | "assigned" | "review" | "resolved" | "critical" | "high";

interface StatConfig {
  id: StatId;
  label: string;
  statKey: keyof Pick<
    FraudAlertStats,
    "totalOpen" | "totalAssigned" | "totalUnderReview" | "totalResolved" | "totalCritical" | "totalHigh"
  >;
  severityVar: string;
  filter: Partial<FraudAlertFilters>;
}

const statsCards: StatConfig[] = [
  {
    id: "open",
    label: "Open",
    statKey: "totalOpen",
    severityVar: "var(--s-open)",
    filter: { status: "OPEN" },
  },
  {
    id: "assigned",
    label: "Assigned",
    statKey: "totalAssigned",
    severityVar: "var(--s-assigned)",
    filter: { status: "ASSIGNED" },
  },
  {
    id: "review",
    label: "Under review",
    statKey: "totalUnderReview",
    severityVar: "var(--s-review)",
    filter: { status: "UNDER_REVIEW" },
  },
  {
    id: "resolved",
    label: "Resolved",
    statKey: "totalResolved",
    severityVar: "var(--s-resolved)",
    filter: { status: "RESOLVED" },
  },
  {
    id: "critical",
    label: "Critical",
    statKey: "totalCritical",
    severityVar: "var(--s-critical)",
    filter: { severity: "CRITICAL" },
  },
  {
    id: "high",
    label: "High",
    statKey: "totalHigh",
    severityVar: "var(--s-high)",
    filter: { riskLevel: "HIGH" },
  },
];

function isActive(card: StatConfig): boolean {
  const f = props.filters ?? {};
  if (card.filter.status) return f.status === card.filter.status;
  if (card.filter.severity) return f.severity === card.filter.severity;
  if (card.filter.riskLevel) return f.riskLevel === card.filter.riskLevel;
  return false;
}

function statValue(card: StatConfig): number {
  return props.stats?.[card.statKey] ?? 0;
}

function onCardClick(card: StatConfig) {
  const current = { ...(props.filters ?? {}) };
  const active = isActive(card);

  if (card.filter.status) {
    if (active) delete current.status;
    else current.status = card.filter.status;
  } else if (card.filter.severity) {
    if (active) delete current.severity;
    else current.severity = card.filter.severity;
  } else if (card.filter.riskLevel) {
    if (active) delete current.riskLevel;
    else current.riskLevel = card.filter.riskLevel;
  }

  emit("filter", current);
}

const deckLabel = computed(() => "Alert summary — click a card to filter");
</script>

<template>
  <section class="stat-deck" :aria-label="deckLabel">
    <button
      v-for="card in statsCards"
      :key="card.id"
      type="button"
      class="stat-card"
      :style="{ '--s': card.severityVar }"
      :aria-pressed="isActive(card)"
      :aria-label="`${card.label}: ${statValue(card)} alerts. Click to filter.`"
      @click="onCardClick(card)"
    >
      <div class="stat-card__top">
        <span class="stat-card__dot" aria-hidden="true" />
        <span class="stat-card__label">{{ card.label }}</span>
      </div>

      <div v-if="loading" class="stat-card__count stat-card__count--loading mono-text" aria-hidden="true" />
      <div
        v-else
        class="stat-card__count mono-text tabular-nums"
        :aria-label="`${statValue(card)} ${card.label}`"
      >
        {{ statValue(card) }}
      </div>
    </button>
  </section>
</template>

<style scoped>
.stat-deck {
  --brand: #16659e;
  --brand-2: #0e4a75;
  --s-critical: var(--brand-2);
  --s-high: var(--brand);
  --s-review: color-mix(in srgb, var(--brand) 72%, white 28%);
  --s-open: color-mix(in srgb, var(--brand) 55%, white 45%);
  --s-assigned: color-mix(in srgb, var(--brand) 40%, white 60%);
  --s-resolved: color-mix(in srgb, var(--brand) 25%, white 75%);

  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 1250px) {
  .stat-deck {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .stat-deck {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  position: relative;
  border: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  background: #ffffff;
  border: 1px solid #e3e5e9;
  border-radius: 10px;
  padding: 14px 14px 15px;
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
}

:global(.dark) .stat-card {
  background: #1b1e24;
  border-color: rgba(255, 255, 255, 0.08);
}

.stat-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--s);
  opacity: 0;
  transition: opacity 0.12s;
}

.stat-card:hover {
  border-color: #d3d7dd;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

:global(.dark) .stat-card:hover {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.stat-card:focus-visible {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--brand);
}

:global(.dark) .stat-card:focus-visible {
  box-shadow: 0 0 0 2px #14161b, 0 0 0 4px var(--brand);
}

.stat-card[aria-pressed="true"] {
  border-color: var(--s);
  background: color-mix(in srgb, var(--s) 5%, #fff);
}

:global(.dark) .stat-card[aria-pressed="true"] {
  background: color-mix(in srgb, var(--s) 12%, #1b1e24);
}

.stat-card[aria-pressed="true"]::before {
  opacity: 1;
}

.stat-card__top {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}

.stat-card__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--s);
  flex-shrink: 0;
}

.stat-card__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #8497a8;
}

:global(.dark) .stat-card__label {
  color: #8b909c;
}

.stat-card__count {
  font-family: "JetBrains Mono", ui-monospace, monospace !important;
  font-feature-settings: "tnum";
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--brand-2);
}

:global(.dark) .stat-card__count {
  color: #e8eaee;
}

.stat-card__count--loading {
  width: 40px;
  height: 28px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.06);
  animation: stat-pulse 1.2s ease-in-out infinite;
}

:global(.dark) .stat-card__count--loading {
  background: rgba(255, 255, 255, 0.08);
}

@keyframes stat-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .stat-card::before {
    transition: none !important;
  }

  .stat-card__count--loading {
    animation: none;
  }
}
</style>
