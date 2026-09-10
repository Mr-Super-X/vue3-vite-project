import { describe, it, expect } from 'vitest'
import { SCSS_PREPROCESSOR_OPTIONS } from './scss'

describe('SCSS_PREPROCESSOR_OPTIONS', () => {
  it('silenceDeprecations 包含 new-global 与 if-function', () => {
    expect(SCSS_PREPROCESSOR_OPTIONS.silenceDeprecations).toContain('new-global')
    expect(SCSS_PREPROCESSOR_OPTIONS.silenceDeprecations).toContain('if-function')
  })

  it('additionalData 包含 bem @use 语句', () => {
    expect(SCSS_PREPROCESSOR_OPTIONS.additionalData).toContain(
      "@use '@/assets/styles/mixins/bem' as *"
    )
  })

  it('默认 $BEM_PREFIX 为 vv', () => {
    expect(SCSS_PREPROCESSOR_OPTIONS.additionalData).toContain("$BEM_PREFIX: 'vv'")
  })
})
