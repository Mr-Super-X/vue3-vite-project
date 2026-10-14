import { describe, expect, it } from 'vitest'
import {
  H5_DESIGN_WIDTH,
  H5_EXCLUDE_REGEX,
  H5_REM_ROOT_VALUE,
  isH5RemTarget,
  POSTCSS_PLUGINS,
} from './postcss'

describe('build/postcss — h5 rem 转换配置', () => {
  it('rootValue = 设计稿宽度 / 10（828 稿 → 82.8）', () => {
    expect(H5_DESIGN_WIDTH).toBe(828)
    expect(H5_REM_ROOT_VALUE).toBe(82.8)
  })

  it.each([
    ['win 反斜杠 h5 layout', 'D:\\proj\\src\\layouts\\h5\\index.vue', true],
    ['posix h5 layout', '/proj/src/layouts/h5/index.vue', true],
    ['win h5-demo 模块', 'D:\\proj\\src\\modules\\h5-demo\\views\\Index.vue', true],
    ['posix h5 前缀模块（未来扩展）', '/proj/src/modules/h5-mall/views/Index.vue', true],
    ['default layout 不命中', 'D:\\proj\\src\\layouts\\default\\index.vue', false],
    ['portal layout 不命中', '/proj/src/layouts/portal/index.vue', false],
    ['普通模块不命中', '/proj/src/modules/user/views/List.vue', false],
    ['非 h5 前缀模块不命中', '/proj/src/modules/demo/views/Index.vue', false],
    ['空字符串不命中', '', false],
  ])('isH5RemTarget: %s', (_label, filePath, expected) => {
    expect(isH5RemTarget(filePath)).toBe(expected)
  })

  it('POSTCSS_PLUGINS 含且仅含 postcss-pxtorem 插件对象', () => {
    expect(POSTCSS_PLUGINS).toHaveLength(1)
    expect(POSTCSS_PLUGINS[0]).toMatchObject({ postcssPlugin: 'postcss-pxtorem' })
  })

  // exclude 正则语义与 isH5RemTarget 相反：命中 = 排除不转换。
  // 用例覆盖 vite 8 真实 file 形态（正斜杠 + ?vue query 后缀），防止函数形态缺陷复发
  // （postcss-pxtorem v6.1.0 exclude 函数返回 false 时 filePath.match(fn) 抛 SyntaxError）
  it.each([
    [
      'h5 layout（正斜杠+query）不排除',
      'D:/proj/src/layouts/h5/index.vue?vue&type=style&index=0&lang.scss',
      false,
    ],
    [
      'h5-demo 模块（正斜杠+query）不排除',
      'D:/proj/src/modules/h5-demo/views/Index.vue?vue&type=style&index=0&lang.scss',
      false,
    ],
    ['h5 layout（win 反斜杠）不排除', 'D:\\proj\\src\\layouts\\h5\\index.vue', false],
    [
      'default layout 排除',
      'D:/proj/src/layouts/default/index.vue?vue&type=style&index=0&lang.scss',
      true,
    ],
    [
      'portal layout 排除',
      'D:/proj/src/layouts/portal/index.vue?vue&type=style&index=0&lang.scss',
      true,
    ],
    [
      '普通模块排除',
      'D:/proj/src/modules/user/views/List.vue?vue&type=style&index=0&lang.scss',
      true,
    ],
    [
      'node_modules 排除',
      'D:/proj/node_modules/.pnpm/element-plus/theme-chalk/el-button.css',
      true,
    ],
    ['uno 虚拟 css 排除', 'D:/proj/src/__uno.css', true],
  ])('H5_EXCLUDE_REGEX: %s', (_label, filePath, shouldExclude) => {
    expect(H5_EXCLUDE_REGEX.test(filePath)).toBe(shouldExclude)
  })
})
