<script setup lang="ts">
/**
 * 演示：字段权限 view/edit/hidden 三态
 *
 * 🠶 三种"隐藏"语义对比（hidden / ignore / permission: 'hidden'）：见 docs/24-XForm使用指南.md §4.2
 *
 * 场景：
 * 1. 用户名：view（只读纯文本，不可编辑）
 * 2. 邮箱：edit（可编辑，默认）
 * 3. 内部备注：hidden（不渲染，DOM 中不出现）
 * 4. 角色选择器：edit + reaction 函数动态权限（选 'admin' 后显示"管理备注"字段，'guest' 后隐藏）
 * 5. permissionResolver 注入：业务侧把权限码（如 'user.edit'）映射为三态
 *    - 'user.edit' → mock 用户拥有 → edit 态（可编辑）
 *    - 'order.view' → 只读权限 → view 态（纯文本）
 *    - 'admin.delete' → 无权限 → hidden 态（不渲染）
 *
 * 验证方法：
 * - 用户名应只读（点击无响应）
 * - 邮箱正常输入
 * - 内部备注在 DOM 中找不到
 * - 角色切到 admin → 管理备注出现（可编辑）；切到 guest → 隐藏
 * - 第二个 XForm 中"权限码-可编辑"字段可正常输入；"权限码-只读"以只读纯文本显示；"权限码-管理员"在 DOM 中不出现
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import { useXFormDemo } from '../../composables/useXFormDemo'
import ApiTable from '../../components/ApiTable.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DocToc from '../../components/DocToc.vue'
import { permissionItems } from './configs/xform-demos-api'
import ModelPreview from '../../components/ModelPreview.vue'

const { bem, formRef, onReset, copySchema } = useXFormDemo({
  name: 'field-permission',
  schema: () => schema,
})

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

// formRef 由 useXFormDemo 统一提供

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
const formWrapRef = ref<HTMLElement | null>(null)
function checkDOM() {
  // 只查 XForm 渲染容器内的 DOM —— 页面介绍/API 表格/源码展示都含「内部备注」字样，
  // 用 document.body 检查会恒真误报
  const html = formWrapRef.value?.innerHTML ?? ''
  const hasInternal = html.includes('内部备注')
  const hasAdmin = html.includes('管理备注')
  debugInfo.value = `DOM 检查：内部备注${hasInternal ? '存在（hidden 失败）' : '不存在（hidden 成功）'}；管理备注${hasAdmin ? '存在' : '不存在'}`
}

// ---------- permissionResolver 演示：业务侧权限码 → 三态映射 ----------
// 模拟业务侧 useAuth().hasPerm 封装：当前 mock 用户拥有的权限（仅 'user.edit' / 'order.view'）
function mockHasPerm(perm: string): boolean {
  const ownedPerms = new Set(['user.edit', 'order.view'])
  return ownedPerms.has(perm)
}

// 业务侧把权限码映射为三态：拥有权限 → edit；只读权限 → view；无权限 → hidden
// 这是 XFormProps.permissionResolver 的标准注入形态（参考 types/xform.ts 阶段 2.3 契约）
const permissionResolver = (perm: string): 'view' | 'edit' | 'hidden' => {
  if (perm.endsWith('.edit')) return mockHasPerm(perm) ? 'edit' : 'hidden'
  if (perm.endsWith('.view')) return 'view'
  return 'hidden' // 未识别权限码 → 兜底隐藏（最保守的可见策略）
}

// 关键代码片段（用于 DemoField 展示）
const resolverCode = `// 业务侧把 useAuth().hasPerm 封装注入 XForm
// permission 字符串字面量（如 'user.edit'）会作为权限码传入 resolver
const permissionResolver = (perm) => {
  if (perm.endsWith('.edit')) return hasPerm(perm) ? 'edit' : 'hidden'
  if (perm.endsWith('.view')) return 'view'
  return 'hidden'  // 未识别权限码 → 兜底隐藏
}

<XForm :permission-resolver="permissionResolver" :schema="schema" :model="model" />`

// 第二个 XForm 实例：演示权限码 → resolver 映射
const formRef2 = ref<XFormExpose | null>(null)

const schemaWithCodes: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      // 权限码形式：当前用户拥有 'user.edit' → resolver 返回 'edit'（可编辑）
      name: 'editByCode',
      label: '权限码-可编辑',
      component: 'Input',
      permission: 'user.edit',
      defaultValue: '可编辑字段',
    },
    {
      // 权限码形式：'order.view' 走 .view 后缀 → resolver 返回 'view'（只读纯文本）
      name: 'viewByCode',
      label: '权限码-只读',
      component: 'Input',
      permission: 'order.view',
      defaultValue: '只读字段',
    },
    {
      // 权限码形式：当前用户无 'admin.delete' → resolver 返回 'hidden'（不渲染）
      name: 'adminByCode',
      label: '权限码-管理员',
      component: 'Input',
      permission: 'admin.delete',
      defaultValue: '此字段不渲染',
    },
  ],
}

const model2 = reactive<Record<string, unknown>>({
  editByCode: '可编辑字段',
  viewByCode: '只读字段',
  adminByCode: '此字段不渲染',
})

const tocItems = [
  { id: 'demo-field-permission', label: '权限演示' },
  { id: 'demo-permission-resolver', label: 'permissionResolver 注入' },
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
        '5) permissionResolver 注入:把权限码字符串（如 user.edit）映射为三态',
      ]"
    >
      <section id="demo-field-permission">
        <DemoField label="三态权限演示" :code="permissionCode">
          <div :class="bem.b()">
            <div ref="formWrapRef">
              <XForm ref="formRef" :schema="schema" :model="model" />
            </div>
            <div :class="bem.e('actions')">
              <el-button @click="onReset">重置</el-button>
              <el-button type="primary" @click="onSave">保存</el-button>
              <el-button @click="copySchema">复制 schema</el-button>
              <el-button @click="checkDOM">检查 DOM</el-button>
            </div>
            <div :class="bem.e('debug')">
              <ModelPreview :model="model" />
              <div v-if="debugInfo" :class="bem.e('debug-info')">{{ debugInfo }}</div>
            </div>
          </div>
        </DemoField>
      </section>

      <section id="demo-permission-resolver">
        <DemoField label="permissionResolver 注入" :code="resolverCode">
          <div :class="bem.b()">
            <div :class="bem.e('resolver-section')">
              <XForm
                ref="formRef2"
                :schema="schemaWithCodes"
                :model="model2"
                :permission-resolver="permissionResolver"
              />
              <p :class="bem.e('resolver-hint')">说明：</p>
              <ul :class="bem.e('resolver-list')">
                <li>
                  <code>user.edit</code>
                  → 当前用户拥有 → edit 态（可编辑）
                </li>
                <li>
                  <code>order.view</code>
                  → 只读权限 → view 态（纯文本）
                </li>
                <li>
                  <code>admin.delete</code>
                  → 无权限 → hidden 态（不渲染）
                </li>
              </ul>
            </div>
          </div>
        </DemoField>
      </section>

      <ApiTable
        title="permission 字段 + permissionResolver 注入"
        :items="permissionItems"
        anchor="api-permission"
      />
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
  }
  &__debug-info {
    margin-top: 8px;
    color: #409eff;
  }
  &__resolver-section {
    margin-top: 8px;
  }
  &__resolver-hint {
    margin-top: 12px;
    color: #303133;
    font-weight: 500;
  }
  &__resolver-list {
    margin-top: 8px;
    padding-left: 20px;
    color: #606266;
    line-height: 1.8;
    list-style: disc;
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
