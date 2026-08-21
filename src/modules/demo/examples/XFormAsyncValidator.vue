<script setup lang="ts">
/**
 * 演示异步校验（asyncValidator + 异步 crossValidator）
 *
 * 场景：
 * 1. 用户名唯一性：asyncValidator 模拟 500ms 远程接口,blur 后 el-form-item 显示 loading 图标
 * 2. 邮箱黑名单：asyncValidator 检查预定义黑名单,命中时返回错误信息
 * 3. 跨字段异步校验：crossValidator 返回 Promise,模拟"服务端密码强度比对"
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import { xInput } from '@/components/form-schema/builders'
import DemoField from '../components/DemoField.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormAsyncValidator.vue?raw'

const bem = createNamespace('demo-x-form-async')

// 模拟远程接口（用户名唯一性）
function checkUsernameAvailable(name: string): Promise<true | string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const taken = ['admin', 'root', 'test']
      resolve(taken.includes(name) ? '用户名已被占用' : true)
    }, 500)
  })
}

// 邮箱黑名单
const EMAIL_BLACKLIST = ['@spam.com', '@temp.com']

// 模拟服务端密码强度比对
function serverCheckPasswordStrength(password: string): Promise<true | string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (password.length < 6) return resolve('密码至少 6 位（服务端校验）')
      if (/^\d+$/.test(password)) return resolve('密码不能全是数字（服务端校验）')
      resolve(true)
    }, 300)
  })
}

const schema: SchemaNode = {
  children: [
    // 1. 用户名唯一性 —— asyncValidator 模拟 500ms 远程接口
    xInput('username')
      .label('用户名')
      .prop('placeholder', 'admin/test/root 已被占用')
      .required()
      .asyncValidator(async (_rule, value, cb) => {
        if (typeof value !== 'string' || value.length === 0) return cb()
        const result = await checkUsernameAvailable(value)
        cb(result === true ? undefined : new Error(result))
      }, 'blur')
      .build() as SchemaNode,

    // 2. 邮箱黑名单 —— asyncValidator 同步检查（模拟同步校验但走 callback 包装）
    {
      label: '邮箱',
      name: 'email',
      component: 'Input',
      props: { placeholder: '@spam.com / @temp.com 在黑名单中' },
      rules: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        {
          type: 'email',
          message: '邮箱格式不正确',
          trigger: 'blur',
        },
        {
          validator: async (_rule, value, cb) => {
            if (typeof value !== 'string' || value.length === 0) return cb()
            await new Promise((r) => setTimeout(r, 300))
            const hit = EMAIL_BLACKLIST.find((suffix) => value.endsWith(suffix))
            cb(hit ? new Error(`邮箱域名 ${hit} 在黑名单中`) : undefined)
          },
          trigger: 'blur',
        },
      ],
    },

    // 3. 异步服务端校验 —— 密码强度（无跨字段依赖,使用 asyncValidator 链式）
    xInput('password')
      .label('密码')
      .prop('type', 'password')
      .prop('placeholder', '至少 6 位,不能全是数字')
      .prop('clearable', true)
      .required()
      .asyncValidator(async (_rule, value, cb) => {
        if (typeof value !== 'string' || value.length === 0) return cb()
        const result = await serverCheckPasswordStrength(value)
        cb(result === true ? undefined : new Error(result))
      }, 'blur')
      .build() as SchemaNode,
  ],
}

const model = reactive<Record<string, unknown>>({
  username: '',
  email: '',
  password: '',
})

const formRef = ref<XFormExpose | null>(null)

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败，请检查红字提示')
    return
  }
  ElMessage({
    message: '保存成功：\n' + JSON.stringify(model, null, 2),
    type: 'success',
    duration: 0,
    showClose: true,
  })
}

function onReset() {
  formRef.value?.resetFields()
}

async function copySchema() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    ElMessage.success('schema 已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动选择')
  }
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="异步校验（asyncValidator + 异步 crossValidator）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '演示 element-plus 原生 validating loading + form-schema 异步 crossValidator:',
        '1. 用户名唯一性：xInput.asyncValidator(fn, \'blur\') 模拟 500ms 远程接口,blur 后 form-item 显示 loading 图标',
        '2. 邮箱黑名单：async 校验器检查预定义黑名单,300ms 返回;邮箱格式 + 黑名单 两条规则并行触发',
        '3. 跨字段异步校验：crossValidator 返回 Promise<true | string>,自动 await（密码强度比对）',
        '说明：el-form 的 async callback validator 自动管理 validating 状态(loading 图标),form-schema 无需介入',
      ]"
    >
      <section id="demo-async">
        <DemoField label="异步校验" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <div :class="bem.e('state')">
            <div>当前 model：</div>
            <pre>{{ JSON.stringify(model, null, 2) }}</pre>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-async {
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
  }
}
</style>
