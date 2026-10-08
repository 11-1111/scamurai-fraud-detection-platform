<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue"
import Logo from "@/components/Logo.vue"
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue"
import { useRoute } from "vue-router"
import { useTheme } from "@/composables/useTheme"
import {
  Sun,
  Moon,
  Menu,
  ShieldAlert,
  ShieldCheck,
  ArrowLeftRight,
} from "lucide-vue-next"

const route = useRoute()
const { isDark, toggleTheme } = useTheme()

type AppSidebarExpose = {
  focusMobileClose: () => void
}

const mobileSidebarOpen = ref(false)
const mobileMenuButtonRef = ref<HTMLButtonElement | null>(null)
const appSidebarRef = ref<AppSidebarExpose | null>(null)

const routeHeaderInfo = computed(() => {
  const metaTitle = typeof route.meta.title === "string" ? route.meta.title : null
  const metaDescription =
    typeof route.meta.description === "string" ? route.meta.description : null

  const path = route.path.replace(/\/$/, "")
  let icon = ArrowLeftRight
  if (path.startsWith("/fraud-alerts")) icon = ShieldAlert
  else if (path.startsWith("/fraud-config")) icon = ShieldCheck

  if (metaTitle) {
    return {
      title: metaTitle,
      description: metaDescription ?? "",
      icon,
    }
  }

  if (path.startsWith("/fraud-alerts")) {
    return {
      title: path === "/fraud-alerts" ? "Fraud Alerts" : "Fraud Alert",
      description:
        path === "/fraud-alerts"
          ? "Review transactions flagged by fraud rules and policies."
          : "Review the fraud decision, evidence and investigation history.",
      icon: ShieldAlert,
    }
  }
  if (path.startsWith("/fraud-config")) {
    return {
      title: "Fraud Configuration",
      description: "View fraud features, rules, risk levels, and policies.",
      icon: ShieldCheck,
    }
  }
  return {
    title: "Transactions",
    description: "Monitor and investigate payment transactions.",
    icon: ArrowLeftRight,
  }
})

async function openMobileSidebar(): Promise<void> {
  mobileSidebarOpen.value = true
  await nextTick()
  appSidebarRef.value?.focusMobileClose?.()
}

async function closeMobileSidebar(restoreTriggerFocus = true): Promise<void> {
  if (!mobileSidebarOpen.value) return
  mobileSidebarOpen.value = false

  if (restoreTriggerFocus) {
    await nextTick()
    mobileMenuButtonRef.value?.focus()
  }
}

function toggleMobileSidebar(): void {
  if (mobileSidebarOpen.value) {
    void closeMobileSidebar()
  } else {
    void openMobileSidebar()
  }
}

function onEscape(event: KeyboardEvent): void {
  if (event.key === "Escape" && mobileSidebarOpen.value) {
    void closeMobileSidebar()
  }
}

watch(
  () => route.fullPath,
  () => {
    void closeMobileSidebar(false)
  },
)

watch(mobileSidebarOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : ""
})

const bgLinesRef = ref<HTMLDivElement | null>(null)
let resizeFrame: number | null = null

function drawAppBackgroundLines(): void {
  const el = bgLinesRef.value
  if (!el) return

  const W = window.innerWidth
  const H = window.innerHeight

  const lines = [
    { x1: -40, y1: H * 0.18, x2: W * 0.55, y2: H * 0.72, op: 0.07 },
    { x1: -40, y1: H * 0.22, x2: W * 0.5, y2: H * 0.76, op: 0.05 },
    { x1: W * 0.88, y1: 0, x2: W * 0.7, y2: H, op: 0.06 },
    { x1: W * 0.93, y1: 0, x2: W * 0.76, y2: H, op: 0.04 },
    { x1: 0, y1: H * 0.28, x2: W, y2: H * 0.24, op: 0.05 },
  ]

  el.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      ${lines
        .map(
          (l) =>
            `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="rgba(22,101,158,${l.op})" stroke-width="1"/>`,
        )
        .join("")}
    </svg>
  `
}

function onWindowResize(): void {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)

  resizeFrame = requestAnimationFrame(() => {
    drawAppBackgroundLines()

    if (window.innerWidth >= 1024) {
      void closeMobileSidebar(false)
    }

    resizeFrame = null
  })
}

onMounted(async () => {
  await nextTick()
  drawAppBackgroundLines()
  window.addEventListener("resize", onWindowResize, { passive: true })
  window.addEventListener("keydown", onEscape)
})

onBeforeUnmount(() => {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  window.removeEventListener("resize", onWindowResize)
  window.removeEventListener("keydown", onEscape)
  document.body.style.overflow = ""
})
</script>

<template>
  <div class="app-shell" :class="{ 'mobile-nav-open': mobileSidebarOpen }">
    <div class="app-bg-scene" aria-hidden="true" />
    <div ref="bgLinesRef" class="app-bg-lines" aria-hidden="true" />

    <button
      type="button"
      class="mobile-sidebar-backdrop"
      :class="{ 'is-open': mobileSidebarOpen }"
      aria-label="Close navigation menu"
      :aria-hidden="!mobileSidebarOpen"
      :tabindex="mobileSidebarOpen ? 0 : -1"
      @click="closeMobileSidebar()"
    />

    <div
      id="mobile-navigation"
      class="sidebar-host"
      :class="{ 'is-open': mobileSidebarOpen }"
    >
      <AppSidebar ref="appSidebarRef" @close="closeMobileSidebar" />
    </div>

    <div class="main-shell">
      <header class="dashboard-header sticky top-0 z-50">
        <div class="header-glow header-glow-blue" aria-hidden="true" />
        <div class="header-glow header-glow-purple" aria-hidden="true" />

        <div class="header-inner">
          <div class="page-header">
            <div class="page-header-left">
              <div
                v-if="routeHeaderInfo.icon"
                class="page-header-icon"
                aria-hidden="true"
              >
                <component :is="routeHeaderInfo.icon" class="h-5 w-5" />
              </div>
              <div class="page-header-copy min-w-0">
                <h1 class="page-header-title">{{ routeHeaderInfo.title }}</h1>
                <p class="page-header-description">
                  {{ routeHeaderInfo.description }}
                </p>
              </div>
            </div>

            <div class="page-header-actions">
              <div id="table-filters" class="header-filters" />

              <button
                ref="mobileMenuButtonRef"
                type="button"
                class="header-icon-btn mobile-menu-btn"
                :aria-label="
                  mobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'
                "
                :title="
                  mobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'
                "
                aria-controls="mobile-navigation"
                :aria-expanded="mobileSidebarOpen"
                @click="toggleMobileSidebar"
              >
                <Menu class="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                class="header-icon-btn theme-toggle"
                :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="toggleTheme"
              >
                <Sun v-if="!isDark" class="h-4 w-4" aria-hidden="true" />
                <Moon v-else class="h-4 w-4" aria-hidden="true" />
              </button>

              <div class="head-divider" aria-hidden="true" />

              <div class="header-logo">
                <Logo />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="dashboard-main">
        <div class="dashboard-content-shell">
          <router-view :key="route.fullPath" />
        </div>
      </main>
    </div>
  </div>
</template>

<style>
.app-shell {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  position: relative;
  overflow-x: clip;
}

.main-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  background: transparent;
}

.sidebar-host {
  display: contents;
}

.mobile-sidebar-backdrop,
.mobile-menu-btn {
  display: none !important;
}

.dashboard-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  width: 100%;
  flex: 1;
  min-width: 0;
  background: transparent;
}

.dashboard-content-shell {
  width: 100%;
  max-width: 1600px;
  min-width: 0;
  margin: 0 auto;

}

.dashboard-header {
  position: sticky;
  top: 0;
  z-index: 50;
  overflow: hidden;
  background: #f8fbff;
  border-bottom: none;
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
}

.header-inner {
  position: relative;
  z-index: 2;
  min-width: 0;
  padding: 28px 36px 22px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.page-header-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.page-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #16659e;
  background: rgba(22, 101, 158, 0.08);
  border: 1px solid rgba(22, 101, 158, 0.12);
}

.page-header-title {
  margin: 0;
  font-size: clamp(1.35rem, 1.1rem + 0.8vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f2d4a;
  line-height: 1.2;
}

.page-header-description {
  margin: 4px 0 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
}

.page-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.header-filters {
  min-width: 0;
  flex: 1;
  max-width: 70%;
}

.header-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(70px);
  opacity: 0.55;
  pointer-events: none;
  z-index: 1;
}

.header-glow-blue {
  width: 520px;
  height: 220px;
  top: -120px;
  left: 120px;
  background: radial-gradient(circle, #9fd0ec, transparent 70%);
}

.header-glow-purple {
  width: 360px;
  height: 220px;
  top: -90px;
  right: -80px;
  background: radial-gradient(circle, #c9b6f2, transparent 70%);
  opacity: 0.38;
}

.dark .dashboard-header {
  background: #0d1525;
}

.dark .page-header-title {
  color: rgba(241, 245, 249, 0.95);
}

.dark .page-header-description {
  color: rgba(148, 163, 184, 0.8);
}

.dark .page-header-icon {
  color: #7db9df;
  background: rgba(82, 162, 212, 0.12);
  border-color: rgba(82, 162, 212, 0.2);
}

.dark .header-glow-blue {
  background: radial-gradient(circle, rgba(82, 162, 212, 0.45), transparent 70%);
}

.dark .header-glow-purple {
  background: radial-gradient(circle, rgba(139, 92, 246, 0.28), transparent 70%);
}

.head-divider {
  width: 1px;
  height: 24px;
  background: rgba(148, 163, 184, 0.22);
  border-radius: 1px;
  flex-shrink: 0;
}

.header-logo {
  display: flex;
  align-items: center;
  opacity: 0.92;
  flex-shrink: 0;
}

.header-logo svg {
  display: block;
  height: 32px;
  width: auto;
}

.header-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid #e3e7eb;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.header-icon-btn:hover {
  border-color: #cbd2d9;
  color: #101728;
  background: #eef0f3;
}

.header-icon-btn:focus-visible {
  outline: 2px solid #16659e;
  outline-offset: 2px;
}

.dark .header-icon-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.68);
}

.dark .header-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.92);
}

@media (max-width: 1023px) {
  .mobile-menu-btn {
    display: flex;
  }

  .sidebar-host {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 90;
    width: min(88vw, 340px);
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    background: #ffffff;
    border-right: 1px solid rgba(148, 163, 184, 0.22);
    box-shadow: 28px 0 70px -28px rgba(15, 23, 42, 0.45);
    transform: translateX(-105%);
    visibility: hidden;
    transition:
      transform 0.24s cubic-bezier(0.22, 0.9, 0.3, 1),
      visibility 0.24s;
  }

  .dark .sidebar-host {
    background: #0d1525;
    border-right-color: rgba(148, 163, 184, 0.14);
    box-shadow: 28px 0 70px -28px rgba(0, 0, 0, 0.85);
  }

  .sidebar-host.is-open {
    transform: translateX(0);
    visibility: visible;
  }

  .sidebar-host > * {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    max-width: none !important;
    min-height: 0 !important;
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .mobile-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 80;
    border: 0;
    padding: 0;
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(2px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.2s ease,
      visibility 0.2s;
  }

  .mobile-sidebar-backdrop.is-open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .header-inner {
    padding: 22px 24px 18px;
  }

  .dashboard-content-shell {
    padding: 24px 20px 40px;
  }

  .header-filters {
    display: none;
  }
}

@media (max-width: 640px) {
  .dashboard-header {
    overflow: visible;
  }

  .header-inner {
    padding: calc(14px + env(safe-area-inset-top)) 14px 14px;
  }

  .header-glow {
    filter: blur(48px);
  }

  .header-glow-blue {
    width: 280px;
    height: 150px;
    top: -90px;
    left: -60px;
  }

  .header-glow-purple {
    width: 230px;
    height: 150px;
    top: -80px;
    right: -90px;
  }

  .header-icon-btn {
    width: 42px;
    height: 42px;
    border-radius: 10px;
  }

  .head-divider,
  .header-logo {
    display: none;
  }

  .dashboard-content-shell {
    padding: 16px 12px calc(30px + env(safe-area-inset-bottom));
  }

  .app-bg-lines {
    opacity: 0.55;
  }
}

@media (max-width: 380px) {
  .header-inner {
    padding-left: 10px;
    padding-right: 10px;
  }

  .dashboard-content-shell {
    padding-left: 8px;
    padding-right: 8px;
  }

  .sidebar-host {
    width: min(92vw, 310px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-host,
  .mobile-sidebar-backdrop {
    transition: none;
  }
}
</style>
