<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouterStore } from '@store/modules/router'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import AsyncState from '@/components/common/AsyncState.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import type { Language } from 'element-plus/es/locale'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('app')

const routerStore = useRouterStore()
const { isLoadingRemoteMenu } = storeToRefs(routerStore)
const route = useRoute()
const { locale: i18nLocale } = useI18n()

// 仅"远程菜单加载中 且 当前导航无任何路由匹配"时才显示骨架：
//   - 首次进入（路由待远程注入，matched 为空）→ 必须遮挡，否则白屏
//   - 页面间跳转（如登录页 → 首页，当前页 matched 非空）→ 保持当前页面，
//     避免 AsyncState 把登录页替换成骨架造成闪屏（2026-08-12 修复）
const showRemoteMenuLoading = computed(
  () => isLoadingRemoteMenu.value && route.matched.length === 0
)

// Element Plus 语言包映射（与 src/locales/index.ts 同步）。
// 表内不存在时 fallback 到 zhCn，避免新增 locale 后忘记注册导致组件显示英文。
const elementLocales: Record<string, Language> = {
  'zh-CN': zhCn,
  'en-US': en,
}

// ElConfigProvider 全局默认值（避开 vue-tsc 对 Element Plus PropType 元数据推断报错：
// 用窄自定义类型替代 Partial<ConfigProviderProps>，避免 element-plus 元数据推断缺陷）。
// locale 跟随 Vue I18n 当前语言自动切换。
const elementConfig = computed<{
  locale: Language
  size: 'default'
  button: { autoInsertSpace: true }
}>(() => ({
  locale: elementLocales[i18nLocale.value] ?? zhCn,
  size: 'default',
  button: { autoInsertSpace: true },
}))
</script>

<template>
  <div :class="bem.b()">
    <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -- element-plus 2.14 PropType 元数据推断缺陷，template v-bind 需 as any 兜底 -->
    <ElConfigProvider v-bind="elementConfig as any">
      <ErrorBoundary>
        <!--
          remote 模式首次进入时，守卫在后台拉取菜单，
          用 AsyncState 包裹 RouterView 显示 Loading 骨架屏，
          避免用户看到空白页
        -->
        <AsyncState :loading="showRemoteMenuLoading" :error="null" :is-empty="false">
          <RouterView v-slot="{ Component }">
            <Transition name="fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </AsyncState>
      </ErrorBoundary>
    </ElConfigProvider>
  </div>
</template>

<style lang="scss">
// 路由过渡动画（全局 fade 效果，与 transition.scss 中 @keyframes vv-fade-in 配合）
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
