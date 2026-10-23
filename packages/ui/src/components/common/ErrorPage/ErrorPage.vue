<script setup lang="ts">
/**
 * 通用错误页（403 / 404 / 500）——统一 6 app 错误页模式。
 *
 * 背景：monorepo 迁移前错误页模式重复且不一致——5 端 404 各自手写 h1 + 返回按钮，
 * admin 的 404/403/500 则完全没有行动按钮（体验最差）。本组件把「状态码 + 说明文案 +
 * 返回按钮」收敛为单一实现，admin 借此补齐返回按钮缺口，6 app 行为对齐。
 *
 * 用法（@vv/ui components/common 目录组件，全局自动注册，模板直接用，无须 import——CLAUDE.md §1.7）：
 *   <ErrorPage status="404" title="页面不存在" return-to="/workbench" return-label="返回工作台" />
 *
 * @group 通用组件
 */
import { useAppRouter } from '@vv/shared'

/** 支持的 HTTP 错误状态码 */
type ErrorPageStatus = 403 | 404 | 500

interface Props {
  /** HTTP 状态码：403 无权访问 / 404 页面不存在 / 500 服务器错误 */
  status: ErrorPageStatus
  /** 状态码下方的业务说明文案（el-result sub-title） */
  title: string
  /** 返回按钮目标路由路径（如 '/workbench'）；用 router.push 跳转，与消费方迁移前行为一致 */
  returnTo: string
  /** 返回按钮文案（如 '返回工作台'） */
  returnLabel: string
}

const props = defineProps<Props>()

// 包内显式 import @vv/shared（ui → shared 为合法依赖方向，vitest 环境 auto-import 未注入 useAppRouter）；
// createNamespace 由 unplugin-auto-import 注入
const { router } = useAppRouter()

// 状态码 → el-result icon 映射：403 warning / 404 info / 500 error
// （语义对齐迁移前 admin error 模块三视图的既有用法，保持一致体验）
const ICON_MAP: Record<ErrorPageStatus, string> = {
  403: 'warning',
  404: 'info',
  500: 'error',
}

async function goBack(): Promise<void> {
  await router.push(props.returnTo)
}

const bem = createNamespace('error-page')
</script>

<template>
  <div :class="bem.b()">
    <el-result :icon="ICON_MAP[status]" :title="String(status)" :sub-title="title">
      <template #extra>
        <el-button type="primary" @click="goBack">{{ returnLabel }}</el-button>
      </template>
    </el-result>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-error-page {
}
</style>
