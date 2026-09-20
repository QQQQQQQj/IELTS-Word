<script setup lang="ts">
import { useSettingStore } from '@typewords/core/stores/setting.ts'
import BasePage from '@/z-polyfill/BasePage.vue'

const settingStore = useSettingStore()
defineProps<{
  panelLeft: string
}>()
</script>

<template>
  <BasePage :padding="false">
    <div class="flex flex-col h-full justify-center relative">
      <div class="flex-1 overflow-hidden">
        <div class="overflow-auto h-full box-content">
          <slot name="practice"></slot>
        </div>
      </div>
      <div
        class="panel-wrap"
        :class="{ 'has-panel': settingStore.showPanel }"
        @click.self="settingStore.showPanel = false"
      >
        <slot name="panel"></slot>
      </div>
      <div class="shrink-0">
        <slot name="footer"></slot>
      </div>
    </div>
  </BasePage>
</template>

<style scoped lang="scss">
.panel-wrap {
  position: fixed;
  top: 0.8rem;
  z-index: 9999;
  height: calc(100vh - 1.8rem);
  right: 0;
}
</style>
