<script setup lang="ts">
/**
 * 工作台首页（workbench 模块 index 子路由）。
 *
 * 验收要点：页签切换后本页输入框内容应保留（keep-alive 缓存生效，
 * 组件 name 'Workbench' 与路由 name 对齐是缓存命中前提）。
 *
 * @group 业务模块：Workbench
 */
defineOptions({ name: 'Workbench' })

const bem = createNamespace('workbench-home')

// 项目路由封装（unplugin-auto-import 注入 @composables/*），按 name 跳转（类型安全，禁止直接 useRouter）
const { pushByName } = useAppRouter()

const note = ref('')
const todoItems = [
  '四模式布局切换（顶栏右侧 LayoutSwitcher）',
  '侧边栏折叠 / 页签右键菜单',
  '主题明暗切换',
  '中英文切换',
]

/** 四栖能力演示入口：免登录白名单页不在左侧菜单，从这里直达（/autoplan Phase 2 D-IA-1） */
const panelLinks = [
  { name: 'Home', label: '门户首页演示', desc: 'portal 顶部导航布局（亦在左侧菜单"首页"）' },
  { name: 'H5Demo', label: 'H5 移动端演示', desc: 'rem 适配 · 桌面打开后请用 DevTools 设备模拟' },
  { name: 'BigDemo', label: '数据大屏演示（1920）', desc: 'transform scale 等比缩放' },
  {
    name: 'BigDemoWide',
    label: '超宽拼接屏演示（9000×1080）',
    desc: 'meta.bigScreen 异形设计稿',
  },
]
</script>

<template>
  <div :class="bem.b()">
    <el-card shadow="never">
      <template #header>
        <span :class="bem.e('heading')">工作台首页</span>
      </template>
      <p :class="bem.e('desc')">
        本模块用于验收 default 布局复刻效果，路由挂载于
        <code>@/layouts/default/index.vue</code>
        。
      </p>
      <el-input
        v-model="note"
        :class="bem.e('input')"
        type="textarea"
        :rows="3"
        placeholder="在此输入内容，切换到其他页签再切回——内容保留即 keep-alive 缓存生效"
      />
    </el-card>

    <el-card shadow="never" :class="bem.e('card')">
      <template #header>
        <span :class="bem.e('heading')">验收清单</span>
      </template>
      <ul :class="bem.e('list')">
        <li v-for="item in todoItems" :key="item">{{ item }}</li>
      </ul>
    </el-card>

    <el-card shadow="never" :class="bem.e('card')">
      <template #header>
        <span :class="bem.e('heading')">四栖能力演示</span>
      </template>
      <ul :class="bem.e('list')">
        <li v-for="item in panelLinks" :key="item.name">
          <el-link type="primary" @click="pushByName(item.name)">{{ item.label }}</el-link>
          —— {{ item.desc }}
        </li>
      </ul>
    </el-card>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-workbench-home {
  // 页面级 padding 由布局层 AppView __content 统一提供（--app-content-padding），
  // 视图不再自加——曾双层叠加导致 48px 大间距（2026-09-10 反馈修复）
  &__heading {
    font-size: 15px;
    font-weight: 600;
  }

  &__desc {
    margin: 0 0 12px;
    color: var(--el-text-color-secondary);
  }

  &__input {
    max-width: 560px;
  }

  &__card {
    margin-top: 16px;
  }

  &__list {
    margin: 0;
    padding-left: 18px;
    line-height: 2;
    color: var(--el-text-color-regular);
  }
}
</style>
