import type { App } from 'vue'
import inputDebounce from './inputDebounce'
import buttonDebounce from './buttonDebounce'
import permission from './permission'

/**
 * 暴露一个 install 方法，在 use 该方法时会自动传入 app、options
 * 可以使用 app.use 来注册插件
 *
 * 注册的指令：
 * - v-inputDebounce:    input 输入防抖（v-inputDebounce:1000="onInput"）
 * - v-buttonDebounce:   button 点击节流防重（v-buttonDebounce:500="onClick"）
 * - v-permission:       权限控制（v-permission="['user:edit']"）
 *
 * 所有指令统一 install 模式（导出 default 对象含 install 方法），
 * 保持项目内指令注册风格一致。
 */
const install = (app: App): void => {
  app.use(inputDebounce)
  app.use(buttonDebounce)
  app.use(permission)
}

export default install
