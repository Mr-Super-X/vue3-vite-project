import type { App } from 'vue'
import { permission } from './permission'

export function setupDirectives(app: App): void {
  app.directive('permission', permission)
}
