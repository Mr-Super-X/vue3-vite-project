/**
 * @vv/config 包出口 —— vite 工程配置单一来源
 *
 * 各 app 的 vite.config.ts 只消费 createViteConfig 工厂（见 create-vite-config.ts）；
 * 其余模块（scss/postcss/vendor-chunks/server/proxy/app-aliases）是工厂的可独立测试组成件，
 * 也可被脚本侧直接引用（如 generate-tsconfig-paths.ts 消费 app-aliases）。
 *
 * clean-mock-bundled 不在 barrel：它是工厂内部 mock 链路的私有组成件，
 * 独立消费场景不存在（无 mockPath 的 app 不该挂它）。
 */
// 显式 .ts 扩展名（不可省）：vite 加载 app 配置时把 workspace 包外置为 Node 原生 ESM，
// Node 不做扩展名补全；同时兼容 node --experimental-strip-types 直接执行
export * from './scss.ts'
export * from './vendor-chunks.ts'
export * from './server.ts'
export * from './proxy.ts'
export * from './postcss.ts'
export * from './app-aliases.ts'
export * from './create-vite-config.ts'
