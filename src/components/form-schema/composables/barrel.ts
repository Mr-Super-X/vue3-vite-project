/**
 * composables/barrel —— form-schema composables 公共 barrel
 *
 * 设计：所有 composables 子模块（resolve-component / compile-rules / wrap-with-elcol /
 * build-slots）的对外 API 在此处 re-export，未来新代码应从这里 import。
 *
 * 历史：原 re-exports 由 render-schema-node.ts 兼任，但该文件本质是渲染调度器，
 *      不应承担 barrel 职责。新建本文件作为正式 barrel，旧 re-export 暂保留
 *      在 render-schema-node.ts 中用于兼容，等所有调用方迁移后清除。
 *
 * 调用方迁移指引：
 * - import { resolveComponentFor } from './render-schema-node'
 *   ↓ 改为
 * - import { resolveComponentFor } from './composables/barrel'
 */
export {
  EL_COMPONENT_MAP,
  resolveComponentFor,
  isElUpload,
  isPictureCardUpload,
  isDragUpload,
} from './resolve-component'

export { compileRules } from './compile-rules'

export {
  wrapWithElCol,
  pickBreakpointConfig,
  mergeColResponsive,
  mergeRowResponsive,
} from './wrap-with-elcol'

export {
  renderChildren,
  buildSlotFn,
  buildUploadDefaultSlot,
  buildUploadTipSlot,
  getComponentDefaultProps,
  buildAsyncProps,
} from './build-slots'
