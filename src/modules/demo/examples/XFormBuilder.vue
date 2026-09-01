<script setup lang="ts">
/**
 * 演示 builder 控件补齐
 *
 * 场景(全部用对象字面量写法 —— makeBuilder 类型 cast 限制 + 链式 Ext 方法返回类型
 * 推断为 `never`,Demo 统一用 type-safe 的对象字面量演示):
 * 1. Upload(图片上传):props.action/accept/listType
 * 2. Transfer(穿梭框):props.data/titles/filterable/button-texts
 * 3. Cascader(级联选择):props.options/showAllLevels/separator
 * 4. TimePicker + TimeSelect(时间选择):props.format/valueFormat
 * 5. Autocomplete(自动补全):props.fetchSuggestions/triggerOnFocus
 * 6. TreeSelect(树形选择):props.data/multiple
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../composables/useXFormDemo'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { builderItems } from './xform-demos-api'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import xFormSource from './XFormBuilder.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { formRef, bem, onReset, copySchema } = useXFormDemo({
  name: 'builder',
  schema: () => schema,
  model: () => model,
})

// ============== Cascader 数据(省/市/区) ==============
const CASCADER_DATA = [
  {
    value: 'zj',
    label: '浙江省',
    children: [
      { value: 'hz', label: '杭州市' },
      { value: 'nb', label: '宁波市' },
      { value: 'wz', label: '温州市' },
    ],
  },
  {
    value: 'js',
    label: '江苏省',
    children: [
      { value: 'nj', label: '南京市' },
      { value: 'sz', label: '苏州市' },
      { value: 'wx', label: '无锡市' },
    ],
  },
  {
    value: 'gd',
    label: '广东省',
    children: [
      { value: 'gz', label: '广州市' },
      { value: 'sz', label: '深圳市' },
      { value: 'dg', label: '东莞市' },
    ],
  },
]

// ============== Transfer 数据(用户角色) ==============
const TRANSFER_DATA = [
  { key: 1, label: '管理员' },
  { key: 2, label: '编辑' },
  { key: 3, label: '查看者' },
  { key: 4, label: '审计员' },
  { key: 5, label: '财务' },
]

// ============== Autocomplete 数据(编程语言) ==============
const LANGS = ['JavaScript', 'TypeScript', 'Java', 'Python', 'Go', 'Rust', 'C++', 'Ruby']

// ============== TreeSelect 数据(部门) ==============
const TREE_DATA = [
  {
    id: 1,
    label: '总经办',
    children: [{ id: 11, label: '总裁办' }],
  },
  {
    id: 2,
    label: '技术部',
    children: [
      { id: 21, label: '前端组' },
      { id: 22, label: '后端组' },
    ],
  },
]

const schema: SchemaNode = {
  column: 1,
  children: [
    // 1. Cascader 链式 .options().showAllLevels().separator() —— 对象字面量等价
    {
      label: '省/市(选省后自动重置市)',
      name: 'city',
      component: 'Cascader',
      props: {
        options: CASCADER_DATA,
        showAllLevels: true,
        separator: ' / ',
        placeholder: '选择省/市',
      },
      rules: [{ required: true, message: '请选择省/市', trigger: 'change' }],
    } as SchemaNode,

    // 2. Upload 链式 .action().accept().listType().drag()
    //    picture-card 模式需要 slots.default 提供 trigger 元素 + slots.tip 提示
    {
      label: '头像上传',
      name: 'avatar',
      component: 'Upload',
      props: {
        action: '/api/upload',
        accept: 'image/*',
        listType: 'picture-card',
        multiple: true,
        drag: true,
      },
      slots: {
        // trigger 元素(picture-card 必需)——直接传 Component 对象,无需 XForm.components 注册
        default: [
          {
            component: 'ElButton',
            props: { type: 'primary', plain: true, round: true },
            children: '+ 上传',
          } as SchemaNode,
        ],
        tip: '支持 jpg/png 格式,单个文件不超过 500KB',
      },
    } as SchemaNode,

    // 3. Transfer 链式 .data().titles().filterable().buttonTexts()
    // （演示同时给出「直接 schema 对象写法」与「builder 链式写法」两种风格以做对比；
    // 实际项目推荐 builder 写法 —— 编译时类型校验 props 字段名）
    {
      label: '角色分配',
      name: 'roles',
      component: 'Transfer',
      props: {
        data: TRANSFER_DATA,
        titles: ['可分配', '已分配'],
        filterable: true,
        buttonTexts: ['取消', '分配'],
      },
    } as SchemaNode,

    // 4. TimePicker 链式 .format().valueFormat().range()
    {
      label: '时间范围',
      name: 'timeRange',
      component: 'TimePicker',
      props: {
        format: 'HH:mm:ss',
        valueFormat: 'HH:mm:ss',
        isRange: true,
        placeholder: '选择时间范围',
      },
    } as SchemaNode,

    // 5. TimeSelect 链式 .start().end().step().format()
    {
      label: '班次',
      name: 'shift',
      component: 'TimeSelect',
      props: {
        start: '08:00',
        end: '20:00',
        step: '00:30',
        format: 'HH:mm',
        placeholder: '选择班次',
      },
    } as SchemaNode,

    // 6. Autocomplete 链式 .fetchSuggestions().triggerOnFocus().placement()
    {
      label: '编程语言',
      name: 'language',
      component: 'Autocomplete',
      props: {
        placeholder: '输入搜索 js / ts / py',
        triggerOnFocus: true,
        placement: 'bottom-start',
        fetchSuggestions: (qs: string, cb: (s: Array<{ value: string }>) => void) =>
          cb(
            LANGS.filter((l) => l.toLowerCase().includes(qs.toLowerCase())).map((l) => ({
              value: l,
            }))
          ),
      },
    } as SchemaNode,

    // 7. TreeSelect 链式 .data().multiple().checkStrictly().nodeKey()
    {
      label: '部门(树形多选)',
      name: 'dept',
      component: 'TreeSelect',
      props: {
        data: TREE_DATA,
        multiple: true,
        checkStrictly: true,
        nodeKey: 'id',
      },
    } as SchemaNode,
  ],
}

const model = reactive<Record<string, unknown>>({
  city: '',
  avatar: [],
  roles: [],
  timeRange: null,
  shift: '',
  language: '',
  dept: [],
})

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败')
    return
  }
  ElMessage({
    message: '保存成功:\n' + JSON.stringify(model, null, 2),
    type: 'success',
    duration: 0,
    showClose: true,
  })
}

const tocItems = [
  { id: 'demo-builder', label: '构建器演示' },
  { id: 'api-builder', label: 'builder 链式方法' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="builder 控件补齐"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '链式构建器覆盖更多组件：xCascader / xUpload / xAutocomplete / xTimePicker / xTimeSelect / xTreeSelect / xTransfer',
        '演示场景：Cascader 省/市 + Upload 图片上传 + Transfer 角色分配 + TimePicker/TimeSelect + Autocomplete + TreeSelect',
      ]"
    >
      <section id="demo-builder">
        <DemoField label="builder 链式" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="onReset">重置</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>

      <ApiTable title="builder 链式方法" :items="builderItems" anchor="api-builder" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-builder {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
