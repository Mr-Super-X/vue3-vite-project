/**
 * Schema 元数据查询的中央索引（O(1) 查表替代 O(n) 遍历）：
 * 一次遍历构建 byName / fieldNames / allNames / crossRules / reverseIndex / dependsOnMap。
 * schema 整体替换时自动重建；局部修改需手动调 reindex()（与 reactiveSchema 行为一致）。
 */
import { ref, watch, type Ref } from 'vue'
import type { SchemaNode } from '../types'
import { buildIndex, type SchemaIndex } from './use-schema-index.builder'

/**
 * useSchemaIndex 返回值：schema 元数据中央索引（O(1) 查表），含 6 个响应式 ref
 * + getFieldNames (查表) + reindex (手动重建) 两个方法。
 */
export interface UseSchemaIndexReturn {
  byName: Readonly<Ref<SchemaIndex['byName']>>
  fieldNames: Readonly<Ref<readonly string[]>>
  allNames: Readonly<Ref<readonly string[]>>
  crossRules: Readonly<Ref<SchemaIndex['crossRules']>>
  reverseIndex: Readonly<Ref<SchemaIndex['reverseIndex']>>
  dependsOnMap: Readonly<Ref<SchemaIndex['dependsOnMap']>>
  /** O(1) 查表复用，避免重复拷贝 */
  getFieldNames(includeIgnore: boolean): readonly string[]
  /** 节点深改后手动重建（reactiveSchema 不感知内部修改） */
  reindex(): void
}

/** useSchemaIndex —— schema 元数据中央索引（O(1) 查表替代 O(n) 遍历） */
export function useSchemaIndex(
  schemaGetter: () => SchemaNode | SchemaNode[] | string | undefined
): UseSchemaIndexReturn {
  const initial = buildIndex(schemaGetter())
  const byName = ref(initial.byName) as Ref<SchemaIndex['byName']>
  const fieldNames = ref(initial.fieldNames) as Ref<readonly string[]>
  const allNames = ref(initial.allNames) as Ref<readonly string[]>
  const crossRules = ref(initial.crossRules) as Ref<SchemaIndex['crossRules']>
  const reverseIndex = ref(initial.reverseIndex) as Ref<SchemaIndex['reverseIndex']>
  const dependsOnMap = ref(initial.dependsOnMap) as Ref<SchemaIndex['dependsOnMap']>

  function rebuild(): void {
    const idx = buildIndex(schemaGetter())
    byName.value = idx.byName
    fieldNames.value = idx.fieldNames
    allNames.value = idx.allNames
    crossRules.value = idx.crossRules
    reverseIndex.value = idx.reverseIndex
    dependsOnMap.value = idx.dependsOnMap
  }

  // schema 整体替换时重建（与 reactiveSchema 顶层 watch 一致）
  watch(schemaGetter, rebuild)

  function getFieldNames(includeIgnore: boolean): readonly string[] {
    return includeIgnore ? allNames.value : fieldNames.value
  }

  return {
    byName,
    fieldNames,
    allNames,
    crossRules,
    reverseIndex,
    dependsOnMap,
    getFieldNames,
    reindex: rebuild,
  }
}

export { buildIndex } from './use-schema-index.builder'
export type { SchemaIndex, CrossRuleEntry } from './use-schema-index.builder'
