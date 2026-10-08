<script setup lang="ts">
import Toaster from '@/components/ui/toast/Toaster.vue'
import { SidebarProvider } from "@/components/ui/sidebar"
</script>

<template>
  <SidebarProvider>
    <Toaster position="top-right" />
    <router-view />
  </SidebarProvider>
</template>

