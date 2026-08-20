import { describe, it, expect } from 'vitest'
import { resolveElComponentName, DEFAULT_COMPONENT_MAP } from './element-plus-adapter'

describe('resolveElComponentName(name, userComponentKeys?)', () => {
  it('resolves "Input" to "ElInput" from default map', () => {
    expect(resolveElComponentName('Input')).toBe('ElInput')
  })

  it('returns original name when userComponents list contains it', () => {
    expect(resolveElComponentName('MyInput', ['MyInput'])).toBe('MyInput')
  })

  it('returns null for unknown component (not in default map and not ElXxx)', () => {
    expect(resolveElComponentName('UnknownXYZ')).toBeNull()
  })

  it('passes through ElXxx native names directly', () => {
    expect(resolveElComponentName('ElInput')).toBe('ElInput')
    expect(resolveElComponentName('ElSelect')).toBe('ElSelect')
  })

  it('resolves various built-in shortcuts', () => {
    expect(resolveElComponentName('Select')).toBe('ElSelect')
    expect(resolveElComponentName('Switch')).toBe('ElSwitch')
    expect(resolveElComponentName('DatePicker')).toBe('ElDatePicker')
    expect(resolveElComponentName('InputNumber')).toBe('ElInputNumber')
    expect(resolveElComponentName('Cascader')).toBe('ElCascader')
  })

  it('DEFAULT_COMPONENT_MAP is exported and contains expected keys', () => {
    expect(DEFAULT_COMPONENT_MAP.Input).toBe('ElInput')
    expect(DEFAULT_COMPONENT_MAP.Select).toBe('ElSelect')
    expect(DEFAULT_COMPONENT_MAP.Switch).toBe('ElSwitch')
    expect(DEFAULT_COMPONENT_MAP.Option).toBe('ElOption')
    expect(DEFAULT_COMPONENT_MAP.RadioGroup).toBe('ElRadioGroup')
    expect(DEFAULT_COMPONENT_MAP.CheckboxGroup).toBe('ElCheckboxGroup')
    expect(DEFAULT_COMPONENT_MAP.Radio).toBe('ElRadio')
    expect(DEFAULT_COMPONENT_MAP.Checkbox).toBe('ElCheckbox')
    expect(DEFAULT_COMPONENT_MAP.Slider).toBe('ElSlider')
  })
})
