// src/plugins/nuxtLink.ts
import { App } from 'vue'
import NuxtLink from './NuxtLink.vue'

export default {
  install(app: App) {
    app.component('NuxtLink', NuxtLink)
  }
}
