<script setup lang="ts">
/**
 * 演示：useFormPersist —— 表单草稿持久化
 *
 * 【验证流程】
 * 1. 填"用户名"和"银行卡号"
 * 2. 观察状态面板：lastSavedAt 更新（防抖 400ms 后自动落盘）
 * 3. 刷新页面（F5）→ hasDraft=true，表单回到空值
 * 4. 点"恢复草稿"→ 用户名恢复、银行卡号不恢复（exclude 生效）→ isDirty=false（草稿为新基线）
 * 5. 点"模拟提交"→ 草稿清除，再刷新 hasDraft=false
 * 6. DevTools Application 面板可直接查看 localStorage 中的草稿内容（确认无 cardNo）
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElButton, ElMessage, ElTag } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import { useFormPersist } from '@/components/form-schema'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import DemoField from '../components/DemoField.vue'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { persistItems } from './xform-demos-api'
import DocLayout from '../layouts/DocLayout.vue'
import persistSource from './XFormPersist.vue?raw'

const bem = createNamespace('demo-x-form-persist')

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      props: { placeholder: '请输入用户名', clearable: true },
    },
    {
      label: '银行卡号（敏感字段，不落盘）',
      name: 'cardNo',
      component: 'Input',
      props: { placeholder: '刷新后不会恢复（exclude 演示）', clearable: true },
    },
    {
      label: '邮箱',
      name: 'email',
      component: 'Input',
      props: { placeholder: '请输入邮箱', clearable: true },
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
  username: '',
  cardNo: '',
  email: '',
  bio: '',
})

const persist = useFormPersist({
  key: 'demo.x-form-persist.draft',
  model,
  exclude: ['cardNo'], // 敏感字段不落 localStorage
})

const formRef = ref<XFormExpose | null>(null)
const isDirtyState = ref(false)

function refreshDirty() {
  isDirtyState.value = formRef.value?.isDirty() ?? false
}

// XForm 无 change 事件（XForm.vue 未定义 emits），用 watch(model, deep) 同步 isDirty（同 XFormSchemaIndex 模式）
watch(model, refreshDirty, { deep: true })

function onRestore() {
  if (!persist.hasDraft.value) {
    ElMessage.warning('当前没有草稿（先填几个字段刷新页面再试）')
    return
  }
  persist.load()
  formRef.value?.resetDirty() // 草稿为新基线：isDirty 从草稿起算
  refreshDirty()
  ElMessage.success('草稿已恢复（银行卡号被 exclude 剔除）')
}

function onClear() {
  persist.clear()
  ElMessage.success('草稿已清除')
}

function onSimulateSubmit() {
  // 模拟提交成功：清草稿 + 拍新基线
  persist.clear()
  formRef.value?.resetDirty()
  refreshDirty()
  ElMessage.success('模拟提交成功：草稿已清除、dirty 已归零')
}

const lastSavedText = computed(() =>
  persist.lastSavedAt.value === null
    ? '尚未保存'
    : new Date(persist.lastSavedAt.value).toLocaleTimeString()
)
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="useFormPersist —— 表单草稿持久化"
      source="src/components/form-schema/composables/use-form-persist.ts"
      :introductions="[
        'model 防抖（400ms）自动落盘 + beforeunload 同步 flush 兜底：刷新页面前 400ms 内的输入也不会丢。',
        'exclude 敏感字段剔除（银行卡号不落 localStorage）；hasDraft / load / save / clear 按需恢复与手动补丁。',
        '恢复草稿后 resetDirty() 拍基线，isDirty 从草稿起算；提交成功后 clear() 清草稿。',
      ]"
    >
      <section id="demo-x-form-persist">
        <DemoField :code="persistSource">
          <div :class="bem.b()">
            <div :class="bem.e('status')">
              <ElTag :type="persist.hasDraft.value ? 'warning' : 'info'">
                草稿：{{ persist.hasDraft.value ? '存在' : '无' }}
              </ElTag>
              <ElTag type="success">最后保存：{{ lastSavedText }}</ElTag>
              <ElTag :type="isDirtyState ? 'danger' : 'success'">
                isDirty：{{ isDirtyState ? '是' : '否' }}
              </ElTag>
            </div>

            <XForm ref="formRef" :schema="schema" :model="model" />

            <div :class="bem.e('actions')">
              <ElButton type="primary" @click="onRestore">恢复草稿（load + resetDirty）</ElButton>
              <ElButton @click="onClear">清除草稿（clear）</ElButton>
              <ElButton type="success" @click="onSimulateSubmit">
                模拟提交（clear + resetDirty）
              </ElButton>
            </div>

            <p :class="bem.e('hint')">
              验证步骤：① 填用户名 + 银行卡号 → ② F5 刷新 → ③ 点"恢复草稿"：
              用户名恢复、银行卡号不恢复 → ④ 点"模拟提交" → ⑤ 再刷新：草稿已无。
            </p>
          </div>
        </DemoField>
      </section>

      <ApiTable title="useFormPersist API" :items="persistItems" anchor="api-persist" />
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-persist {
  &__status {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  &__actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }
  &__hint {
    margin-top: 12px;
    font-size: 13px;
    color: #909399;
  }
}
</style>
