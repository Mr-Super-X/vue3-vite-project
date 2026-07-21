import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './locales'
import Directives from '@/directives'
import GlobalComponents from '@/components'
import Plugins from '@/plugins'

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
app.use(Directives)
app.use(Plugins)

app.mount('#app')
