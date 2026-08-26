<script setup lang="ts">
/**
 * 演示：字段权限 view/edit/hidden 三态
 *
 * 场景：
 * 1. 用户名：view（只读纯文本，不可编辑）
 * 2. 邮箱：edit（可编辑，默认）
 * 3. 内部备注：hidden（不渲染，DOM 中不出现）
 * 4. 角色选择器：edit + reaction 函数动态权限（选 'admin' 后显示"管理备注"字段，'guest' 后隐藏）
 *
 * 验证方法：
 * - 用户名应只读（点击无响应）
 * - 邮箱正常输入
 * - 内部备注在 DOM 中找不到
 * - 角色切到 admin → 管理备注出现（可编辑）；切到 guest → 隐藏
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { permissionItems } from './xform-demos-api'

const bem = createNamespace('demo-x-form-field-permission')

// 关键代码片段（用于 DemoField 展示）
const permissionCode = `// view 态:渲染为只读纯文本
{
  name: 'username',
  label: '用户名',
  permission: 'view',          // ← 字面量
}

// hidden 态:不渲染该字段
{
  name: 'internalNote',
  label: '内部备注',
  permission: 'hidden',
}

// 动态权限:函数形式,根据 model 决定
{
  name: 'adminNote',
  label: '管理备注',
  permission: (m) => m.role === 'admin' ? 'edit' : 'hidden',
}`

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      // view 态：只读纯文本
      name: 'username',
      label: '用户名',
      component: 'Input',
      permission: 'view',
      defaultValue: 'guest',
    },
    {
      // edit 态：默认行为
      name: 'email',
      label: '邮箱',
      component: 'Input',
      defaultValue: 'guest@example.com',
      rules: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
      ],
    },
    {
      // hidden 态：不渲染
      name: 'internalNote',
      label: '内部备注',
      component: 'Input',
      permission: 'hidden',
      defaultValue: '敏感信息,不对外展示',
    },
    {
      // 角色选择器（edit）—— 触发 adminNote 的权限切换
      name: 'role',
      label: '角色',
      component: 'Select',
      defaultValue: 'guest',
      props: {
        options: [
          { value: 'guest', label: '访客' },
          { value: 'user', label: '普通用户' },
          { value: 'admin', label: '管理员' },
        ],
      },
    },
    {
      // 动态权限：函数形式
      name: 'adminNote',
      label: '管理备注',
      component: 'Input',
      permission: (m: Record<string, unknown>) => (m.role === 'admin' ? 'edit' : 'hidden'),
    },
  ],
}

const model = reactive<Record<string, unknown>>({
  username: 'guest',
  email: 'guest@example.com',
  internalNote: '敏感信息,不对外展示',
  role: 'guest',
  adminNote: '',
})

const formRef = ref<XFormExpose | null>(null)

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败')
    return
  }
  ElMessage.success(`提交成功：${JSON.stringify(model, null, 2)}`)
}

const debugInfo = ref('')
function checkDOM() {
  const hasInternal = document.body.innerHTML.includes('内部备注')
  const hasAdmin = document.body.innerHTML.includes('管理备注')
  debugInfo.value = `DOM 检查：内部备注${hasInternal ? '存在（hidden 失败）' : '不存在（hidden 成功）'}；管理备注${hasAdmin ? '存在' : '不存在'}`
}

const tocItems = [
  { id: 'demo-field-permission', label: '权限演示' },
  { id: 'api-permission', label: 'permission 字段' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="字段权限 view/edit/hidden 三态"
      source="src/components/form-schema/composables/use-field-permission.ts"
      :introductions="[
        '字段级 view / edit / hidden 权限控制。',
        '1) 用户名 view 态:渲染为只读纯文本',
        '2) 邮箱 edit 态:默认行为,正常可编辑',
        '3) 内部备注 hidden 态:不渲染该字段',
        '4) 角色切换演示动态权限:admin 角色显示管理备注,guest 隐藏',
      ]"
    >
      <section id="demo-field-permission">
        <DemoField label="三态权限演示" :code="permissionCode">
          <div :class="bem.b()">
            <XForm ref="formRef" :schema="schema" :model="model" />
            <div :class="bem.e('actions')">
              <el-button type="primary" @click="onSave">保存</el-button>
              <el-button @click="checkDOM">检查 DOM</el-button>
            </div>
            <div :class="bem.e('debug')">
              <div>当前 model：</div>
              <pre>{{ JSON.stringify(model, null, 2) }}</pre>
              <div v-if="debugInfo" :class="bem.e('debug-info')">{{ debugInfo }}</div>
            </div>
          </div>
        </DemoField>
      </section>

      <ApiTable title="permission 字段" :items="permissionItems" anchor="api-permission" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-field-permission {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
  &__debug {
    margin-top: 16px;
    font-size: 12px;
    color: #909399;
    pre {
      background: #f5f7fa;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Menlo', 'Consolas', monospace;
      overflow-x: auto;
      margin: 4px 0;
    }
  }
  &__debug-info {
    margin-top: 8px;
    color: #409eff;
  }
}

// 全局样式：view 态字段
.x-form-view-field {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
  &__label {
    color: #909399;
  }
  &__value {
    color: #303133;
  }
}
</style>
