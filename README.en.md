# vue3-vite-project · Four-Panel Engineering Template

[简体中文](./README.md) | **English**

A Vue 3 engineering template covering **four panel forms in one codebase**: internal admin, public portal, mobile H5, and data big-screen. Feature-Sliced architecture, fully mockable without a backend.

| Panel            | Entry        | Capability                                                                                                       |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Admin (internal) | `/workbench` | `default` layout: sidebar + header + multi-tabs                                                                  |
| Portal (public)  | `/home`      | `portal` layout: top horizontal nav, no sidebar                                                                  |
| Mobile H5        | `/h5-demo`   | `h5` layout + rem adaptation ([docs/34](docs/34-H5布局与rem适配.md))                                             |
| Big screen       | `/big-demo`  | `big` layout + scale adaptation, 1920/2560/4K/9000px spliced screens ([docs/35](docs/35-大屏布局与scale适配.md)) |

## Tech Stack

Vue 3.5 · TypeScript 6 (strict) · Vite 8 · Pinia 3 · Element Plus 2.14 · Vue Router 5 · UnoCSS 66 · pnpm 11

Node `^22.18 || >=24.12` · pnpm `>=11 <13` (enforced via `only-allow` preinstall)

## Quick Start

```bash
git clone <your-fork-url> my-project
cd my-project
pnpm install
pnpm dev:local        # mock mode, no backend needed → http://localhost:5174
```

Log in with **admin / 123456** at `/login`. After starting a real business module:

```bash
pnpm new-module order     # scaffolds 6 files + route, menu appears automatically
pnpm check:routes         # route consistency gate (same check as CI)
```

## Highlights

- **ProTable / XForm**: high-level table & low-code form engine with full event/slot contracts and unit tests
- **Four-panel adaptation**: mount a layout, write design-draft px — rem (H5) and scale (big screen) handled at compile/runtime layers
- **Engineering rigor**: 191 unit specs + 6 Playwright e2e; `type-check:full` / `lint` / `check:routes` / `check:aliases` / `check:doc-currency` all gate CI
- **State design**: httpOnly cookie auth (no token in localStorage), per-field store persistence, defensive UI three-state mandate

## Task Quick Reference

| I want to…                                          | Go to                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Get running in 30 minutes                           | [docs/10-新手指引.md](docs/10-新手指引.md) (Chinese)                                                              |
| Add a business module                               | `pnpm new-module <kebab-name>` → [docs/07](docs/07-路由模块设计.md)                                               |
| Build a table/form page                             | [docs/29-ProTable使用指南.md](docs/29-ProTable使用指南.md) / [docs/24-XForm使用指南.md](docs/24-XForm使用指南.md) |
| Add an H5 mobile page                               | [docs/34-H5布局与rem适配.md](docs/34-H5布局与rem适配.md) §1                                                       |
| Add a big-screen page                               | [docs/35-大屏布局与scale适配.md](docs/35-大屏布局与scale适配.md) §5                                               |
| Release / follow upstream after fork                | [docs/36-Fork升级与版本策略.md](docs/36-Fork升级与版本策略.md)                                                    |
| Decide where code belongs (utils/composable/store…) | [docs/18-代码组织决策表.md](docs/18-代码组织决策表.md) §2                                                         |

## Documentation

In-depth docs (35+) are **in Chinese** under [docs/](docs/) — the quick-reference table above is the entry point. Architecture decisions: [docs/37](docs/37-h5-rem适配决策记录.md) / [docs/38](docs/38-big-scale适配决策记录.md) (h5 rem & big scale ADRs).

## License & Versioning

MIT © 2026 Mr.Mickey (Mr-Super-X) — see [LICENSE](./LICENSE).
Versioning and fork-upgrade strategy: [docs/36](docs/36-Fork升级与版本策略.md).
