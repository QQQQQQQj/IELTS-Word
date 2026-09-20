<!-- src/components/NuxtImg.vue -->
<template>
  <img
    :src="optimizedSrc"
    :alt="alt"
    :loading="loading"
    :width="width"
    :height="height"
  />
</template>

<script setup>
import { defineProps, computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: [String, Number], default: 'auto' },
  height: { type: [String, Number], default: 'auto' },
  loading: { type: String, default: 'lazy' }
})

// 简单模拟图像优化，生成一个优化后的图片链接（根据实际需求可以扩展）
const optimizedSrc = computed(() => {
  return props.src + '?auto=format&fit=crop&w=500&h=500'  // 示例优化，使用服务器提供的图片优化功能
})
</script>
