<script setup lang="ts">
  import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
  import type { TransactionFilters } from "../../application/ports/TransactionRepository";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";

  interface Props {
    filters: TransactionFilters;
  }

  const props = defineProps<Props>();

  const emit = defineEmits<{
    apply: [filters: TransactionFilters];
    clear: [];
  }>();

  const localFilters = ref<TransactionFilters>({ ...props.filters });

  // Watch for external filter changes
  watch(
    () => props.filters,
    (newFilters) => {
      localFilters.value = { ...newFilters };
    },
    { deep: true }
  );

  function handleApply() {
    // Remove empty string values
    const cleanedFilters: TransactionFilters = {};
    Object.entries(localFilters.value).forEach(([key, value]) => {
      if (value && value.toString().trim() !== "") {
        cleanedFilters[key as keyof TransactionFilters] = value;
      }
    });
    emit("apply", cleanedFilters);
  }

  function handleClear() {
    localFilters.value = {};
    emit("clear");
  }

  /** ---------- New UI state ---------- */
  type FilterKey = keyof TransactionFilters;

  const isOpen = ref(false);
  const activeKey = ref<FilterKey>("merchantName");

  const chipDefs = [
    { key: "merchantName", label: "Merchant" },
    { key: "customerEmail", label: "Customer Email" },
    { key: "phoneNumber", label: "Phone" },
    { key: "ipAddress", label: "IP Address" },
    { key: "confirmationCode", label: "Confirmation" },
    { key: "orderTrackingId", label: "Tracking ID" },
    { key: "orderNumber", label: "Order #" },
    { key: "bankAuthCode", label: "Bank Auth" },
    { key: "deviceFingerprint", label: "Device Fingerprint" },
    { key: "dateFrom", label: "Date From" },
    { key: "dateTo", label: "Date To" },
  ] as const satisfies ReadonlyArray<{ key: FilterKey; label: string }>;

  const fieldMeta: Partial<Record<FilterKey, { type?: string; placeholder?: string }>> = {
    merchantName: { type: "text", placeholder: "Search merchant name..." },
    customerEmail: { type: "email", placeholder: "Search customer email..." },
    phoneNumber: { type: "tel", placeholder: "Search phone number..." },
    ipAddress: { type: "text", placeholder: "Search IP address..." },
    confirmationCode: { type: "text", placeholder: "Search confirmation code..." },
    orderTrackingId: { type: "text", placeholder: "Search tracking ID..." },
    orderNumber: { type: "text", placeholder: "Search order number..." },
    bankAuthCode: { type: "text", placeholder: "Search bank auth code..." },
    deviceFingerprint: { type: "text", placeholder: "Search device fingerprint..." },
    dateFrom: { type: "date" },
    dateTo: { type: "date" },
  };

  const quickInputRef = ref<HTMLInputElement | null>(null);

  const activeValue = computed<string>({
    get() {
      const v = (localFilters.value as any)[activeKey.value];
      return v ?? "";
    },
    set(v: string) {
      (localFilters.value as any)[activeKey.value] = v;
    },
  });

  const appliedChips = computed(() => {
    // Only show chips for non-empty filters
    return chipDefs
      .map((d) => {
        const v = (localFilters.value as any)[d.key];
        const str = v?.toString?.().trim?.() ?? "";
        return str ? { ...d, value: str } : null;
      })
      .filter(Boolean) as Array<{ key: FilterKey; label: string; value: string }>;
  });

  function openModal() {
    isOpen.value = true;
    nextTick(() => quickInputRef.value?.focus());
  }

  function closeModal() {
    isOpen.value = false;
  }

  function selectField(key: FilterKey) {
    activeKey.value = key;
    nextTick(() => quickInputRef.value?.focus());
  }

  function removeChip(key: FilterKey) {
    (localFilters.value as any)[key] = undefined;
    // Optional: auto-apply after removing
    handleApply();
  }

  async function commitAndApply() {
    // ensures v-model is flushed before we clean + emit
    await nextTick();
    handleApply();
  }

  async function applyAndClose() {
    await commitAndApply();
    closeModal();
  }

  function onQuickEnter() {
    commitAndApply();
    // keep modal open so user can add more chips quickly
  }

  function onKeydown(e: KeyboardEvent) {
    const isK = e.key.toLowerCase() === "k";
    if ((e.ctrlKey || e.metaKey) && isK) {
      e.preventDefault();
      openModal();
    }
    if (e.key === "Escape" && isOpen.value) {
      e.preventDefault();
      closeModal();
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
  </script>

  <template>
    <div class="space-y-3">
<!-- Prominent search bar -->
      <div
        class="flex-1 w-full bg-white dark:bg-[#414141]/30 border border-[#16659E]/15 dark:border-[#16659E]/25 rounded-lg px-4 py-3 flex items-center justify-between text-[#414141]/60 dark:text-[#F9FBFC]/60 hover:border-[#16659E]/40 hover:shadow-sm transition-all cursor-text group"
        role="button"
        tabindex="0"
        @click="openModal"
        @keydown.enter.prevent="openModal"
        @keydown.space.prevent="openModal"
      >
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-[#16659E]/50 group-hover:text-[#16659E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span class="text-sm">Search by Merchant, Email...</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <kbd class="bg-[#16659E]/5 dark:bg-[#16659E]/15 border border-[#16659E]/15 dark:border-[#16659E]/25 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#16659E]/70 dark:text-[#16659E]/80">CTRL</kbd>
          <span class="text-[10px] font-semibold text-[#16659E]/50">+</span>
          <kbd class="bg-[#16659E]/5 dark:bg-[#16659E]/15 border border-[#16659E]/15 dark:border-[#16659E]/25 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#16659E]/70 dark:text-[#16659E]/80">K</kbd>
        </div>
      </div>

<!-- Applied chips outside dialog: click chip opens modal, X clears that chip -->
      <div v-if="appliedChips.length" class="flex flex-wrap gap-2">
        <div
          v-for="c in appliedChips"
          :key="c.key"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#16659E]/20 dark:border-[#16659E]/30 bg-[#16659E]/5 dark:bg-[#16659E]/10 text-sm hover:border-[#16659E]/40 hover:bg-[#16659E]/8 transition-all group"
        >
          <button
            type="button"
            class="flex items-center gap-2 min-w-0 cursor-text text-left"
            @click="openModal"
          >
            <span class="font-medium text-[#16659E] dark:text-[#16659E]/90">{{ c.label }}:</span>
            <span class="text-[#414141]/70 dark:text-[#F9FBFC]/70 truncate max-w-[140px] font-mono text-xs">{{ c.value }}</span>
          </button>
          <button
            type="button"
            class="shrink-0 rounded-full p-0.5 hover:bg-[#830000]/10 text-[#414141]/40 dark:text-[#F9FBFC]/40 hover:text-[#830000] transition-colors"
            aria-label="Clear this filter"
            @click.stop="removeChip(c.key)"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

<!-- Modal -->
      <Teleport to="body">
        <div v-if="isOpen" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-[#414141]/50 dark:bg-black/60 backdrop-blur-sm" @click="closeModal" />

          <div class="absolute inset-0 flex items-start justify-center p-4 sm:p-6 pt-[10vh]">
            <div
              class="w-full max-w-4xl rounded-xl border border-[#16659E]/15 dark:border-[#16659E]/25 bg-white dark:bg-[#414141] shadow-2xl shadow-[#16659E]/10 overflow-hidden"
              @click.stop
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-[#16659E]/10 dark:border-[#16659E]/20 bg-[#F9FBFC] dark:bg-[#414141]/80">
                <div>
                  <h3 class="text-base font-semibold text-[#414141] dark:text-[#F9FBFC] tracking-tight">Search & Filters</h3>
                  <p class="text-xs text-[#414141]/50 dark:text-[#F9FBFC]/50 mt-0.5">
                    Add filters as chips. Remove any chip to clear it.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" class="text-[#830000] border-[#830000]/20 hover:bg-[#830000]/5 hover:border-[#830000]/30" @click="handleClear">Clear All</Button>
                  <Button type="button" variant="outline" size="sm" class="border-[#16659E]/20 hover:bg-[#16659E]/5 hover:border-[#16659E]/30" @click="closeModal">Close</Button>
                </div>
              </div>

<div class="px-6 py-5 space-y-5">
                <!-- Applied chips (removable) -->
                <div v-if="appliedChips.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="c in appliedChips"
                    :key="c.key"
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#16659E]/20 dark:border-[#16659E]/30 bg-[#16659E]/5 dark:bg-[#16659E]/10 text-sm"
                  >
                    <span class="font-medium text-[#16659E]">{{ c.label }}:</span>
                    <span class="text-[#414141]/70 dark:text-[#F9FBFC]/70 font-mono text-xs">{{ c.value }}</span>
                    <button
                      type="button"
                      class="ml-1 rounded-full hover:bg-[#830000]/10 text-[#414141]/40 hover:text-[#830000] px-1 transition-colors"
                      aria-label="Remove filter"
                      @click="removeChip(c.key)"
                    >
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                </div>
                <div v-else class="text-sm text-[#414141]/50 dark:text-[#F9FBFC]/50">
                  No filters applied yet.
                </div>

                <!-- Field selector chips -->
                <div class="flex flex-wrap gap-2 pt-2">
                  <button
                    v-for="c in chipDefs"
                    :key="c.key"
                    type="button"
                    class="px-3 py-1.5 rounded-lg border text-sm font-medium transition-all"
                    :class="c.key === activeKey 
                      ? 'bg-[#16659E] text-white border-[#16659E] shadow-sm' 
                      : 'bg-white dark:bg-[#414141]/50 border-[#16659E]/15 dark:border-[#16659E]/25 text-[#414141]/70 dark:text-[#F9FBFC]/70 hover:border-[#16659E]/40 hover:bg-[#16659E]/5'"
                    @click="selectField(c.key)"
                  >
                    {{ c.label }}
                  </button>
                </div>

                <!-- Single input for selected field -->
                <div class="flex flex-col sm:flex-row gap-4 sm:items-end pt-2">
                  <div class="flex-1">
                    <label class="text-sm font-medium text-[#414141] dark:text-[#F9FBFC]">
                      {{ chipDefs.find(c => c.key === activeKey)?.label }}
                    </label>

                    <Input
                      ref="quickInputRef"
                      v-model="activeValue"
                      :type="fieldMeta[activeKey]?.type || 'text'"
                      :placeholder="fieldMeta[activeKey]?.placeholder || 'Type to search...'"
                      class="mt-2 border-[#16659E]/20 focus:border-[#16659E]/50 focus:ring-[#16659E]/20"
                      @keyup.enter="onQuickEnter"
                      @change="(fieldMeta[activeKey]?.type === 'date') && commitAndApply()"
                    />
                  </div>

                  <div class="flex gap-2">
                    <Button type="button" variant="outline" class="border-[#16659E]/20 hover:bg-[#16659E]/5 hover:border-[#16659E]/30" @click="commitAndApply">Apply</Button>
                    <Button type="button" class="bg-[#16659E] hover:bg-[#16659E]/90 text-white" @click="applyAndClose">Apply & Close</Button>
                  </div>
                </div>

                <div class="flex justify-between pt-3 border-t border-[#16659E]/10 dark:border-[#16659E]/15">
                  <p class="text-xs text-[#414141]/50 dark:text-[#F9FBFC]/50">
                    Tip: Press <kbd class="px-1.5 py-0.5 bg-[#16659E]/5 border border-[#16659E]/15 rounded text-[10px] font-semibold text-[#16659E]/70">Esc</kbd> to close.
                  </p>
                  <p class="text-xs text-[#414141]/50 dark:text-[#F9FBFC]/50">
                    Shortcut: <kbd class="px-1.5 py-0.5 bg-[#16659E]/5 border border-[#16659E]/15 rounded text-[10px] font-semibold text-[#16659E]/70">Ctrl</kbd>+<kbd class="px-1.5 py-0.5 bg-[#16659E]/5 border border-[#16659E]/15 rounded text-[10px] font-semibold text-[#16659E]/70">K</kbd>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </template>
