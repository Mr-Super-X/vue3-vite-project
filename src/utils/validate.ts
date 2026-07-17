export const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export const isPhone = (s: string): boolean => /^1[3-9]\d{9}$/.test(s)

// 简化版：仅校验格式（18 位 + 末位 X/x 或 15 位旧版）
export const isIdCard = (s: string): boolean => /^\d{17}[\dXx]$/.test(s) || /^\d{15}$/.test(s)
