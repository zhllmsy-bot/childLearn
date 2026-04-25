# R4 全量优化执行 Spec

> 日期：2026-04-26  
> 基线：`c6f3f5a feat: 更新编程模块与视觉设计`  
> 目标：把 R4 评审中暴露的“编程岛能力错位、主应用过重、token 半抽象、combo/触达/PWA 细节、内容丰度不足”一次收口到可验证状态。

## 成功标准

- 编程岛使用 `Block[]` 树形程序作为唯一运行模型，不再以扁平 `ProgrammingCommandId[]` 作为 UI 状态。
- 解释器能力被真实关卡覆盖：关卡扩至 30 关，覆盖 `repeat(n)`、`ifPath`、`collect`、`ifGem`、`whileNotGoal`、`jump`、`procCall`。
- 编程编辑器支持点击添加、拖拽添加、拖拽重排、键盘排序和删除；`ProgrammingIslandPage` 拆成页面容器 + Board + Editor + LevelPicker 等子组件。
- `App.tsx` 主文件瘦身到 800 行以内，练习流/导航/语音/编程奖励进入独立 hook 或组件。
- `BG`、`ACCENT`、`SHADOW`、`RADIUS`、`TYPE`、`SPACE` 变为数值/hex/rgba token；Tailwind 主题消费同一套命名颜色，组件不再把 semantic 色值硬编码在 QuestionCard 内。
- TopBar 主触达按钮达到儿童友好 72px；练习中 combo 只保留 `combo >= 3` 的 ComboBanner 主展示，避免右上角重复堆叠。
- PWA 首启离线有 `index.html` 兜底；maskable icon 使用独立安全区资源。
- 语言乐园内容从 24 张扩到至少 48 张，首页大入口叙事不再被内容量拖住。
- `npm test`、`npm run build` 通过；Vite 只在 `5173 --strictPort` 启动并完成冒烟。

## 执行 Todo

### P0 编程岛模型闭环

- [x] 将关卡 `allowedCommands` 改为 `ProgrammingBlockTemplateId[]`，运行状态使用 `Program = Block[]`。
- [x] 增加 `createBlockFromTemplate`，统一 UI 添加、拖拽添加、测试样例和关卡默认块。
- [x] 扩展 `InterpreterWorld`：支持 `gems`、`procedures`、动态尺寸和最大步数防护。
- [x] 解释器实现 `collect`、`ifGem`、`whileNotGoal`、`jump`、`procCall`，并输出世界态与失败原因。
- [x] 增加到 30 关内容，覆盖 5 个世界、Boss/挑战关、条件、收集、循环、跳跃、过程调用。
- [x] 把 `starThresholds` 改为命名对象，消除 `[three,two,one]` 反直觉配置。

### P0/P1 编程岛交互与拆分

- [x] 新增 `ProgrammingEditor.tsx`，接入 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`。
- [x] 支持 palette 拖到程序区、程序区排序、删除、清空、`repeat(n)` 参数调整。
- [x] 新增 `ProgrammingBoard.tsx` 和 `ProgrammingLevelPicker.tsx`，把页面文件降到容器职责。
- [x] 保留速度档位，新增单步执行和进度条；播放中禁止结构编辑。
- [x] palette 拖拽仅在程序区落点生效，避免误拖到空白处添加指令。

### P0 App 架构收敛

- [x] 新增 `useAppScheduler` 管理定时器、flow id 和等待工具。
- [x] 新增 `useAppScrollMemory` 管理 scene scroll 持久化。
- [x] 新增 `useSceneNavigation` 管理 Home / 模块入口切换共性逻辑。
- [x] 新增 `useAppVoicePrompt` 管理不同 scene 的语音文案选择。
- [x] 新增 `useProgrammingRewards` 管理编程通关奖励幂等与埋点。
- [x] 让 `App.tsx` 只保留装配入口；剩余大型根组件迁到 `AppRoot.tsx`，并抽出高复用 controller hooks。

### P1 Token、触达、PWA

- [x] 将 token 改成可运行时消费的数据对象，并提供少量 class/style adapter。
- [x] `tailwind.config.js` 增加 childLearn 色板，组件使用命名 token class。
- [x] `QuestionCard` 的物件色从 `SEMANTIC` 派生，不再硬编码成功色。
- [x] `ComboBanner` 为 5/10/15 连对提供真实差异化。
- [x] TopBar 按钮升级到 72px，并仅在 `combo >= 3` 时由 ComboBanner 展示连对。
- [x] manifest 使用独立 maskable icon，service worker 离线导航兜底 `index.html`。

### P1 内容与质量

- [x] 识字扩展到 24 张，英语扩展到 26 张；编程扩展到 30 关。
- [x] 内容测试检查数量、id 唯一、词条字段完整。
- [x] 补齐解释器、worldOps、starEvaluator、编程关卡数据测试，覆盖 106 条测试。
- [x] 运行 `npm test`、`npm run build`、`npm run dev -- --host 0.0.0.0 --port 5173 --strictPort`。

## 非目标

- 不把全站视觉重做成新风格；本轮以 R4 已接受的视觉方向为基础做收敛。
- 不引入后端或账号系统。
- 不把语言/英语模块做成完整课程路径，只补足内容厚度和数据质量。
