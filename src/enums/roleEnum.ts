export enum RoleEnum {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export const ROLE_LABELS: Record<RoleEnum, string> = {
  [RoleEnum.SUPER_ADMIN]: '超级管理员',
  [RoleEnum.ADMIN]: '管理员',
  [RoleEnum.USER]: '普通用户',
  [RoleEnum.GUEST]: '访客',
}