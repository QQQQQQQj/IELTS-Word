<script setup lang="ts">
defineOptions({ name: 'HoverReveal' })
</script>

<template>
  <div class="hover-reveal" v-bind="$attrs">
    <slot />
    <span class="hover-reveal__content">
      <slot name="hover" />
    </span>
  </div>
</template>

<style scoped lang="scss">
.hover-reveal {
  &__content {
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
  }

  &:hover &__content {
    opacity: 1;
  }
}
</style>
