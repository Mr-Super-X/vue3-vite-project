<script setup lang="tsx">
/**
 * ProTable 用法演示 + API 文档（半自动版，遵循 demo 模块规范）
 *
 * - name / type / required → 走 extractApi 自动从源码提取
 * - description → 手写字典
 *
 * 覆盖功能：
 *   1. columns 同时驱动表格列与搜索项
 *   2. 搜索 / 重置 / 展开收起
 *   3. enum 自动渲染 ElTag
 *   4. 多选跨页记忆（el-table reserve-selection）
 *   5. 工具栏：刷新 / 密度切换 / 列设置抽屉
 *   6. 自定义插槽（tableHeader / toolButton / operation / id）
 *   7. defineExpose 调用（refresh / reset / getSelectedRows）
 *
 * 路由：自动注册为 `/demo/pro-table-overview`
 */
import { ref } from 'vue'
import { ElButton, ElTag, ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { ProTable, type ProColumn } from '@/components/ProTable'
import type { ProTableExpose } from '@/components/ProTable/types'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DocToc from '../../components/DocToc.vue'
import ApiTable from '../../components/ApiTable.vue'

const bem = createNamespace('demo-pro-table')

/* ───────────── mock 数据 ───────────── */

interface UserRow extends Record<string, unknown> {
  id: number
  name: string
  age: number
  status: number
  role: string
  createdAt: string
}

const STATUS_OPTIONS = [
  { label: '启用', value: 1, tagType: 'success' as const },
  { label: '禁用', value: 0, tagType: 'info' as const },
  { label: '锁定', value: -1, tagType: 'danger' as const },
]

const ROLE_OPTIONS = [
  { label: '管理员', value: 'admin' },
  { label: '编辑', value: 'editor' },
  { label: '访客', value: 'guest' },
]

function generateMockData(total: number): UserRow[] {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    name: `用户-${i + 1}`,
    age: 20 + (i % 40),
    status: [1, 1, 1, 0, -1][i % 5]!,
    role: ['admin', 'editor', 'guest'][i % 3]!,
    createdAt: `2026-09-${String((i % 30) + 1).padStart(2, '0')} 10:00:00`,
  }))
}

const ALL_MOCK = generateMockData(127)

async function mockRequestApi(params: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const { name, status, role, pageNum = 1, pageSize = 10 } = params
  let filtered = ALL_MOCK
  if (typeof name === 'string' && name) {
    filtered = filtered.filter((u) => u.name.includes(name))
  }
  if (status !== undefined && status !== null && status !== '') {
    filtered = filtered.filter((u) => u.status === status)
  }
  if (typeof role === 'string' && role) {
    filtered = filtered.filter((u) => u.role === role)
  }
  const start = (Number(pageNum) - 1) * Number(pageSize)
  const result = {
    data: filtered.slice(start, start + Number(pageSize)),
    total: filtered.length,
    pageNum: Number(pageNum),
    pageSize: Number(pageSize),
  }
  return result
}

/* ───────────── 列定义 ───────────── */

const columns: ProColumn[] = [
  { prop: 'id', label: 'ID', width: 80, sortable: true },
  {
    prop: 'name',
    label: '姓名',
    minWidth: 120,
    sortable: true,
    search: { el: 'input', defaultValue: '', span: 6 },
  },
  { prop: 'age', label: '年龄', width: 80, sortable: true },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    enum: [...STATUS_OPTIONS],
    search: { el: 'select', defaultValue: null, span: 6 },
  },
  {
    prop: 'role',
    label: '角色',
    width: 100,
    enum: ROLE_OPTIONS,
    search: { el: 'input', defaultValue: '', span: 6 },
  },
  { prop: 'createdAt', label: '创建时间', width: 180 },
  { prop: 'operation', label: '操作', type: 'operation', width: 160 },
]

/* ───────────── defineExpose（外部按钮触发） ───────────── */

const proTableRef = ref<ProTableExpose | null>(null)

async function handleRefresh(): Promise<void> {
  await proTableRef.value?.refresh()
  ElMessage.success('已 refresh')
}

async function handleReset(): Promise<void> {
  await proTableRef.value?.reset()
  ElMessage.success('已 reset（保留多选，附录 A #1）')
}

function handleViewDetail(row: Record<string, unknown>): void {
  ElMessage.info(`查看详情：${(row as UserRow).name}`)
}

function handleDelete(row: Record<string, unknown>): void {
  ElMessage.warning(`删除：${(row as UserRow).name}`)
}

/* ───────────── toc 锚点 ───────────── */

const tocItems = [
  { id: 'demo-basic', label: '基础用法', level: 2 },
  { id: 'demo-enum', label: 'enum → ElTag', level: 2 },
  { id: 'demo-slots', label: '自定义插槽', level: 2 },
  { id: 'demo-render', label: '自定义渲染（col.render）', level: 2 },
  { id: 'demo-expose', label: 'defineExpose 调用', level: 2 },
  { id: 'api-props', label: 'Props', level: 2 },
  { id: 'api-slots', label: 'Slots', level: 2 },
  { id: 'api-expose', label: 'Expose', level: 2 },
  { id: 'api-columns', label: 'ProColumn 字段', level: 2 },
]

/* ───────────── API 文档 items（移到变量，避免模板字符串解析问题） ───────────── */

const propsItems = [
  {
    name: 'columns',
    type: 'ProColumn[]',
    required: true,
    default: '-',
    description: '列定义数组（同时驱动搜索项与表格列）',
  },
  {
    name: 'requestApi',
    type: 'fn',
    required: true,
    default: '-',
    description: '数据请求方法，返回 { data, total, pageNum, pageSize }',
  },
  {
    name: 'initParam',
    type: 'object',
    required: false,
    default: '{}',
    description: '固定查询参数（搜索时与表单值合并）',
  },
  {
    name: 'pagination',
    type: 'boolean | object',
    required: false,
    default: 'true',
    description: '是否显示分页（true / false / 透传 el-pagination props）',
  },
  {
    name: 'tableEngine',
    type: 'enum',
    required: false,
    default: 'element-plus',
    description:
      "表格引擎（值: 'element-plus' | 'vxe-table'；首次 mount 前设置，运行时修改需 reload）",
  },
  {
    name: 'tableKey',
    type: 'string',
    required: false,
    default: '-',
    description: 'localStorage 缓存列设置的 key（未传则不持久化）',
  },
  {
    name: 'rowKey',
    type: 'string',
    required: false,
    default: '-',
    description: '行 key 字段名（多选必填）',
  },
  { name: 'pageSize', type: 'number', required: false, default: '10', description: '初始每页大小' },
  {
    name: 'searchRows',
    type: 'number',
    required: false,
    default: '3',
    description: '搜索项默认显示行数（超出可展开）',
  },
  {
    name: 'density',
    type: 'enum',
    required: false,
    default: 'default',
    description: "默认密度（值: 'compact' | 'default' | 'loose'）",
  },
]

const slotsItems = [
  { name: 'tableHeader', description: '左上角标题 + 自定义按钮' },
  { name: 'toolButton', description: '工具栏右侧扩展按钮' },
  { name: '[prop]', description: '覆盖对应列单元格（如 #id、#operation）' },
  { name: 'operation', description: '操作列内容' },
  { name: 'search-[prop]', description: '覆盖对应搜索项' },
  { name: 'empty', description: '空状态自定义' },
  { name: 'expand', description: '展开行内容（el-table）' },
  { name: 'paginationLeft', description: '分页区左侧扩展' },
  { name: 'paginationRight', description: '分页区右侧扩展' },
]

const exposeItems = [
  { name: 'refresh', type: 'fn', description: '重新执行当前搜索条件' },
  {
    name: 'reset',
    type: 'fn',
    description: '重置搜索参数到 defaultValue + 清空分页 + 刷新（保留多选）',
  },
  { name: 'getSelectedRows', type: 'fn', description: '当前多选选中的行' },
  { name: 'clearSelection', type: 'fn', description: '清空所有选中' },
  { name: 'getSearchParams', type: 'fn', description: '当前搜索参数快照' },
  { name: 'setSearchParams', type: 'fn', description: '程序化修改搜索参数（回第 1 页 + 刷新）' },
  {
    name: 'element',
    type: 'ComponentPublicInstance | null',
    description: 'element-plus 表格实例（仅 element-plus 引擎）',
  },
  { name: 'engine', type: 'TableEngine', description: '当前激活的引擎（首次挂载锁定）' },
]

const columnsItems = [
  {
    name: 'prop',
    type: 'string',
    required: true,
    description: '字段名（v-for key + table column prop + search key）',
  },
  { name: 'label', type: 'string', required: true, description: '显示文本（表头 + 表单 label）' },
  {
    name: 'type',
    type: 'enum',
    description: "特殊列类型（值: 'index' | 'selection' | 'expand' | 'operation'）",
  },
  { name: 'search', type: 'SearchConfig', description: '搜索配置（缺省则该列不参与搜索）' },
  { name: 'enum', type: 'EnumProps[]', description: '字典映射（自动渲染 ElTag）' },
  { name: 'isFilterEnum', type: 'boolean', description: '是否从 useDict 异步字典过滤' },
  { name: 'render', type: 'fn', description: '自定义单元格渲染（返回 VNode）' },
  { name: 'tableProps', type: 'object', description: '透传给 ElTableColumn / VxeColumn' },
]

/* ───────────── 代码片段（DemoField code prop） ───────────── */

const basicCode = `<template>
  <ProTable
    :columns="columns"
    :request-api="mockRequestApi"
    table-key="demo"
    row-key="id"
  />
</template>

<script setup lang="tsx">
import { ProTable, type ProColumn } from '@/components/ProTable'

const columns: ProColumn[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '姓名', search: { el: 'input' } },
  { prop: 'status', label: '状态', enum: [{ label: '启用', value: 1 }] },
]
<\/script>`

const enumCode = `// enum 字段自动渲染为 ElTag
const STATUS = [
  { label: '启用', value: 1, tagType: 'success' },
  { label: '禁用', value: 0, tagType: 'info' },
]

// 在 columns 中引用
const columns = [
  { prop: 'status', label: '状态', enum: STATUS },
]`

const slotsCode = `<ProTable :columns="columns" :request-api="api">
  <template #tableHeader>
    <strong>自定义标题</strong>
  </template>
  <template #toolButton>
    <ElButton>自定义按钮</ElButton>
  </template>
  <template #operation="{ row }">
    <ElButton @click="onEdit(row)">编辑</ElButton>
  </template>
</ProTable>`

const exposeCode = `const proTableRef = ref<ProTableExpose>()

async function refresh() {
  await proTableRef.value?.refresh()
}

template: <ProTable ref="proTableRef" :columns="..." />`

/* ───────────── 自定义渲染（JSX / h()）演示 ───────────── */

/** 列定义：演示 col.render 三种用法
 *  1. JSX 渲染按钮组（操作列）
 *  2. JSX 条件渲染（年龄颜色 + 🎉）
 *  3. JSX 渲染复杂结构（角色 ElTag + 文字）
 * 注：本文件用 lang="tsx"（vue 3 JSX 编译，@vitejs/plugin-vue-jsx 已配） */
const renderColumns: ProColumn[] = [
  { prop: 'id', label: 'ID', width: 80 },
  {
    prop: 'name',
    label: '姓名（JSX + headerRender 演示）',
    minWidth: 180,
    /** headerRender：返回带 tooltip 的表头（spec §一 ProColumn.headerRender 字段） */
    headerRender: () => (
      <el-tooltip content="用户的真实姓名" placement="top">
        <span>
          姓名 <i style={{ color: '#409eff', cursor: 'help' }}>ⓘ</i>
        </span>
      </el-tooltip>
    ),
  },
  {
    prop: 'age',
    label: '年龄（JSX 自定义格式）',
    width: 140,
    /** JSX render：返回带条件颜色的 span */
    render: ({ row }) => (
      <span style={{ color: Number(row.age) >= 30 ? '#67c23a' : '#909399' }}>
        {row.age} 岁 {Number(row.age) >= 30 ? '🎉' : ''}
      </span>
    ),
  },
  {
    prop: 'role',
    label: '角色（JSX 多元素）',
    width: 200,
    /** JSX render：返回 ElTag + span 多元素 */
    render: ({ row }) => {
      const roleMap: Record<
        string,
        { label: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }
      > = {
        admin: { label: '管理员', type: 'danger' },
        editor: { label: '编辑', type: 'warning' },
        guest: { label: '访客', type: 'info' },
      }
      const r = roleMap[String(row.role)]
      return r ? (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <el-tag type={r.type} size="small">
            {r.label}
          </el-tag>
          <span style={{ color: '#909399', fontSize: '12px' }}>(动态)</span>
        </div>
      ) : (
        <span>{String(row.role)}</span>
      )
    },
  },
  {
    prop: 'createdAt',
    label: '创建时间（JSX 格式化）',
    width: 180,
    /** JSX render：返回格式化日期 + 条件颜色（3 天内绿色） */
    render: ({ row }) => {
      const date = new Date(String(row.createdAt))
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const isRecent = Date.now() - date.getTime() < 1000 * 60 * 60 * 24 * 3
      return (
        <span style={{ color: isRecent ? '#67c23a' : undefined }}>
          {y}-{m}-{d}
        </span>
      )
    },
  },
  {
    prop: 'operation',
    label: '操作（JSX 多按钮）',
    type: 'operation',
    width: 200,
    /** JSX render：返回多个 ElButton（按钮组） */
    render: ({ row }) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <el-button type="primary" link size="small" onClick={() => handleViewDetail(row)}>
          查看
        </el-button>
        <el-button
          type="warning"
          link
          size="small"
          onClick={() => ElMessage.info(`编辑 ${(row as UserRow).name}`)}
        >
          编辑
        </el-button>
        <el-button
          type="danger"
          link
          size="small"
          onClick={() => ElMessage.warning(`删除 ${(row as UserRow).name}`)}
        >
          删除
        </el-button>
      </div>
    ),
  },
]

const renderCode = `// 列定义：3 种 render 用法
const columns: ProColumn[] = [
  {
    prop: 'age',
    label: '年龄',
    render: ({ row }) => h('span', { style: { color: '#67c23a' } }, \`\${row.age} 岁\`),
  },
  {
    prop: 'role',
    label: '角色',
    render: ({ row }) => h(ElTag, { type: 'warning' }, () => '编辑'),
  },
  {
    prop: 'operation',
    label: '操作',
    render: ({ row }) =>
      h('div', null, [
        h(ElButton, { onClick: () => onView(row) }, () => '查看'),
        h(ElButton, { onClick: () => onEdit(row) }, () => '编辑'),
      ]),
  },
]`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="ProTable 配置驱动表格"
      source="src/components/ProTable/ProTable.vue"
      :introductions="[
        '基于 columns schema 的配置驱动表格组件，同一 columns 数组同时驱动搜索项与表格列。',
        '下方演示：基础用法 / enum 自动渲染 ElTag / 自定义插槽 / defineExpose 调用。',
      ]"
    >
      <div :class="bem.e('start-here')">
        <strong>👀 先看这个 —— 4 个场景按推荐顺序浏览</strong>
        <p>
          <strong>① 基础</strong>
          （必看）—— columns 同时驱动搜索与表格
        </p>
        <p>
          <strong>② enum</strong>
          （必看）—— 字典自动渲染 ElTag
        </p>
        <p>
          <strong>③ 插槽</strong>
          （进阶）—— tableHeader / toolButton / operation / id
        </p>
        <p>
          <strong>④ defineExpose</strong>
          （进阶）—— refresh / reset 外部调用
        </p>
      </div>

      <!-- 基础用法 -->
      <section id="demo-basic">
        <DemoField label="基础用法（columns 驱动搜索 + 表格）" :code="basicCode">
          <ProTable
            :columns="columns"
            :request-api="mockRequestApi"
            table-key="demo-pro-table-basic"
            row-key="id"
            :page-size="5"
          >
            <template #operation="{ row }">
              <ElButton link type="primary" size="small" @click="handleViewDetail(row)">
                查看
              </ElButton>
            </template>
            <template #id="{ row }">
              <ElTag size="small">#{{ row.id }}</ElTag>
            </template>
          </ProTable>
        </DemoField>
      </section>

      <!-- enum 自动渲染 ElTag -->
      <section id="demo-enum">
        <DemoField label="enum 自动渲染 ElTag" :code="enumCode">
          <p :class="bem.e('hint')">
            <code>enum</code>
            字段自动渲染为 ElTag，搜索项自动生成下拉（见上方"基础用法"演示）。
          </p>
          <div :class="bem.e('tag-demo')">
            <ElTag v-for="opt in STATUS_OPTIONS" :key="String(opt.value)" :type="opt.tagType">
              {{ opt.label }} ({{ opt.value }})
            </ElTag>
          </div>
        </DemoField>
      </section>

      <!-- 自定义插槽 -->
      <!-- 自定义渲染（col.render） -->
      <section id="demo-render">
        <DemoField label="自定义渲染（render 函数返回 VNode）" :code="renderCode">
          <ProTable
            :columns="renderColumns"
            :request-api="mockRequestApi"
            table-key="demo-pro-table-render"
            row-key="id"
            :page-size="5"
          />
        </DemoField>
      </section>

      <section id="demo-slots">
        <DemoField label="自定义插槽" :code="slotsCode">
          <ProTable
            :columns="columns"
            :request-api="mockRequestApi"
            table-key="demo-pro-table-slots"
            row-key="id"
            :page-size="3"
          >
            <template #tableHeader>
              <strong>用户列表（自定义标题，演示 tableHeader 插槽）</strong>
            </template>
            <template #toolButton>
              <ElButton size="small">自定义按钮（演示 toolButton 插槽）</ElButton>
            </template>
            <template #operation="{ row }">
              <ElButton link type="primary" size="small" @click="handleViewDetail(row)">
                查看
              </ElButton>
              <ElButton link type="danger" size="small" @click="handleDelete(row)">删除</ElButton>
            </template>
            <template #id="{ row }">
              <ElTag size="small" type="warning">#{{ row.id }}</ElTag>
            </template>
          </ProTable>
        </DemoField>
      </section>

      <!-- defineExpose -->
      <section id="demo-expose">
        <DemoField label="defineExpose 调用（refresh / reset）" :code="exposeCode">
          <div :class="bem.e('actions')">
            <ElButton :icon="Refresh" type="primary" @click="handleRefresh">手动 refresh</ElButton>
            <ElButton :icon="Search" @click="handleReset">手动 reset</ElButton>
            <span :class="bem.e('msg')">外部按钮触发 ProTable 实例方法</span>
          </div>
          <ProTable
            ref="proTableRef"
            :columns="columns"
            :request-api="mockRequestApi"
            table-key="demo-pro-table-expose"
            row-key="id"
            :page-size="3"
          >
            <template #id="{ row }">
              <ElTag size="small">#{{ row.id }}</ElTag>
            </template>
          </ProTable>
        </DemoField>
      </section>

      <!-- API 文档 -->
      <ApiTable title="ProTable Props" :items="propsItems" />
      <ApiTable title="ProTable Slots" :items="slotsItems" />
      <ApiTable title="ProTable Expose（ref）" :items="exposeItems" />
      <ApiTable title="ProColumn 关键字段" :items="columnsItems" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-pro-table {
  padding: 16px;

  &__start-here {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-radius: 4px;

    p {
      margin: 4px 0;
    }
  }

  &__hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  &__tag-demo {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 16px;
    background: var(--el-bg-color);
    border-radius: 4px;
  }

  &__actions {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__msg {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }
}
</style>
