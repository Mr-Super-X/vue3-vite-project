<script setup lang="ts">
/**
 * BaseChart · 销售转化漏斗演示页
 *
 * 企业常见用途：销售转化分析、用户行为漏斗、招聘流程漏斗。
 *
 * 演示要点：
 * 1. ECharts funnel 类型 + sort: 'descending' 默认排序
 * 2. label 内嵌格式化：绝对值 + 整体留存率
 * 3. tooltip 自定义格式化：同时显示绝对值 + 阶段转化率
 * 4. option 响应式：刷新数据 / 切换指标模式 → setOption(notMerge) 整体替换
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DocToc from '../../components/DocToc.vue'

const bem = createNamespace('demo-base-chart-funnel')

// 漏斗 5 阶段（响应式：刷新按钮会整体替换 value，触发 computed 重算）
const stages = ref([
  { value: 10000, label: '访问商品' },
  { value: 6500, label: '加入购物车' },
  { value: 4200, label: '提交订单' },
  { value: 3100, label: '完成支付' },
  { value: 2800, label: '确认收货' },
])

const metric = ref<'retention' | 'conversion'>('retention')

const option = computed(() => {
  const data = stages.value
  return {
    tooltip: {
      trigger: 'item',
      // ECharts formatter 的 params 是结构化对象，含 name/value/dataIndex 等
      formatter: (params: Record<string, unknown>) => {
        const idx = Number(params.dataIndex ?? 0)
        const cur = data[idx]?.value ?? 0
        const base = data[0]?.value ?? 1
        const prev = idx === 0 ? base : (data[idx - 1]?.value ?? 1)
        const retention = ((cur / base) * 100).toFixed(1)
        const conversion = idx === 0 ? '100.0' : ((cur / prev) * 100).toFixed(1)
        const metricText =
          metric.value === 'retention' ? `整体留存 ${retention}%` : `阶段转化 ${conversion}%`
        return `${String(params.name)}<br/>人数 ${cur}<br/>${metricText}`
      },
    },
    legend: { data: data.map((s) => s.label), bottom: 0 },
    series: [
      {
        name: '转化漏斗',
        type: 'funnel',
        left: '10%',
        width: '80%',
        // descending：上游 ≥ 下游（漏斗图惯例）；ascending 仅在数据本身就是升序时用
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: Record<string, unknown>) => {
            const idx = Number(params.dataIndex ?? 0)
            const cur = data[idx]?.value ?? 0
            const base = data[0]?.value ?? 1
            const retention = ((cur / base) * 100).toFixed(1)
            return `${String(params.name)}\n${cur} (${retention}%)`
          },
        },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        data: data.map((s) => ({ name: s.label, value: s.value })),
      },
    ],
  }
})

function shuffleData() {
  // 模拟真实业务数据抖动（±10%）
  stages.value = stages.value.map((s) => ({
    ...s,
    value: Math.max(1, Math.round(s.value * (0.9 + Math.random() * 0.2))),
  }))
  ElMessage.success('漏斗数据已刷新（±10% 抖动）')
}

const SNIPPET = `<BaseChart :option="funnelOption" />
// funnelOption 见 buildOption() 实现；sort: 'descending' 保证漏斗惯例排序`

const tocItems = [{ id: 'demo-funnel', label: '销售转化漏斗' }]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="BaseChart · 销售转化漏斗"
      source="src/components/common/BaseChart.vue"
      :introductions="[
        'funnel 类型是企业转化分析的标配：销售漏斗、用户行为漏斗、招聘流程漏斗。',
        '本演示重点：label 内嵌格式化（绝对值 + 留存率）、tooltip 显示阶段转化率、sort: descending 默认排序。',
        '点击「刷新数据」或切换指标模式，验证 option prop 响应式 → setOption(notMerge) 整体替换路径。',
      ]"
    >
      <section id="demo-funnel">
        <DemoField :code="SNIPPET" label="① 销售转化漏斗（绝对值 + 留存率 / 阶段转化率）">
          <div :class="bem.e('controls')">
            <el-radio-group v-model="metric">
              <el-radio-button value="retention">整体留存率</el-radio-button>
              <el-radio-button value="conversion">阶段转化率</el-radio-button>
            </el-radio-group>
            <el-button @click="shuffleData">刷新数据 (±10%)</el-button>
            <span :class="bem.e('status')">总访问量：{{ stages[0]?.value }}</span>
          </div>
          <div :class="bem.e('canvas')">
            <BaseChart :option="option" />
          </div>
          <p :class="bem.e('tip')">
            hover 任一阶段：tooltip 显示当前指标的转化率；label 内嵌显示绝对值 + 整体留存率。sort:
            'descending' 保证漏斗从大到小排列——上游阶段永远 ≥ 下游阶段。
          </p>
        </DemoField>
      </section>
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-base-chart-funnel {
  &__controls {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  &__status {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
  &__canvas {
    width: 100%;
    height: 420px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
  }
  &__tip {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }
}
</style>
