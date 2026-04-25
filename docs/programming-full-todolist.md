# 编程模块重构完整 Todo（可执行版）

> 目标：把现有编程岛从「点击式演示」升级为可持续迭代的商业化入门编程体验。
> 约束：按当前项目代码风格拆分模块，不破坏现有接口。

## 总体规则

- 每个任务完成后要有可验证口径（自动化测试 / 手工验收 / 埋点）。
- 涉及运行时表现的改动必须确保 5173 端口可启动，无旧端口回退。
- 优先级采用 P0 / P1 / P2（越小优先级越高）。
- 文件和 API 新增尽量沿用现有命名风格与类型系统。

## 全量任务列表（按阶段）

### 阶段 1：程序数据模型与执行引擎（P0）

- [x] 引入 `CommandKind` 与 `Block` 树形结构（支持 `body/branchTrue/branchFalse`）。
- [x] 重构执行器为栈式 generator（`interpret`），支持顺序执行与块级暂停。
- [x] 保留兼容桥接：`ProgrammingCommandId` → `Block` 映射（含 `repeatForward2` 转换）。
- [x] 增加 `ExecutionStep.activeBlockId`，用于行级高亮与回放。
- [x] 为 `forward/turnLeft/turnRight/repeat` 建立基础单测（`interpreter.test.ts`）。
- [ ] 支持 `ifPath`/`whileNotGoal` 的运行时条件逻辑。
- [ ] 支持 `procCall` 的过程体管理与调用栈防护（递归深度上限/循环上限）。
- [ ] 增加 `collect` 与 `jump` 的世界态变更（可选状态改动）。
- [ ] 扩展 `worldOps`：`collect`、`jump`、`canGoForward`、`collectOnTile` 等纯函数并补齐测试。
- [ ] 增加调试错误上下文（超时/最大步数限制防死循环）。

### 阶段 2：执行结果、速度与反馈（P0）

- [x] 在 `ProgrammingIslandPage` 增加速度档位（0.5× / 1× / 2×）并生效于帧延迟。
- [x] 在运行阶段提供 `blocked/wait/run/success` 逐帧状态。
- [x] 运行完成后显示摘要卡（`usedSteps + stars`）。
- [x] 空程序运行提示（防空输入）。
- [ ] 提供 **暂停/继续/单步** 控制。
- [ ] 引入执行进度条（剩余/总步、已高亮步）。
- [ ] 失败回放保留 1 步撤退与红圈提示（语音/动画联动）。

### 阶段 3：关卡奖励闭环（P0）

- [x] 为编程结果定义 `ProgrammingCompletionResult` 回调（`usedSteps/stars/requiredCommandSatisfied`）。
- [x] `App` 侧完成回调接入：
  - [x] `programming.level_complete` 上报；
  - [x] `programming.rank_awarded`（仅新通关触发）；
  - [x] 新通关触发贴纸与花园联动；
  - [x] 新通关触发 `combo.hit()`。
- [x] `useRewardGarden` 新增 `waterByStars` 并接通调用。
- [x] `useStickers` 新增 `grantByTrigger`（`programming_level_complete`）。
- [ ] 7 连 Epic 保底策略落地（当前使用概率降级/补偿逻辑）。
- [ ] 贴纸奖励与段位奖励改为幂等保护（避免重复发放）。
- [ ] 奖励结果写入持久化快照并在结果页展示。

### 阶段 4：三星评价与关卡门槛（P0）

- [x] 接入 `starEvaluator` 及阈值数组。
- [ ] 为每个关卡定义 `optimalSteps` 与 `starThresholds`（现有 4 关补齐）。
- [ ] 显示星级徽章（1~3 星）与最优差距提示。
- [ ] 在结果页/通关弹窗显示挑战目标与星级达成。
- [ ] 通过 `trace` 记录“为何得 1/2/3 星”。

### 阶段 5：指令面板与可视化时间轴（P1）

- [ ] 引入 `dnd-kit` 交互链路（拖拽指令块到时间轴）。
- [ ] 实现时间轴“拖出/重排/删除/重复使用”。
- [ ] 在程序区支持“长按复制/删除/参数”菜单。
- [ ] `repeat` 块可接收嵌套拖入（容器 UI + dropzone）。
- [ ] `Program` 的可视化组件树（`Block.tsx`）与递归渲染。
- [ ] 实现“参数转盘”编辑 `repeat(n)`（2~10，默认 2）。

### 阶段 6：地图与世界系统（P1）

- [ ] 抽离 `BOARD_SIZE` 常量与单一 5×5 限制，改为每关 world 配置。
- [ ] 完成 `world` 模型扩展：地图尺寸、地格类型（草地/石头/水/桥）、道具（宝石/传送门/开关）。
- [ ] 实现可选“黑暗视野”规则（可见范围限制）。
- [ ] 新增世界模板（森林、雪山、齿轮、魔法、深空）并预置至少每世界 5 关。
- [ ] 现有关卡按新世界模型迁移并补齐数据验证。

### 阶段 7：角色与视觉（P2）

- [ ] `LightHeroModel` 替换为 Sprite/Lottie 占位（至少支持 4 状态：idle/walking/thinking/cheer/bump）。
- [ ] 运行中位置移动改为 spring/snap 而非瞬移，避免跳格不适感。
- [ ] 关键动作音效/反馈音统一接入 `onSpeak` 语料。
- [ ] 运行成功/撞墙添加共鸣动效（冲击/闪烁/抖动）。
- [ ] 地图渲染升级（等轴测/层次视觉），至少支持地格高差和宝石旋转。

### 阶段 8：内容体系扩展（P1）

- [ ] 按 5 世界 × 5 关完整扩充到 25 关（首批按 26 关版本扩展也可）。  
- [ ] 每关补齐概念标签（顺序/转向/调试/repeat/条件/过程）。
- [ ] 每世界配置 1 版挑战关与 1 个 Boss 关。
- [ ] 对每关进行难度标注（推荐星级、引导提示、错误常见类型）。

### 阶段 9：质量保障与发布前收口（P0）

- [ ] 完整自动化测试矩阵：
  - [ ] `engine` 单测覆盖嵌套 repeat / 条件分支 / 边界；
  - [ ] 奖励系统单测（`waterByStars`、`grantByTrigger`、`onCompleteLevel`）。
  - [ ] 关键 UI 交互单测（拖拽、速度、暂停、单步、撤销/重做）。
- [ ] 通过 `npm run lint` 和 `npm run build`（当前已知 `ddaEngine.test.ts` 历史 TS 错误需要单独修复）。
- [ ] 新增迁移与回滚文档（如奖励参数、阈值配置）。
- [ ] 本地验收脚本：按 5173 启动并做 3 段式手工复测（初次运行、失败回放、三星回收）。

## 当前进度（截至本次）

- [x] 完成 `interpreter` + `starEvaluator` 基础与测试。
- [x] 完成 `ProgrammingIslandPage` 运行速度、空程序提示、运行摘要、行级 activeBlockId 反馈。
- [x] 完成 App 奖励闭环初版接入（new-completion 幂等处理已加入）。
- [x] 完成花园/贴纸编程触发接口。

## 下一步执行顺序（建议）

1. **P0 完整执行**：交互控制（暂停/单步）→ 步数上限与失败回放 → 条件指令执行稳定化。  
2. **P1 交互升级**：dnd-kit + 递归块编辑器。  
3. **P1~P2 内容扩充**：地图模型与 26 关世界包。  
4. **P2 视觉换代**：Sprite/Lottie + 等轴测地图。  
5. **收官**：完整回归测试 + 发布前验收。

