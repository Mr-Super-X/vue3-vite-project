import auth from './auth'
import user from './user'
import menu from './menu'

// dev 聚合入口：新增 mock 路由模块时须同步登记 mock/mockProdServer.ts（prod 接线清单），两处不许分叉
export default [...auth, ...user, ...menu]
