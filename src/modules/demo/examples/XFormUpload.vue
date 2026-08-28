<script setup lang="ts">
/**
 * XForm 文件上传场景 demo
 *
 * 覆盖企业真实业务中 7 类常见上传需求：
 * 1. 单文件头像上传（limit: 1 + accept image/*）
 * 2. 多文件附件上传（multiple + limit）
 * 3. 拖拽上传（drag）
 * 4. 图片墙上传（listType: picture-card）
 * 5. 手动上传（autoUpload: false，随表单提交）
 * 6. 上传前校验（beforeUpload 大小 / 类型）
 * 7. 已上传文件回显（fileList 默认值）
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadUserFile, UploadRequestOptions } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { uploadItems } from './xform-demos-api'
import xFormSource from './XFormUpload.vue?raw'

const bem = createNamespace('demo-x-form-upload')

/** mock 上传：本地模拟成功，避免 demo 依赖真实后端 */
function mockUpload(options: UploadRequestOptions): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const blobUrl = URL.createObjectURL(options.file)
      options.onSuccess?.({ url: blobUrl })
      ElMessage.success(`${options.file.name} 上传成功`)
      resolve()
    }, 600)
  })
}

/** 上传前校验：仅允许 JPG/PNG 且小于 2MB */
function beforeUploadCheck(rawFile: UploadRawFile): boolean {
  const isImage = ['image/jpeg', 'image/png'].includes(rawFile.type)
  const isLt2M = rawFile.size / 1024 / 1024 < 2
  if (!isImage) ElMessage.error('只接受 JPG/PNG 图片')
  if (!isLt2M) ElMessage.error('图片大小不能超过 2MB')
  return isImage && isLt2M
}

const schema: SchemaNode = {
  row: { gutter: 24 },
  children: [
    {
      label: '头像',
      name: 'avatar',
      col: { span: 12 },
      component: 'Upload',
      // ElUpload 的 v-model 属性是 file-list，必须显式声明
      modelProp: 'fileList',
      props: {
        action: '#',
        accept: 'image/*',
        limit: 1,
        listType: 'picture-card',
        httpRequest: mockUpload,
      },
      slots: {
        tip: '建议上传 1:1 正方形图片，单文件限制。',
      },
    },
    {
      label: '附件列表',
      name: 'attachments',
      col: { span: 12 },
      component: 'Upload',
      modelProp: 'fileList',
      props: {
        action: '#',
        multiple: true,
        limit: 5,
        httpRequest: mockUpload,
      },
      slots: {
        tip: '最多上传 5 个文件，支持多选。',
      },
    },
    {
      label: '拖拽上传',
      name: 'dragFiles',
      col: { span: 12 },
      component: 'Upload',
      modelProp: 'fileList',
      props: {
        action: '#',
        drag: true,
        multiple: true,
        accept: '.pdf,.doc,.docx',
        httpRequest: mockUpload,
      },
    },
    {
      label: '商品图片墙',
      name: 'productImages',
      col: { span: 12 },
      component: 'Upload',
      modelProp: 'fileList',
      props: {
        action: '#',
        listType: 'picture-card',
        multiple: true,
        limit: 6,
        accept: 'image/*',
        httpRequest: mockUpload,
      },
    },
    {
      label: '手动上传（随表单提交）',
      name: 'manualFiles',
      col: { span: 12 },
      component: 'Upload',
      modelProp: 'fileList',
      props: {
        action: '#',
        autoUpload: false,
        multiple: true,
        httpRequest: mockUpload,
      },
      slots: {
        tip: 'autoUpload: false，选择文件后不会自动上传，点击保存时随表单一起提交。',
      },
    },
    {
      label: '上传前校验',
      name: 'checkedFiles',
      col: { span: 12 },
      component: 'Upload',
      modelProp: 'fileList',
      props: {
        action: '#',
        multiple: true,
        accept: 'image/*',
        beforeUpload: beforeUploadCheck,
        httpRequest: mockUpload,
      },
      slots: {
        tip: '仅允许 JPG/PNG，单文件 ≤ 2MB。',
      },
    },
    {
      label: '已上传文件回显',
      name: 'prefillFiles',
      col: { span: 24 },
      component: 'Upload',
      modelProp: 'fileList',
      props: {
        action: '#',
        multiple: true,
        httpRequest: mockUpload,
      },
      slots: {
        tip: '表单加载时 fileList 已预置服务端返回的文件，可直接展示/删除/追加。',
      },
    },
  ],
}

const model = reactive<Record<string, unknown>>({
  avatar: [],
  attachments: [],
  dragFiles: [],
  productImages: [],
  manualFiles: [],
  checkedFiles: [],
  // 模拟从接口回显的已上传文件
  prefillFiles: [
    {
      name: 'contract-2026.pdf',
      url: '#',
      status: 'success',
    } as UploadUserFile,
    {
      name: 'invoice-001.png',
      url: 'https://picsum.photos/id/101/200/200',
      status: 'success',
    } as UploadUserFile,
  ],
})

const formRef = ref<{
  validate: (cb?: (valid: boolean) => void) => Promise<boolean>
  resetFields: () => void
} | null>(null)

function onSave() {
  formRef.value?.validate((valid) => {
    if (valid) {
      ElMessage({
        message: '表单数据：\n' + JSON.stringify(model, null, 2),
        type: 'success',
        duration: 0,
        showClose: true,
      })
    } else {
      ElMessage.error('校验失败，请检查字段')
    }
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

const tocItems = [
  { id: 'demo-upload', label: '上传场景演示' },
  { id: 'api-upload', label: 'Upload 字段配置' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="文件上传（7 个企业常见场景）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'XForm 的 Upload 组件对应 Element Plus ElUpload。',
        '关键：ElUpload 的 v-model 属性是 file-list，所以节点必须配置 modelProp: \'fileList\'，否则双向绑定不生效。',
        '本页覆盖单文件头像、多文件附件、拖拽上传、图片墙、手动上传、上传前校验、已上传文件回显。',
        '所有上传均走 httpRequest 模拟接口，demo 无需真实后端即可看到上传成功效果。',
      ]"
    >
      <section id="demo-upload">
        <DemoField label="上传场景集合" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
        </DemoField>
      </section>

      <ApiTable title="Upload 字段配置" :items="uploadItems" anchor="api-upload" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-upload {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
