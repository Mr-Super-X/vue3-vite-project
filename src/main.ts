import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './locales'
import { setupDirectives } from './directives'
import GlobalComponents from '@/components'

// 浏览器基线统一（必须在所有自定义样式之前）。
// 详见 https://necolas.github.io/normalize.css/
import 'normalize.css'
import 'element-plus/dist/index.css'
import 'virtual:uno.css'
import '@/assets/styles/index.scss'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(GlobalComponents)
setupDirectives(app)

// 全局错误兜底
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue Error]', err, info)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
})

app.mount('#app')
