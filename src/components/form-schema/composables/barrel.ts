/**
 * composables/barrel —— form-schema composables 内部子模块互用 barrel
 *
 * 职责：集中 re-export 渲染调度相关的公共工具函数（resolve-component / compile-rules /
 * wrap-with-elcol / build-slots），供 composables/ 内其他子模块（render-form-item /
 * render-array-node / render-visual-container / use-xform-composer 等）使用，
 * 避免互相"过桥 import"中转渲染调度器。
 *
 * 与 form-schema 对外入口的关系：
 * - 本文件是 composables/ 内部互用的"私有 barrel"——非 form-schema 对外公共 API
 * - 业务方应通过 `src/components/form-schema/index.ts` 消费 XForm 组件与对外 composable
 * - 添加新公共 API 到本文件时需同步评估是否应暴露到 form-schema/index.ts
 *
 * 不进 barrel 的子模块（仅 composables/ 内部使用，YAGNI 不对外暴露）：
 * - with-hidden / apply-directives / render-with-grid / array-row-key
 * - build-vmodel-bindings / build-on-bindings / validate-component-props
 * - use-* 系列 hooks（这些走 form-schema/index.ts 单独 export）
 *
 * 类型与内部 hook（不在 barrel）：
 * - useRenderSchemaNode / RenderSchemaNodeOptions —— 仅渲染调度器本职，调用方直接 `./render-schema-node`
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
