<script setup lang="ts">
/**
 * 字段级渲染容器（渲染层重构 B-2）
 *
 * 为什么需要：XForm 模板里 <component :is="renderToComponent(node)"> 在父组件 render effect
 * 中执行，内部的 get(model, name) 被父组件追踪 —— 任一字段输入都触发全表单 vnode 重建。
 * 下沉到本组件后，每个字段的 render effect 独立追踪自己的 get(model)，
 * 输入单字段只重渲该字段，其余字段的 vnode 完全不动。
 *
 * el-form 的 provide/inject 沿组件祖先链传递，中间多一层组件不影响 ElFormItem 注册。
 */
import type { VNode } from 'vue'
import type { SchemaNode } from './types'

const props = defineProps<{
  node: SchemaNode
  renderFn: (node: SchemaNode) => VNode | string | VNode[] | undefined
}>()
</script>

<template>
  <!-- 与 XForm 原模板保持同一 :is 调用形态，行为 1:1 迁移 -->
  <component :is="props.renderFn(props.node)" />
</template>
