<script setup lang="ts">
import { BaseIcon } from '@typewords/base'
import SettingMiniDialog from '@/z-polyfill/SettingMiniDialog.vue'

type IProps = {
  padding?: boolean
}

withDefaults(defineProps<IProps>(), {
  padding: true,
})
</script>

<template>
  <div class="bg-primary text-base flex flex-col h-screen overflow-hidden box-border anim relative">
    <div class="flex justify-between p-4">
      <div class="tab bg-[#20232a] color-white py-1 px-2 rounded-md font-bold">Content Security Policy violations</div>
      <div class="flex gap-space color-gray-500">
        <BaseIcon>
          <IconFluentAdd16Regular />
        </BaseIcon>
        <BaseIcon>
          <IconFluentClock20Regular />
        </BaseIcon>
        <SettingMiniDialog />
      </div>
    </div>
    <div class="flex-1 overflow-auto" :class="padding && 'px-4'">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
