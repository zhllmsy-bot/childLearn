# 编程模块 R4 收口 Todo（完成版）

> 状态：2026-04-26 已按 R4 评审口径收口。  
> 验收命令：`npm test`、`npm run build`、`npm run dev -- --host 0.0.0.0 --port 5173 --strictPort`。

## 完成口径

- [x] 程序运行模型统一为 `Program = Block[]` 树形结构，支持 `body / branchTrue / branchFalse`。
- [x] `ProgrammingCommandId[]` 不再作为编程岛 UI 运行状态；指令入口统一走 `createBlockFromTemplate`。
- [x] `interpret` 使用栈式 generator，输出 `ExecutionStep.activeBlockId`、bot 状态、世界状态和阻断原因。
- [x] `forward / turnLeft / turnRight / repeat / ifPath / ifGem / collect / jump / whileNotGoal / procCall` 均有真实关卡覆盖。
- [x] `collectOnTile / canGoForward / jumpPosition / positionKey` 等世界纯函数有独立测试。
- [x] 运行时有 `maxSteps / maxOperations / maxCallDepth` 防护，递归过程调用不会无限展开。
- [x] 编程岛支持运行、暂停、继续、单步、速度档位、执行进度条和 active block 高亮。
- [x] 失败态保留当前格红色反馈、阻断原因文案和语音提示。
- [x] 关卡扩展为 30 关，覆盖森林、草地、洞穴、峡谷、编程塔 5 个世界，每个世界至少 5 关并有 Boss/挑战关。
- [x] 每关包含 `worldId`、`difficultyStars`、`conceptTags`、`optimalSteps`、命名 `starThresholds`。
- [x] 每关 `sampleProgram` 可运行至 success，并通过自动化测试校验必需概念块。
- [x] 三星评价改为命名阈值，并新增 `explainStarRating` 输出“为何得星”的 trace。
- [x] 编程通关接入贴纸、花园浇水、段位星、combo，并通过 `isNewCompletion` 做幂等奖励保护。
- [x] 指令编辑器接入 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`。
- [x] 支持点击添加、拖拽添加、程序区重排、键盘排序、删除、清空和 `repeat(n)` 参数调整。
- [x] palette 拖拽只有落在程序区或已有块上才会添加，避免误拖到空白处生成指令。
- [x] 编程页面拆为 `ProgrammingIslandPage`、`ProgrammingEditor`、`ProgrammingBoard`、`ProgrammingLevelPicker`。
- [x] 棋盘使用小满 SVG 角色状态（idle/happy/thinking/cheer），不再保留临时 `LightHeroModel`。
- [x] TopBar 触达按钮达到 72px；练习 combo 只由 `ComboBanner` 在 `combo >= 3` 时主展示。
- [x] token 进入命名色板：Home、Option、Practice、Result 等关键入口不再散落核心 hex。
- [x] PWA 使用独立 any/maskable PNG，service worker 首启离线可回落到 `/index.html`。
- [x] 语言乐园内容扩至 50 张卡片量级，支撑首页大入口。
- [x] 全量测试从 99 条扩至 106 条并通过；生产构建通过。

## 后续增强池

这些是下一代产品深度，不计入 R4 完成口径：

- 递归块可视化编辑器：把 `repeat / if / while` 的内部 body 做成真正 dropzone，而不是当前的预设 body + 参数调整。
- 长按复制/删除/参数菜单：当前已提供显式删除和重复次数按钮，后续可加长按菜单。
- 地图 tile system：草地、石头、水、桥、传送门、开关、黑暗视野等规则可在 world model v2 设计。
- 等轴测地图、宝石旋转、角色走格 spring 细节和更完整动作音效。
- UI 交互测试矩阵：拖拽、暂停、单步、奖励幂等可继续补浏览器级测试。
- AppRoot 进一步拆成 practice/flow/reward controller hooks，降低单文件认知负担。
