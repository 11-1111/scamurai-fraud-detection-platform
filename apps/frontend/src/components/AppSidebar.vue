<script setup lang="ts">
import { computed, ref } from "vue"
import { useMediaQuery } from "@vueuse/core"
import { useRoute } from "vue-router"
import { useTheme } from "@/composables/useTheme"
import {
  ArrowLeftRight,
  ShieldAlert,
  ShieldCheck,
  PanelLeftClose,
} from "lucide-vue-next"

const route = useRoute()
const { isDark } = useTheme()

const emit = defineEmits<{
  close: [restoreTriggerFocus?: boolean]
}>()

const mobileCloseButtonRef = ref<HTMLButtonElement | null>(null)

function focusMobileClose(): void {
  mobileCloseButtonRef.value?.focus()
}

defineExpose({ focusMobileClose })

/** Match the drawer breakpoint used by the main dashboard layout. */
const isDrawerMode = useMediaQuery("(max-width: 1023px)")

const pinned = ref(true)

/** The sidebar is always fully expanded while it is inside the mobile drawer. */
const isExpanded = computed(() => isDrawerMode.value || pinned.value)

function togglePinned(): void {
  if (isDrawerMode.value) return
  pinned.value = !pinned.value
}

function requestMobileClose(restoreTriggerFocus = false): void {
  if (isDrawerMode.value) emit("close", restoreTriggerFocus)
}

const navItems = [
  { title: "Transactions", to: "/transactions", icon: ArrowLeftRight },
  { title: "Fraud Alerts", to: "/fraud-alerts", icon: ShieldAlert },
  { title: "Fraud Config", to: "/fraud-config", icon: ShieldCheck },
]

function isNavItemActive(to: string): boolean {
  const current = route.path.replace(/\/$/, "") || "/"
  const target = to.replace(/\/$/, "") || "/"
  if (!target || target === "/") return current === target
  return current === target || current.startsWith(`${target}/`)
}

const activeIndex = computed(() => {
  const index = navItems.findIndex((item) => isNavItemActive(item.to))
  return index >= 0 ? index : 0
})

const activePillTransform = computed(() => {
  const rowStride = isDrawerMode.value ? 45 : 43
  return `translateY(${activeIndex.value * rowStride}px)`
})

</script>

<template>
  <aside
    class="api3-sidebar"
    :class="{
      expanded: isExpanded,
      'drawer-mode': isDrawerMode,
      'is-dark': isDark,
    }"
  >
    <div class="sidebar-inner">
      <!-- Brand -->
      <div class="brand-row">
        <span class="brand-collapsed-mark" aria-hidden="true">API3</span>

        <div class="brand-text">
          <div class="brand-title uppercase">API3 Dashboard</div>
        </div>

        <button
          v-if="isDrawerMode"
          ref="mobileCloseButtonRef"
          class="drawer-close-btn"
          type="button"
          aria-label="Close navigation menu"
          title="Close navigation menu"
          @click="requestMobileClose(true)"
        >
          <PanelLeftClose aria-hidden="true" />
        </button>

        <button
          v-if="!isDrawerMode"
          class="pin-btn"
          :class="{ 'is-pinned': pinned }"
          type="button"
          :aria-label="pinned ? 'Unpin sidebar' : 'Pin sidebar'"
          :aria-pressed="pinned"
          @click="togglePinned"
        >
          <svg
            v-if="!pinned"
            class="pin-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 17v5" />
            <path
              d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
            />
          </svg>
          <svg
            v-else
            class="pin-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 17v5" />
            <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
            <path d="M2 2l20 20" />
            <path
              d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h9"
            />
          </svg>
          <span class="pin-tooltip">{{ pinned ? "Unpin sidebar" : "Pin sidebar" }}</span>
        </button>
      </div>

      <div class="section-label !mt-4">Main</div>

      <div class="nav-wrap">
        <div class="active-pill" :style="{ transform: activePillTransform }" />

        <nav class="nav-list" aria-label="Main navigation">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: isNavItemActive(item.to) }"
            @click="requestMobileClose(false)"
          >
            <component
              :is="item.icon"
              class="nav-icon"
              :style="{ strokeWidth: '1.9' }"
              aria-hidden="true"
            />
            <span class="nav-text">{{ item.title }}</span>
          </router-link>
        </nav>
      </div>

      <!-- Profile dock -->
      <div class="profile-wrap">
        <div class="profile-hairline" aria-hidden="true" />

        <div class="profile-dock">
          <div class="avatar-ring">
            <div class="avatar">A3</div>
          </div>

          <div class="profile-meta">
            <div class="profile-name">API3 User</div>
            <span class="role-badge">Analyst</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.api3-sidebar {
  --sb-collapsed: 76px;
  --sb-expanded: 262px;
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --accent: #1c6a9c;
  --accent-dark: #0d3f63;

  position: relative;
  flex: 0 0 var(--sb-collapsed);
  width: var(--sb-collapsed);
  z-index: 50;
  transition:
    flex-basis 0.5s var(--spring),
    width 0.5s var(--spring);
}

.api3-sidebar.expanded,
.api3-sidebar:hover {
  flex-basis: var(--sb-expanded);
  width: var(--sb-expanded);
}

.sidebar-inner {
  position: fixed;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: calc(var(--sb-collapsed) - 16px);
  display: flex;
  flex-direction: column;
  padding: 18px 0 16px;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 18px 40px -18px rgba(15, 30, 50, 0.18);
  transition: width 0.5s var(--spring);
}

.api3-sidebar.expanded .sidebar-inner,
.api3-sidebar:hover .sidebar-inner {
  width: calc(var(--sb-expanded) - 16px);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 50px;
  padding: 0 10px 0 18px;
  margin-bottom: 16px;
}

.brand-collapsed-mark {
  display: none;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #1c6a9c;
  flex-shrink: 0;
  line-height: 1;
}

.brand-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  opacity: 0;
  max-width: 0;
  margin-left: -8px;
  transition:
    opacity 0.22s ease 0.05s,
    max-width 0.38s cubic-bezier(0.4, 0, 0.2, 1),
    margin 0.38s ease;
}

.api3-sidebar.expanded .brand-text,
.api3-sidebar:hover .brand-text {
  opacity: 1;
  max-width: 200px;
  margin-left: 0;
}

.brand-title {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: #334155;
  letter-spacing: -0.01em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin-left: auto;
  flex: 0 0 auto;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.78);
  color: #64748b;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.drawer-close-btn:hover {
  background: #eef3f7;
  border-color: rgba(100, 116, 139, 0.36);
  color: #0f4d79;
}

.drawer-close-btn:active {
  transform: scale(0.94);
}

.drawer-close-btn:focus-visible {
  outline: 2px solid #16659e;
  outline-offset: 2px;
}

.drawer-close-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.api3-sidebar.is-dark .drawer-close-btn {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(203, 213, 225, 0.88);
}

.api3-sidebar.is-dark .drawer-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.pin-btn {
  position: relative;
  flex: 0 0 auto;
  margin-left: auto;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.22s ease 0.05s,
    transform 0.15s ease;
}

.api3-sidebar.expanded .pin-btn,
.api3-sidebar:hover .pin-btn {
  opacity: 1;
  pointer-events: auto;
}

.pin-btn:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #334155;
}

.pin-btn:active {
  transform: scale(0.94);
}

.pin-btn.is-pinned {
  color: #1c6a9c;
}

.pin-btn:focus-visible {
  outline: 2px solid #1c6a9c;
  outline-offset: 2px;
}

.pin-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.pin-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  transform: translateY(-4px);
  background: #0f172a;
  color: #fff;
  font-size: 11.5px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 7px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  box-shadow: 0 8px 20px -8px rgba(15, 23, 42, 0.4);
  z-index: 20;
}

.pin-tooltip::before {
  content: "";
  position: absolute;
  right: 10px;
  top: -4px;
  border: 4px solid transparent;
  border-bottom-color: #0f172a;
}

.pin-btn:hover .pin-tooltip {
  opacity: 1;
  transform: translateY(0);
}

.section-label {
  height: 13px;
  overflow: hidden;
  padding: 0 18px;
  margin-bottom: 9px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #93a0aa;
  opacity: 0;
  transition: opacity 0.22s ease 0.05s;
}

.api3-sidebar.expanded .section-label,
.api3-sidebar:hover .section-label {
  opacity: 1;
}

.nav-wrap {
  position: relative;
  flex: 1;
  padding: 0 10px;
}

.active-pill {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 0;
  height: 40px;
  border-radius: 13px;
  background: linear-gradient(145deg, #1c6a9c, #0d3f63);
  box-shadow: 0 8px 18px -6px rgba(22, 101, 158, 0.45);
  z-index: 0;
  transition: transform 0.48s var(--spring);
}

.nav-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 10px;
  border-radius: 13px;
  color: #3c4a55;
  opacity: 0.62;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition:
    opacity 0.25s ease,
    color 0.25s ease,
    transform 0.25s var(--spring);
}

.nav-link:hover {
  opacity: 0.9;
  transform: translateX(2px);
}

.nav-link.active {
  color: #ffffff;
  opacity: 1;
  font-weight: 700;
}

.nav-link:focus-visible {
  outline: 2px solid #1c6a9c;
  outline-offset: 2px;
}

.nav-icon {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
}

.nav-text {
  opacity: 0;
  white-space: nowrap;
  transition: opacity 0.22s ease 0.05s;
}

.api3-sidebar.expanded .nav-text,
.api3-sidebar:hover .nav-text {
  opacity: 1;
}

.profile-wrap {
  padding: 0 10px;
  margin-top: auto;
  position: relative;
}

.profile-hairline {
  height: 1px;
  background: #e7eaee;
  margin-bottom: 10px;
}

.profile-dock {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 6px 6px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.profile-dock:hover {
  background: #f7f9fb;
}

.avatar-ring {
  position: relative;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0f2d4a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 0 0 2px #d8e9f4;
}

.profile-meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.22s ease 0.05s;
}

.api3-sidebar.expanded .profile-meta,
.api3-sidebar:hover .profile-meta {
  opacity: 1;
}

.profile-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #15202b;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  color: #0f4d79;
  background: #eaf2f8;
  padding: 1.5px 6px;
  border-radius: 5px;
  margin-top: 3px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.api3-sidebar.is-dark .sidebar-inner {
  background: rgba(13, 18, 30, 0.88);
  border-color: rgba(255, 255, 255, 0.07);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 18px 40px -18px rgba(0, 0, 0, 0.65);
}

.api3-sidebar.is-dark .section-label {
  color: rgba(100, 116, 139, 0.85);
}

.api3-sidebar.is-dark .brand-title {
  color: rgba(226, 232, 240, 0.88);
}

.api3-sidebar.is-dark .brand-collapsed-mark {
  color: #52a2d4;
}

.api3-sidebar.is-dark .pin-btn {
  color: rgba(148, 163, 184, 0.5);
}

.api3-sidebar.is-dark .pin-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(203, 213, 225, 0.9);
}

.api3-sidebar.is-dark .pin-btn.is-pinned {
  color: #52a2d4;
}

.api3-sidebar.is-dark .pin-tooltip {
  background: #1e293b;
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.6);
}

.api3-sidebar.is-dark .pin-tooltip::before {
  border-bottom-color: #1e293b;
}

.api3-sidebar.is-dark .active-pill {
  background: linear-gradient(145deg, #1e75b0, #0d4470);
  box-shadow: 0 8px 20px -6px rgba(22, 101, 158, 0.6);
}

.api3-sidebar.is-dark .nav-link {
  color: rgba(148, 163, 184, 0.72);
}

.api3-sidebar.is-dark .nav-link:hover {
  color: rgba(203, 213, 225, 0.92);
}

.api3-sidebar.is-dark .nav-link.active {
  color: #ffffff;
  opacity: 1;
}

.api3-sidebar.is-dark .profile-hairline {
  background: rgba(255, 255, 255, 0.07);
}

.api3-sidebar.is-dark .profile-dock:hover {
  background: rgba(255, 255, 255, 0.05);
}

.api3-sidebar.is-dark .avatar {
  background: #1a3a58;
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.25);
}

.api3-sidebar.is-dark .profile-name {
  color: rgba(226, 232, 240, 0.88);
}

.api3-sidebar.is-dark .role-badge {
  background: rgba(22, 101, 158, 0.18);
  color: rgba(147, 197, 253, 0.9);
}

@media (max-width: 1023px) {
  .api3-sidebar,
  .api3-sidebar.expanded,
  .api3-sidebar:hover,
  .api3-sidebar.drawer-mode,
  .api3-sidebar.drawer-mode:hover {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    z-index: auto;
    transition: none;
  }

  .api3-sidebar .sidebar-inner,
  .api3-sidebar.expanded .sidebar-inner,
  .api3-sidebar:hover .sidebar-inner,
  .api3-sidebar.drawer-mode .sidebar-inner,
  .api3-sidebar.drawer-mode:hover .sidebar-inner {
    position: relative;
    inset: auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 10px 0 calc(16px + env(safe-area-inset-bottom));
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    transition: none;
  }

  .api3-sidebar.drawer-mode .brand-row {
    min-height: 48px;
    margin-bottom: 8px;
    padding: calc(4px + env(safe-area-inset-top)) 14px 4px 18px;
  }

  .api3-sidebar.drawer-mode .drawer-close-btn {
    display: inline-flex;
  }

  .api3-sidebar.drawer-mode .brand-collapsed-mark {
    display: none;
  }

  .api3-sidebar.drawer-mode .brand-text,
  .api3-sidebar.drawer-mode:hover .brand-text {
    opacity: 1;
    max-width: 100%;
    margin-left: 0;
    transition: none;
  }

  .api3-sidebar.drawer-mode .section-label,
  .api3-sidebar.drawer-mode:hover .section-label {
    height: auto;
    opacity: 1;
    transition: none;
  }

  .api3-sidebar.drawer-mode .nav-wrap {
    min-height: 160px;
    padding: 0 12px;
  }

  .api3-sidebar.drawer-mode .active-pill {
    left: 12px;
    right: 12px;
    height: 42px;
  }

  .api3-sidebar.drawer-mode .nav-link {
    height: 42px;
    padding: 0 12px;
  }

  .api3-sidebar.drawer-mode .nav-link:hover {
    transform: none;
  }

  .api3-sidebar.drawer-mode .nav-text,
  .api3-sidebar.drawer-mode:hover .nav-text {
    opacity: 1;
    transition: none;
  }

  .api3-sidebar.drawer-mode .profile-wrap {
    padding: 0 12px;
    margin-top: 10px;
  }

  .api3-sidebar.drawer-mode .profile-meta,
  .api3-sidebar.drawer-mode:hover .profile-meta {
    opacity: 1;
    transition: none;
  }

  .api3-sidebar.drawer-mode .pin-btn {
    display: none;
  }

  .api3-sidebar.drawer-mode.is-dark .sidebar-inner {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .api3-sidebar,
  .api3-sidebar .sidebar-inner,
  .api3-sidebar .active-pill,
  .api3-sidebar .nav-link,
  .api3-sidebar .brand-text,
  .api3-sidebar .nav-text,
  .api3-sidebar .section-label {
    transition: none !important;
  }
}
</style>
