<template>
  <router-link :to="to" :active-class="activeClass" :exact-active-class="exactActiveClass">
    <slot></slot>
  </router-link>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  to: { type: [String, Object], required: true },
  activeClass: { type: String, default: 'router-link-active' },
  exactActiveClass: { type: String, default: 'router-link-exact-active' },
})
</script>
