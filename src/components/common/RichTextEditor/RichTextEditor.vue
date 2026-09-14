<!--
  RichTextEditor —— 基于 WangEditor V5 的高级富文本编辑器
  设计：v-model 双向绑定（DOMPurify 在 prop/emit 双向链路上清洗）+ 防循环更新 + uploadApi 自定义图片上传 + onBeforeUnmount 调 destroy
  V5 工具栏与编辑区分离：Toolbar 通过 :editor 接收 Editor 实例建立关联
  @see https://www.wangeditor.com/v5/
  @see https://github.com/cure53/DOMPurify
  @group 富文本编辑器
-->
<script setup lang="ts">
/**
 * RichTextEditor —— 基于 WangEditor V5 封装的 v-model 富文本编辑器
 *
 * 核心能力：
 * - v-model 双向绑定（emit 前 + watch setHtml 前共用同一份 DOMPurify 清洗配置）
 * - 防循环更新：watch 内比对「safeHtml === editor.getHtml()」阻断 setHtml → onChange → emit 死循环
 * - uploadApi 自定义图片上传（拦截默认 base64，走 OSS/后端存储）
 * - onBeforeUnmount 必须 destroy，否则编辑器 DOM 监听器泄漏 + 路由切换报 "Cannot read properties of null"
 *
 * @see [`./types.ts`](./types.ts) Props / Emits 类型
 * @group 通用组件：RichTextEditor
 */
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import DOMPurify from 'dompurify'
// @ts-expect-error - @wangeditor/editor-for-vue@5.1.12 的 package.json exports 字段缺 "types" 条件，
// 导致 vue-tsc 找不到 dist/src/index.d.ts。运行时由 vite 用 module 字段解析 esm.js 不受影响。
// 待上游修复或本项目提 PR 加 paths 配置后移除此注释。
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { type IDomEditor, type IEditorConfig, type IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import type { RichTextEditorEmits, RichTextEditorProps } from './types'

defineOptions({ name: 'RichTextEditor' })

const props = withDefaults(defineProps<RichTextEditorProps>(), {
  height: '300px',
  placeholder: '请输入内容...',
  readOnly: false,
  // uploadApi 不设默认：exactOptionalPropertyTypes 下 undefined 不能赋值给可选 prop，
  // 保持 undefined 让消费方通过 `if (!props.uploadApi)` 判定即可
})
const emit = defineEmits<RichTextEditorEmits>()

// BEM 命名空间：vv-rich-text-editor / __toolbar / __editor
// createNamespace 由 unplugin-auto-import 全局注入，详见 vite.config.ts AutoImport.imports
const bem = createNamespace('rich-text-editor')

/**
 * Editor 实例用 shallowRef 而非 ref（vue 底层 API）：WangEditor 内部维护 Slate 数据结构 + DOM 节点，
 * 深响应化会拖慢渲染且无业务收益。
 */
const editorRef = shallowRef<IDomEditor | null>(null)

// 工具栏默认配置：隐藏「上传视频」菜单（本组件只封装图片上传场景）
const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['uploadVideo'],
}

// 编辑区高度转 CSS：'300px' 原样 / 数字按 px 处理
// 抽成 computed 是为了模板不写复杂表达式（项目「模板层不写复杂表达式」规范）
const heightCss = computed<string>(() =>
  typeof props.height === 'number' ? `${props.height}px` : props.height
)

// 编辑器配置：placeholder / readOnly + MENU_CONF['uploadImage']
// 注意 onChange / onCreated 等回调**不能**放在 defaultConfig 里，
// Editor 内部会主动抛 "请使用 @onChange 事件，不要放在 props 中" 错误（详见 editor-for-vue 源码）
const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  readOnly: props.readOnly,
  MENU_CONF: {
    uploadImage: {
      // 上传超时 5s（默认 30s 对富文本内联图片过长）
      timeout: 5 * 1000,
      /**
       * 拦截默认 base64 上传：调用 props.uploadApi 走 OSS/后端存储，
       * 拿到真实 URL 后 insertFn 插入编辑器。
       *
       * customUpload 与 defaultConfig.onChange 等「回调放在 props」的检查一样，
       * 是 WangEditor 故意设计的「状态来源单一化」机制——避免同一生命周期有多入口。
       * 这里 customUpload 是注册在 uploadImage 菜单的「子回调」，Editor 不会拦截。
       */
      customUpload: async (
        file: File,
        insertFn: (src: string, alt: string, href: string) => void
      ): Promise<void> => {
        const uploadApi = props.uploadApi
        if (!uploadApi) {
          ElMessage.warning('请先配置 uploadApi 以启用图片上传')
          return
        }
        try {
          const { url, alt } = await uploadApi(file)
          // insertFn 三参：图片 URL、alt 文本、链接 URL
          // 这里把 href 也指向图片地址，方便用户点击查看原图
          insertFn(url, alt ?? file.name, url)
        } catch (err) {
          // 上传失败给用户明确反馈（不静默吞错，遵循 §防御性编程 强约束）
          ElMessage.error('图片上传失败，请稍后再试')
          // 控制台留详细堆栈便于排查
          console.error('[RichTextEditor] uploadImage failed:', err)
        }
      },
    },
  },
}

/**
 * DOMPurify 清洗配置（统一入口，watch 和 handleChange 共用避免配置漂移）
 *
 * 设计：
 * - USE_PROFILES.html 等价于 ALLOWED_TAGS / ALLOWED_ATTR 的 HTML5 白名单（保留 a/p/img/strong 等富文本标签）
 * - FORBID_TAGS 黑名单：style（⚠ 是「标签」非「属性」——<style> 可 @import 远程 CSS 造成视觉欺骗，
 *   远程 CSS 的唯一入口在此封死）、script/iframe/object/embed/form（XSS 经典入口）
 * - FORBID_ATTR 黑名单：全套 on* 事件属性 + formaction
 * - ⚠ 不放行 style「属性」会废掉字号/字体/行高/颜色/背景色——wangEditor 这些菜单全部输出内联 style，
 *   禁用后 sanitize 剥掉 style + watch 的 setHtml 回写会把刚应用的样式立刻抹掉（用户视角=功能不生效）。
 *   style 属性在现代浏览器无脚本执行能力（expression/behavior 均为 IE 古董），放行是富文本编辑器行业标准。
 *
 * ⚠ 教训：之前只在 handleChange（emit 链路）调用 sanitize，但 watch（外部 prop 链路）未调用，
 * 导致 `<img onerror=...>` / `<a href="javascript:...">` 等通过 props.modelValue 直接 setHtml 进入编辑器 DOM，
 * 浏览器解析并执行，XSS 防御失效。两个入口必须共用同一份 sanitize 配置。
 */
const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'formaction'],
} as Parameters<typeof DOMPurify.sanitize>[1]

/** DOMPurify 清洗入口：watch 和 handleChange 共用，杜绝配置漂移 */
function sanitizeHtml(html: string): string {
  // DOMPurify 3.x 类型声明在某些 DOM lib 配置下会返回 TrustedHTML | string，
  // 这里业务始终按 string 处理
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as string
}

/** Editor 实例创建完成：缓存到 ref 供 setHtml / destroy / getHtml 使用 */
const handleCreated = (editor: IDomEditor): void => {
  editorRef.value = editor
}

/**
 * onChange 回调：编辑器内容变化 → 取 HTML → DOMPurify 清洗 → emit 给父组件。
 *
 * 关键设计：必须绕过 Editor 内部的 update:modelValue 通路。
 * Editor 内部 onChange 会 emit('update:modelValue', editorHtml)，但 emit 的是**未清洗**的 HTML，
 * 如果父组件直接 v-model，modelValue 会被脏数据污染，XSS 防御失效。
 *
 * 所以我们不监听 @update:model-value，只监听 @on-change，自己清洗后再 emit。
 */
const handleChange = (editor: IDomEditor): void => {
  const cleanHtml = sanitizeHtml(editor.getHtml())
  emit('update:modelValue', cleanHtml)
}

/**
 * watch props.modelValue：仅在「外部值 ≠ 编辑器当前 HTML」时 setHtml。
 *
 * 防循环原理：
 *   1. 用户输入 → Editor.onChange → handleChange → emit('update:modelValue', cleanHtml)
 *   2. props.modelValue 变为 cleanHtml → 本 watch 触发
 *   3. cleanHtml !== editor.getHtml()（编辑器内部是脏 HTML）→ setHtml(safeHtml)
 *   4. Editor 再次触发 onChange → handleChange → emit 同样 safeHtml
 *   5. props.modelValue 还是 safeHtml → 本 watch 触发
 *   6. safeHtml === editor.getHtml()（此时编辑器已被 setHtml 清洗过）→ **跳过 setHtml**，循环终止
 *
 * 不加这个判断会导致：setHtml → onChange → emit → watch → setHtml ... 的死循环。
 *
 * ⚠ 必传 safeHtml 而非 newHtml：外部 prop 传入的 HTML 可能是脏数据（API 返回 / 用户粘贴 / 第三方拼接），
 * 直接 setHtml 会让 onerror/javascript: 等进入 DOM 并被浏览器执行。sanitize 是必经闸门。
 *
 * ⚠ setHtml 用 Promise.resolve().then 包一层 try/catch：WangEditor 内部对某些 HTML 节点转换可能 reject
 * （如 demo 里的 `<img src="x">` 触发「Cannot resolve a DOM node from Slate node: {"text":""}」），
 * unhandledrejection 会冒泡到全局 errorHandler → 整个 demo 页面被错误页覆盖。
 * 这里 catch 静默处理：XSS 防御已经在 sanitize 完成，setHtml 失败不影响安全。
 */
watch(
  () => props.modelValue,
  (newHtml) => {
    const editor = editorRef.value
    if (editor == null) return
    const safeHtml = sanitizeHtml(newHtml ?? '')
    if (safeHtml === editor.getHtml()) return
    try {
      editor.setHtml(safeHtml)
    } catch (err) {
      console.error('[RichTextEditor] setHtml failed:', err)
    }
  }
)

/**
 * 组件卸载：必须 destroy 编辑器。
 *
 * 不 destroy 的后果：
 *   - 编辑器实例内的 toolbar/编辑区 DOM 监听器不会释放，造成内存泄漏
 *   - 路由切换时旧编辑器仍在监听 onChange，控制台报 "Cannot read properties of null"
 */
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
  editorRef.value = null
})
</script>

<template>
  <div :class="bem.b()">
    <!--
      Toolbar：V5 工具栏与编辑区是分离的两个组件，通过 :editor 把 Editor 实例传给 Toolbar 建立关联
      注意：Toolbar 自身 watch editor prop（immediate:true），所以传 null 时不会报错
    -->
    <Toolbar
      :editor="editorRef"
      :default-config="toolbarConfig"
      :mode="'default'"
      :class="bem.e('toolbar')"
    />
    <!--
      Editor：只传 :default-html 用于初始内容，**不传 :model-value** 避免 Editor 内部
      直接 emit 未清洗 HTML 覆盖我们的 v-model；同步逻辑由上面的 watch 接管
    -->
    <Editor
      :default-html="modelValue"
      :default-config="editorConfig"
      :mode="'default'"
      :class="bem.e('editor')"
      :style="{ height: heightCss }"
      @on-created="handleCreated"
      @on-change="handleChange"
    />
  </div>
</template>

<style lang="scss">
// BEM 根选择器与 createNamespace('rich-text-editor') 严格对齐
// 详见 §3 BEM 规范：非 scoped 样式 + .#{$BEM_PREFIX}- 前缀
.#{$BEM_PREFIX}-rich-text-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;

  &__toolbar {
    border-bottom: 1px solid #ebeef5;
  }

  &__editor {
    overflow-y: auto;

    // 覆盖 wangEditor 默认占位符颜色（与 EP 风格一致）
    .w-e-text-placeholder {
      color: #c0c4cc;
    }

    // 覆盖项目 reset.css 对字重/字形的全局重置（`*{font-weight:normal;font-style:normal}`）——
    // 否则 wangEditor 加粗/斜体命令 HTML 变化但视觉无变化。
    //
    // ⚠ 为什么必须连 [data-slate-string] 一起命中：WangEditor V5 基于 Slate，
    // 叶子文本渲染结构是 <strong><span data-slate-string>文本</span></strong>，
    // 可见文本在内层 span 上；而 `*` 重置对 span 是指定值，优先于从 strong
    // 继承来的样式——只恢复 strong/b 包裹层压不住内层 span（实测 span 字重 400）。
    // text-decoration 无需同理处理：该属性按规范会贯穿内联后代，u/s 视觉天然生效。
    b,
    strong,
    b [data-slate-string],
    strong [data-slate-string] {
      font-weight: bold;
    }
    i,
    em,
    i [data-slate-string],
    em [data-slate-string] {
      font-style: italic;
    }
    u {
      text-decoration: underline;
    }
    s,
    del {
      text-decoration: line-through;
    }
  }
}
</style>
