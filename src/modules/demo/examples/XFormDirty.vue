<script setup lang="ts">
/**
 * 演示：表单 dirty 状态追踪（阶段 2.2 新增）
 *
 * 场景：
 * 1. 加载表单 → isDirty() = false（无 snapshot）
 * 2. 点击"标记基线"(resetDirty) → isDirty() = false（snapshot 拍下）
 * 3. 修改任意字段 → isDirty() = true，getDirtyFields() 列出字段名
 * 4. 点击"标记基线" → isDirty() = false（snapshot 重拍）
 * 5. 模拟"未保存提示"：点击"关闭表单"，若 dirty 则 confirm
 *
 * 验证方法：
 * - 依次操作上述场景，观察 isDirty 按钮状态变化
 * - getDirtyFields 列表实时更新
 */
import { reactive, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'

const bem = createNamespace('demo-x-form-dirty')

// 关键代码片段（用于 DemoField 展示）
const dirtyCode = `// 标记基线：snapshot 拍下
formRef.value?.resetDirty()

// 检查 dirty 状态
formRef.value?.isDirty()              // true/false
formRef.value?.getDirtyFields()       // ['email', 'bio']
formRef.value?.isTouched('email')     // true/false

// 未保存提示
if (formRef.value?.isDirty()) {
  await ElMessageBox.confirm('有未保存的修改，确定关闭吗？')
}`

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      props: { placeholder: '请输入用户名', clearable: true },
      defaultValue: 'guest',
    },
    {
      label: '邮箱',
      name: 'email',
      component: 'Input',
      props: { placeholder: '请输入邮箱', clearable: true },
    },
    {
      label: '年龄',
      name: 'age',
      component: 'InputNumber',
      props: { min: 0, max: 150, controlsPosition: 'right' },
      defaultValue: 18,
    },
    {
      label: '简介',
      name: 'bio',
      component: 'Input',
      props: { type: 'textarea', rows: 2, placeholder: '一句话介绍' },
    },
  ],
}

const model = reactive<Record<string, unknown>>({
  username: 'guest',
  email: '',
  age: 18,
  bio: '',
})

const formRef = ref<XFormExpose | null>(null)

/** 每次 resetDirty 后立即查询一次（响应式 trigger 还没跑完时） */
const isDirtyState = ref(false)
const dirtyFieldsState = ref<string[]>([])

function refreshDirtyState() {
  isDirtyState.value = formRef.value?.isDirty() ?? false
  dirtyFieldsState.value = formRef.value?.getDirtyFields() ?? []
}

function onMarkBaseline() {
  formRef.value?.resetDirty()
  refreshDirtyState()
  ElMessage.success('已标记当前状态为基线（dirty 已重置）')
}

function onResetFields() {
  formRef.value?.resetFields()
  refreshDirtyState()
  ElMessage.info('表单字段已重置（但 dirty 状态保留初始 snapshot）')
}

async function onCloseForm() {
  if (!formRef.value) return
  if (formRef.value.isDirty()) {
    const fields = formRef.value.getDirtyFields().join(', ')
    try {
      await ElMessageBox.confirm(
        `表单有未保存的修改（字段：${fields}）。确定关闭吗？`,
        '未保存提示',
        { type: 'warning' }
      )
      ElMessage.success('已关闭（用户确认放弃修改）')
    } catch {
      ElMessage.info('已取消关闭')
    }
  } else {
    ElMessage.success('表单无修改，直接关闭')
  }
}

/** 实时监控：每个字段的 isTouched 状态 */
const touchedStatus = computed(() => {
  if (!formRef.value) return {} as Record<string, boolean>
  return {
    username: formRef.value.isTouched('username'),
    email: formRef.value.isTouched('email'),
    age: formRef.value.isTouched('age'),
    bio: formRef.value.isTouched('bio'),
  }
})

/** 监听 model 变化 → 刷新 dirty 状态显示 */
import { watch } from 'vue'
watch(
  () => [model.username, model.email, model.age, model.bio],
  () => refreshDirtyState(),
  { deep: true }
)
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="表单 dirty 状态追踪（阶段 2.2）"
      source="src/components/form-schema/composables/use-form-dirty.ts"
      :introductions="[
        '演示 XForm 阶段 2.2 新增：isDirty / getDirtyFields / isTouched / resetDirty 方法。',
        '1) 加载表单后 isDirty = false（lazy snapshot，未拍基线）',
        '2) 点击「标记基线」后 snapshot 拍下，isDirty = false',
        '3) 修改任意字段后 isDirty = true，getDirtyFields 列出字段',
        '4) 「未保存提示」按钮模拟关闭表单场景',
      ]"
    >
      <section id="demo-dirty">
        <DemoField label="dirty 追踪：4 字段表单 + 实时状态显示" :code="dirtyCode">
          <div :class="bem.b()">
            <XForm ref="formRef" :schema="schema" :model="model" />
            <div :class="bem.e('status')">
              <div>
                isDirty:
                <strong :class="isDirtyState ? bem.e('dirty-yes') : bem.e('dirty-no')">
                  {{ isDirtyState ? '是（有未保存修改）' : '否（无修改）' }}
                </strong>
              </div>
              <div>
                dirty 字段:
                <strong>
                  {{ dirtyFieldsState.length === 0 ? '（无）' : dirtyFieldsState.join(', ') }}
                </strong>
              </div>
              <div>
                字段级 touched：
                <ul :class="bem.e('touched')">
                  <li>username: {{ touchedStatus.username ? '✓' : '·' }}</li>
                  <li>email: {{ touchedStatus.email ? '✓' : '·' }}</li>
                  <li>age: {{ touchedStatus.age ? '✓' : '·' }}</li>
                  <li>bio: {{ touchedStatus.bio ? '✓' : '·' }}</li>
                </ul>
              </div>
            </div>
            <div :class="bem.e('actions')">
              <el-button @click="onMarkBaseline">标记基线（resetDirty）</el-button>
              <el-button @click="onResetFields">重置字段（resetFields）</el-button>
              <el-button type="danger" @click="onCloseForm">关闭表单（模拟未保存提示）</el-button>
            </div>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-dirty {
  &__status {
    margin-top: 16px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.8;
  }
  &__dirty-yes {
    color: #f56c6c;
  }
  &__dirty-no {
    color: #67c23a;
  }
  &__touched {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    li {
      padding: 2px 8px;
      background: #fff;
      border-radius: 3px;
    }
  }
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}
</style>
