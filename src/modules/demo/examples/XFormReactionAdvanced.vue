<script setup lang="ts">
/**
 * 演示 reaction 进阶用法（XFormReaction 基础 4 场景之外的复杂业务场景）
 *
 * 四个 section，覆盖真实业务里的高阶联动：
 *   ① 计算字段 + deps 精确监听：数量×单价×折扣=折后价，reaction 函数体闭包写 model，
 *      deps 精确监听 3 个字段切断自触发；与 XFormReaction 把计数器写到 model 外的 hack 写法形成对比
 *   ② 跨字段级联清空：省/市/区 + 商品/型号，改上级自动清空下级，reaction.props 动态切 options
 *   ③ 反应式 props/rules/options 联动：度量单位切换 → label/min/max/precision/rules 全联动
 *   ④ 数组行内嵌 reaction：每行数量×单价=小计，「含税」切换显示/隐藏税率并参与计算
 *
 * reaction 函数副作用承载约定：使用 _effect 字段存放副作用函数，返回 undefined →
 * use-reaction 的 isEqual 比较 target._effect 与 undefined 相等 → 跳过写入节点字段
 */
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import {
  PROVINCES,
  CITIES_BY_PROVINCE,
  DISTRICTS_BY_CITY,
  ITEM_TYPES,
  MODELS_BY_TYPE,
  METRIC_OPTIONS,
  METRIC_LABEL,
  METRIC_MIN,
  METRIC_MAX,
  METRIC_PRECISION,
  METRIC_PLACEHOLDER,
  DISCOUNT_LEVEL_OPTIONS,
  DISCOUNT_RATE,
} from './cascader-data'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { reactionAdvancedItems } from './xform-demos-api'
import xFormSource from './XFormReactionAdvanced.vue?raw'

const bem = createNamespace('demo-x-form-reaction-advanced')

const model = reactive({
  calc: { qty: 1, price: 100, discount: 1, total: 100, calcCount: 0 },
  cascade: { province: '', city: '', district: '', itemType: '', model: '', clearCount: 0 },
  dynamic: {
    metric: 'weight' as 'weight' | 'volume' | 'count',
    value: 0,
    discountLevel: 'normal',
    discountRate: 1,
  },
  array: {
    rows: [
      { name: '商品 A', qty: 1, price: 100, taxed: false, taxRate: 0.13, subtotal: 100 },
      { name: '商品 B', qty: 2, price: 50, taxed: true, taxRate: 0.06, subtotal: 106 },
    ],
  },
  // 数组节点字段名 = model 顶层 key（XForm 找 model[name]）；嵌套路径不识别
  arrayRows: [
    { name: '商品 A', qty: 1, price: 100, taxed: false, taxRate: 0.13, subtotal: 100 },
    { name: '商品 B', qty: 2, price: 50, taxed: true, taxRate: 0.06, subtotal: 106 },
  ],
})

// —— 反应式副作用函数（被 reaction._effect 字段调用；命名 _xxx 是约定） ——
// 设计意图：function 闭包写 model；返回 undefined 让 use-reaction 跳过 node._effect = undefined 写入
function recalcTotal() {
  const c = model.calc
  c.total = Number((c.qty * c.price * c.discount).toFixed(2))
  c.calcCount++
}
function recalcDiscountRate() {
  model.dynamic.discountRate = DISCOUNT_RATE[model.dynamic.discountLevel] ?? 1
}
function recalcRowSubtotal(r: {
  qty: number
  price: number
  taxed: boolean
  taxRate: number
  subtotal: number
}) {
  r.subtotal = Number((r.qty * r.price * (r.taxed ? 1 + r.taxRate : 1)).toFixed(2))
}

// —— ① 计算字段 schema ——
// deps 精确监听 qty/price/discount → 闭包副作用写 model.calc.total；deps 不含 total/count → 无自触发
const calcSchema: SchemaNode = {
  component: 'Card',
  props: { header: '① 计算字段 + deps 精确监听（购物车小计）' },
  column: 4,
  row: { gutter: 16 },
  children: [
    {
      name: 'calc.qty',
      label: '数量',
      component: 'InputNumber',
      props: { min: 1, controlsPosition: 'right' },
    },
    {
      name: 'calc.price',
      label: '单价',
      component: 'InputNumber',
      props: { min: 0, precision: 2, controlsPosition: 'right' },
    },
    {
      name: 'calc.discount',
      label: '折扣',
      component: 'InputNumber',
      props: { min: 0, max: 1, step: 0.1, precision: 1, controlsPosition: 'right' },
    },
    {
      name: 'calc.total',
      label: '折后价（自动）',
      component: 'InputNumber',
      props: { precision: 2, disabled: true, controlsPosition: 'right' },
      reaction: {
        deps: ['calc.qty', 'calc.price', 'calc.discount'],
        _effect: recalcTotal,
      },
    },
  ],
}

// —— ② 级联清空 schema ——
// 上级用 on.change 闭包清空下级；下级 reaction.props 按上级值查字典动态切 options
const cascadeSchema: SchemaNode = {
  component: 'Card',
  props: { header: '② 跨字段级联清空（省/市/区 + 商品/型号）' },
  column: 3,
  row: { gutter: 16 },
  children: [
    {
      name: 'cascade.province',
      label: '省份',
      component: 'Select',
      props: { options: PROVINCES, clearable: true, placeholder: '请选择省份' },
      on: {
        change: () => {
          model.cascade.city = ''
          model.cascade.district = ''
          model.cascade.clearCount++
        },
      },
    },
    {
      name: 'cascade.city',
      label: '城市',
      component: 'Select',
      props: { clearable: true, placeholder: '请选择城市' },
      // reaction.props 整体函数：use-reaction 求值后整体覆盖 target.props
      reaction: {
        props: (m: Record<string, unknown>) => ({
          options: CITIES_BY_PROVINCE[(m.cascade as { province: string }).province] ?? [],
        }),
      },
      on: {
        change: () => {
          model.cascade.district = ''
        },
      },
    },
    {
      name: 'cascade.district',
      label: '区/县',
      component: 'Select',
      props: { clearable: true, placeholder: '请选择区/县' },
      reaction: {
        props: (m: Record<string, unknown>) => ({
          options: DISTRICTS_BY_CITY[(m.cascade as { city: string }).city] ?? [],
        }),
      },
    },
    {
      name: 'cascade.itemType',
      label: '商品类型',
      component: 'Select',
      props: { options: ITEM_TYPES, clearable: true, placeholder: '请选择商品类型' },
      on: {
        change: () => {
          model.cascade.model = ''
          model.cascade.clearCount++
        },
      },
    },
    {
      name: 'cascade.model',
      label: '型号',
      component: 'Select',
      props: { clearable: true, placeholder: '请选择型号' },
      reaction: {
        props: (m: Record<string, unknown>) => ({
          options: MODELS_BY_TYPE[(m.cascade as { itemType: string }).itemType] ?? [],
        }),
      },
    },
  ],
}

// —— ③ 反应式 props/rules/options 联动 schema ——
// 关键设计：单个 reaction 节点同时控制 label + props；use-reaction 是赋值非合并，
// props 返回完整对象；rules 用 {{ fn }} 表达式与 reaction 协同
const dynamicSchema: SchemaNode = {
  component: 'Card',
  props: { header: '③ 反应式 props/rules/options 动态切换（度量单位 + 折扣等级）' },
  column: 2,
  row: { gutter: 16 },
  children: [
    {
      name: 'dynamic.metric',
      label: '度量单位',
      component: 'RadioGroup',
      props: { options: METRIC_OPTIONS },
    },
    {
      name: 'dynamic.value',
      component: 'InputNumber',
      reaction: {
        label: (m: Record<string, unknown>) =>
          METRIC_LABEL[(m.dynamic as { metric: 'weight' | 'volume' | 'count' }).metric],
        // reaction.props 整体函数：返回值整体覆盖 target.props（包含 controlsPosition 等静态字段）
        props: (m: Record<string, unknown>) => {
          const k = (m.dynamic as { metric: 'weight' | 'volume' | 'count' }).metric
          return {
            min: METRIC_MIN[k],
            max: METRIC_MAX[k],
            precision: METRIC_PRECISION[k],
            placeholder: METRIC_PLACEHOLDER[k],
            controlsPosition: 'right' as const,
          }
        },
        // 反应式 rules：用 {{ fn }} 字符串形式（不在 node.rules 写字符串，会被当成命名引用查表）
        rules:
          "{{ (m) => (m.dynamic && m.dynamic.value > 0) ? [] : [{ required: true, message: '必须 > 0', trigger: 'blur' }] }}",
      },
    },
    {
      name: 'dynamic.discountLevel',
      label: '折扣等级',
      component: 'Select',
      props: { options: DISCOUNT_LEVEL_OPTIONS, clearable: true, placeholder: '请选择折扣等级' },
    },
    {
      name: 'dynamic.discountRate',
      label: '折扣率（自动）',
      component: 'InputNumber',
      props: { precision: 2, disabled: true, controlsPosition: 'right' },
      reaction: {
        deps: ['dynamic.discountLevel'],
        _effect: recalcDiscountRate,
      },
    },
  ],
}

// —— ④ 数组行内嵌 reaction schema ——
// 行内 deps 用相对路径（'qty' 而非 'array.rows.0.qty'）；use-reaction 用 lodash get 在行内 model 子树生效
function makeRowSubtotalEffect() {
  return () => {
    model.arrayRows.forEach(recalcRowSubtotal)
  }
}
const arraySchema: SchemaNode = {
  component: 'Card',
  props: { header: '④ 数组行内嵌 reaction（采购明细行内联动）' },
  column: 1,
  children: [
    {
      kind: 'array',
      name: 'arrayRows',
      label: '采购明细',
      array: {
        initialLength: 2,
        itemSchema: {
          column: 6,
          row: { gutter: 12 },
          children: [
            { name: 'name', label: '商品', component: 'Input', props: { clearable: true } },
            {
              name: 'qty',
              label: '数量',
              component: 'InputNumber',
              props: { min: 1, controlsPosition: 'right' },
            },
            {
              name: 'price',
              label: '单价',
              component: 'InputNumber',
              props: { min: 0, precision: 2, controlsPosition: 'right' },
            },
            { name: 'taxed', label: '含税', component: 'Switch' },
            {
              name: 'taxRate',
              label: '税率',
              component: 'InputNumber',
              props: { min: 0, max: 1, step: 0.01, precision: 2, controlsPosition: 'right' },
              reaction: {
                hidden: (m: Record<string, unknown>) => !(m as { taxed: boolean }).taxed,
              },
            },
            {
              name: 'subtotal',
              label: '小计',
              component: 'InputNumber',
              props: { precision: 2, disabled: true, controlsPosition: 'right' },
              reaction: {
                // 行内相对路径（不写 array.rows.0.qty）+ deps 精确监听切断自触发
                deps: ['qty', 'price', 'taxed', 'taxRate'],
                _effect: makeRowSubtotalEffect(),
              },
            },
          ],
        },
      },
    },
  ],
}

const schema: SchemaNode = {
  column: 1,
  children: [calcSchema, cascadeSchema, dynamicSchema, arraySchema],
}

/** ④ 行小计总和（展示用） */
const grandSubtotal = computed(() =>
  model.arrayRows.reduce((s, r) => s + (r.subtotal || 0), 0).toFixed(2)
)

const formRef = ref<XFormExpose | null>(null)
async function onSave() {
  if (!(await formRef.value?.validate())) {
    ElMessage.error('校验失败')
    return
  }
  ElMessage.success('保存成功')
}
async function copySchema() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    ElMessage.success('schema 已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const tocItems = [
  { id: 'demo-reaction-advanced', label: '进阶联动演示' },
  { id: 'api-reaction-advanced', label: '进阶字段速查' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="反应式联动·进阶（deps / 级联清空 / 动态 props / 数组行内嵌）"
      source="src/components/form-schema/composables/use-reaction.ts"
      :introductions="[
        'XFormReaction 基础 4 场景之外的复杂联动。一个 XForm + 4 个 Card 分区，每个分区演示一类进阶能力：',
        '① deps 精确监听 + 反应式闭包写 model（数量×单价×折扣=折后价）：反应式 _effect 函数体闭包副作用写 model，deps 精确监听 3 个字段切断自触发',
        '② 跨字段级联清空：上级字段 on.change 闭包清空下级，下级 reaction.props 按上级值查字典动态切 options',
        '③ 反应式 label / props / rules 联动：单个 reaction 节点同时改 label 和 props，rules 用 {{ fn }} 表达式与 reaction 协同',
        '④ 数组行内嵌 reaction：行内 deps 用相对路径（不写 array.rows.0.qty），lodash get 在行 model 子树自动解析',
      ]"
    >
      <section id="demo-reaction-advanced">
        <DemoField label="四个反应式分区（共享 model + formRef）" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button type="primary" @click="onSave">校验</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <div :class="bem.e('panels')">
            <div :class="bem.e('panel')">
              <strong>① 计算次数：</strong>
              {{ model.calc.calcCount }}（应只在 qty/price/discount 变化时 +1）
            </div>
            <div :class="bem.e('panel')">
              <strong>② 级联清空次数：</strong>
              {{ model.cascade.clearCount }}
            </div>
            <div :class="bem.e('panel')">
              <strong>④ 采购小计合计：</strong>
              ¥{{ grandSubtotal }}
            </div>
          </div>
          <details :class="bem.e('model')">
            <summary>查看完整 model（JSON）</summary>
            <pre>{{ JSON.stringify(model, null, 2) }}</pre>
          </details>
        </DemoField>
      </section>
      <ApiTable
        title="reaction 进阶字段速查"
        :items="reactionAdvancedItems"
        anchor="api-reaction-advanced"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-reaction-advanced {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
  &__panels {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  &__panel {
    padding: 8px 12px;
    background: #f0f9ff;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.7;
    strong {
      color: #2563eb;
      margin-right: 4px;
    }
  }
  &__model {
    margin-top: 12px;
    font-size: 12px;
    summary {
      cursor: pointer;
      color: #6b7280;
    }
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
