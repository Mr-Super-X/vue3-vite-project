import type { App } from 'vue'
import inputDebounce from './inputDebounce'
import buttonDebounce from './buttonDebounce'
import { permission } from './permission'

/**
 * 暴露一个 install 方法，在 use 该方法时会自动传入 app、options
 * 可以使用 app.use 来注册插件
 *
 * 注册的指令：
 * - v-inputDebounce:    input 输入防抖（v-inputDebounce:1000="onInput"）
 * - v-buttonDebounce:   button 点击节流防重（v-buttonDebounce:500="onClick"）
 * - v-permission:       权限控制（v-permission="['user:edit']"）
 */
const install = (app: App): void => {
  // input 输入防抖指令
  app.use(inputDebounce)
  // button 点击防抖指令
  app.use(buttonDebounce)
  // permission 是纯 Directive 对象（非 install 插件），用 app.directive 直接注册
  app.directive('permission', permission)
}

export default install
