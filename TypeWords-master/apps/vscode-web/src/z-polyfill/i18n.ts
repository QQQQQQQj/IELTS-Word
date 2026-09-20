// src/plugins/i18n.ts
import { App, inject } from 'vue'
import { createI18n } from 'vue-i18n'

// 模拟 Nuxt 中的 useI18n
export function useI18n() {
  const i18n = inject('i18n') // 获取全局注入的 i18n 实例
  if (!i18n) {
    throw new Error('i18n instance is required') // 确保有 i18n 实例
  }

  const locale = i18n.global.locale
  const setLocale = (lang: string) => {
    locale.value = lang // 设置语言
  }

  return { locale, setLocale }
}

// Vue 插件用于提供全局 i18n 实例
export default {
  install(app: App) {
    // 关键：Vite 的 glob
    const modules = import.meta.glob('../../../nuxt/i18n/locales/*.json', {
      eager: true,
    })
    const messages: Record<string, any> = {}
    for (const path in modules) {
      const matched = path.match(/\/([^/]+)\.json$/)
      if (matched) {
        const locale = matched[1]
        messages[locale] = modules[path].default
      }
    }
    const i18n = createI18n({
      legacy: false,
      locale: 'zh',
      fallbackLocale: 'en',
      messages,
    })

    // 全局注入 i18n 实例
    app.provide('i18n', i18n)
    app.use(i18n)
    ;(window as any).useI18n = useI18n
  },
}
