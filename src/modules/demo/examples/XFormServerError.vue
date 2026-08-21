<script setup lang="ts">
/**
 * 演示 P2-2 setFieldError 服务端错误映射 + 配合 P2-1 响应式断点
 *
 * 场景:
 * 1. 表单提交 → 后端返回 422 with errors[] (field, message)
 * 2. 前端解析 errors → 循环调用 XFormExpose.setFieldError(field, message)
 * 3. UI 显示红字(后端 422 自动映射)
 *
 * setFieldError API(P0-2 已实现):
 *   formRef.value?.setFieldError('email', '该邮箱已注册')
 *
 * 注:本 demo 用 mock 模拟 fetch(不真实发请求),演示完整流程
 */
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormServerError.vue?raw'

const bem = createNamespace('demo-dgm-form-server-error')

// P2-1:响应式断点显示
const currentBreakpoint = ref<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')
const width = ref(0)
const updateBreakpoint = () => {
  if (typeof window === 'undefined') return
  width.value = window.innerWidth
  if (width.value < 768) currentBreakpoint.value = 'xs'
  else if (width.value < 992) currentBreakpoint.value = 'sm'
  else if (width.value < 1200) currentBreakpoint.value = 'md'
  else if (width.value < 1920) currentBreakpoint.value = 'lg'
  else currentBreakpoint.value = 'xl'
}
onMounted(() => {
  updateBreakpoint()
  window.addEventListener('resize', updateBreakpoint)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateBreakpoint)
})

const schema: SchemaNode = {
  // P2-1:响应式断点 —— 手机全宽,桌面 6/6/12
  row: { gutter: 16, responsive: { xs: { gutter: 0 }, md: { gutter: 16 } } },
  children: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, md: { span: 6 } } },
      rules: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    } as SchemaNode,
    {
      label: '邮箱',
      name: 'email',
      component: 'Input',
      col: { responsive: { xs: { span: 24 }, md: { span: 6 } } },
      rules: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
      ],
    } as SchemaNode,
    {
      label: '密码',
      name: 'password',
      component: 'Input',
      props: { type: 'password' },
      col: { responsive: { xs: { span: 24 }, md: { span: 12 } } },
      rules: [{ required: true, message: '请输入密码', trigger: 'blur' }],
    } as SchemaNode,
  ],
}

const model = reactive<Record<string, unknown>>({
  username: '',
  email: '',
  password: '',
})

const formRef = ref<XFormExpose | null>(null)

/**
 * 模拟后端 422 响应
 * 真实场景:fetch('/api/users', { method: 'POST', body: ... })
 *           失败时 response.json() = { errors: [{ field, message }, ...] }
 */
const mockSaveToBackend = async (
  data: Record<string, unknown>
): Promise<{ success: boolean; errors?: Array<{ field: string; message: string }> }> => {
  // 模拟 500ms 网络延迟
  await new Promise((r) => setTimeout(r, 500))

  // 模拟各种 422 场景
  if (data.username === 'admin') {
    return {
      success: false,
      errors: [
        { field: 'username', message: '用户名已存在' },
        { field: 'email', message: '该邮箱已被注册' },
      ],
    }
  }
  if (data.email === 'test@spam.com') {
    return {
      success: false,
      errors: [{ field: 'email', message: '该邮箱域名在黑名单中' }],
    }
  }
  if (data.password === '123') {
    return {
      success: false,
      errors: [{ field: 'password', message: '密码强度不足,至少 6 位' }],
    }
  }
  // 模拟服务端额外校验:密码 < 6 位也算强度不足(覆盖你输入 "233" 这种短密码)
  if (typeof data.password === 'string' && data.password.length < 6) {
    return {
      success: false,
      errors: [{ field: 'password', message: '密码长度不足,至少 6 位' }],
    }
  }
  return { success: true }
}

async function onSave() {
  if (!formRef.value) return
  // 1. 先做本地校验
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('本地校验失败')
    return
  }
  // 2. 提交到后端
  const result = await mockSaveToBackend(model)
  if (result.success) {
    ElMessage.success('保存成功')
    return
  }
  // 3. 后端 422 错误 → 映射到表单字段红字
  if (result.errors && formRef.value) {
    // 清空已有错误(避免旧错误残留)
    formRef.value.clearValidate()
    // 逐个设置错误
    for (const err of result.errors) {
      formRef.value.setFieldError(err.field, err.message)
    }
    ElMessage.error('保存失败,请根据红字提示修改')
  }
}

function onReset() {
  formRef.value?.resetFields()
}

async function copySchema() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    ElMessage.success('schema 已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="服务端错误映射（P2-2） + 响应式断点（P2-1）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'P2 完整闭环:',
        '1. 响应式断点:RowConfig.responsive / ColConfig.responsive 透传,调整浏览器大小可看到布局变化',
        '2. 服务端错误映射:模拟后端 422 响应,前端 setFieldError 映射红字',
        '3. 测试场景:',
        '   - 用户名=admin → 422:username/email 错误',
        '   - 邮箱=test@spam.com → 422:email 黑名单',
        '   - 密码=123 → 422:password 强度',
        '4. 真实使用:fetch().then(r => r.json()).then(data => data.errors.forEach(e => setFieldError(e.field, e.message)))',
      ]"
    >
      <section id="demo-server-error">
        <DemoField label="服务端错误映射" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button type="primary" @click="onSave">保存(测试后端 422 错误)</el-button>
            <el-button @click="onReset">重置</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <div :class="bem.e('state')">
            <div>
              <strong>当前断点(P2-1):</strong>
              <el-tag>{{ currentBreakpoint }}</el-tag>
              <span style="margin-left: 12px">
                <strong>视口宽度:</strong>
                {{ width }}px
              </span>
            </div>
            <div>
              <strong>测试 422 错误场景:</strong>
              <ul>
                <li>用户名=admin + 任意 email → 红字 "用户名已存在" / "该邮箱已被注册"</li>
                <li>邮箱=test@spam.com → 红字 "该邮箱域名在黑名单中"</li>
                <li>密码=123 → 红字 "密码强度不足,至少 6 位"</li>
              </ul>
            </div>
            <div>当前 model：</div>
            <pre>{{ JSON.stringify(model, null, 2) }}</pre>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-dgm-form-server-error {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }

  &__state {
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

    ul {
      margin: 4px 0;
      padding-left: 20px;
    }
  }
}
</style>
