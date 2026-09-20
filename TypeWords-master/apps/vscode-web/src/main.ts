import { createApp } from 'vue'
import './assets/css/main.scss'
import 'virtual:uno.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import './global.d'
import loadingDirective from './directives/loading.tsx'
import i18nPlugin from './z-polyfill/i18n.ts'
import nuxtLinkPlugin from './z-polyfill/nuxtLink.ts'
import nuxtImgPlugin from './z-polyfill/nuxtImg.ts'

const pinia = createPinia()
const app = createApp(App)

;(window as any).useHead = () => {}
;(window as any).useRuntimeConfig  = () =>({})
;(window as any).useSeoMeta = () => {}
;(window as any).useRoute = () => ({})
;(window as any).useRouter = () => ({ push() {}, replace() {} })

app.use(i18nPlugin)
app.use(nuxtLinkPlugin)
app.use(nuxtImgPlugin)
app.use(VueVirtualScroller)
app.use(pinia)
app.use(router)

app.directive('opacity', (el, binding) => {
  el.style.opacity = binding.value ? 1 : 0
})
app.directive('loading', loadingDirective)
app.mount('#app')
