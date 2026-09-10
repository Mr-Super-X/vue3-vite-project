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

const note = ref('')
const todoItems = [
  '四模式布局切换（顶栏右侧 LayoutSwitcher）',
  '侧边栏折叠 / 页签右键菜单',
  '主题明暗切换',
  '中英文切换',
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
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-workbench-home {
  padding: var(--app-content-padding);

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
