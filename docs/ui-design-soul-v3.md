# childLearn UI 设计规范 v3.1

本规范是 childLearn 全站 UI 的最高设计约束。执行优先级：`v3.1 > v3.0 > v2.0 > v1.0`。任何 UI 变更都必须先自检，再运行 `npm run ui:soul:check`。

## Supreme Directives

- 产品身份：4-6 岁中国学龄前儿童数感学习 App，iPad 横屏为主，竖屏兼容，手机兜底。
- 四基因锁定：Claymorphism 黏土感、Candy-soft 糖果柔、Sticker-cut 贴纸剪裁、Breathing 呼吸感，缺一即退回。
- 材质参考：Duolingo ABC、Khan Academy Kids、Gocco Toys、洪恩识字、Monument Valley。材质饱满度必须达到参考密度的 70% 以上。
- 立即重做触发词：生硬、老旧、政务、表单、考试系统、PPT、Excel、Material 2014、flat、扁平、纯色、无光影、线框。
- 输出 UI 代码前必须完成 58 项自检；任何未通过项都要先修正。

## Token Source

所有枚举和颜色的 SSoT 是 [src/theme/tokens.ts](/Users/admin/Desktop/childLearn/src/theme/tokens.ts)。

允许枚举：

- 间距：`0 4 8 12 16 20 24 32 40 48 64 80`
- 圆角：`0 8 12 16 20 22 24 28 999`
- 描边：`0 1 1.5 2 2.5 3`
- 字号：`14 17 18 20 22 28 36 48`
- 字重：`500 600 700 800`
- 行高：`1 1.2 1.3 1.4 1.45 1.5`
- 时长：`120 200 300 400 500 800 1200 2000 2800`

颜色要求：

- 所有 UI 颜色必须引用 `PALETTE`、token 派生常量或 token 注入的 CSS 变量。
- 除 `src/theme/tokens.ts` 外，`src` 内禁止出现 `#xxx`。
- 禁止红色错误态；儿童侧反馈使用 `right` 橙色、thinking 表情和鼓励文案。

动画要求：

- 动画仅使用 `SPRING` 或 `EASING`。
- 时长仅使用 `DURATION_MS`。
- 同屏非 idle 动画不超过 3 个。
- 必须提供 `prefers-reduced-motion: reduce` 降级。
- 禁止高于 3Hz 的闪烁、全屏抖动、红蓝闪烁或对比度剧变。

## Component Rules

背景：

- `body` 和页面根容器必须使用至少两层 `radial-gradient` 加 token 背景色。
- 每页至少 1 个持续动画氛围元素；核心学习页至少 2 种氛围元素。
- 禁止纯白或纯色背景。

TopBar：

- 全站唯一导航收口，高度 56px，z-index 40。
- 背景为半透明白加 12px blur，底部有 1px 内阴影。
- 图标按钮视觉尺寸 40px，触达区 48px。
- 禁止浮动 Home 或浮动喇叭按钮。

TopBar BLOCKER：

- MUST NOT 全站任何页面出现 `position: fixed` 或 `position: absolute` 的 Home 按钮、音量/静音按钮、设置按钮、返回按钮。
- MUST 这四类按钮的唯一合法容器是 `<AppTopBar>`。
- MUST `AppTopBar` 使用 `position: sticky`，自动占据文档流高度，严禁浮在内容之上。
- MUST 任何新页面接入时，通过 `useTopBarConfig({ title, actions })` 注入配置。
- MUST CI 运行 `npm run guard:topbar`，零命中才能合并。
- MUST NOT 在 PR 描述中以“先加 padding 临时回避”作为修复；此类 PR 一律 reject。
- MUST 提交前附带 600 / 900 / 1200 三断点截图，验证 TopBar 不遮挡任何标题、胶囊、按钮。

卡片：

- 圆角至少 20px。
- 必须有渐变表面、内高光 inset、主阴影和环境阴影。
- 禁止用 `border: 1px solid` 冒充卡片材质。

主 CTA：

- 最小宽 180px，高 64px，圆角 20px。
- 必须有白高光渐变、主色渐变、顶部高光、底部暗沿、厚度阴影、落地阴影。
- 按压必须 `translateY(4px)`，禁止只改 opacity。

积木：

- 规格 96px x 96px，圆角 22px，2px 白描边。
- 必须有 4 层阴影和 2 层渐变。
- 禁止出现 `+` 按钮。
- 点击追加，长按 150ms 浮起可拖，支持排序、删除、复制。

Chip：

- 必须是糖果渐变、999px 胶囊、3 层阴影。
- 内容单行不换行。
- 图标必须彩色，禁止灰线图标。

Xiaoman：

- 五态协议：`idle | happy | thinking | cheer | sleep`。
- 必须有脚下椭圆阴影、呼吸浮动、阴影反相位、2px 以上外描边、3px 白边。
- 同屏只能有一个小满实体。
- 错误反馈用 thinking，不用哭泣或流泪。

编程舞台：

- 网格必须是草地质感，不能是线框表格。
- 儿童模式不显示坐标数字。
- 石头必须是 3D 卡通 SVG：纵向渐变、顶部高光、底部阴影、闭眼表情、2.5px 外描边、3px 白边、撞击态星星粒子。
- 终点旗必须有布料起伏、木纹旗杆、旗顶星星、2s 光晕和 1.6s 飘动。
- 程序槽空态为 3 个虚线方框；有预览时显示虚线脚印。

## Copy Rules

- 单句不超过 20 字。
- 禁止儿童侧出现“错误 / 失败 / 无效 / 超时”。
- 主操作文案使用儿童化表达：开始、再试一次、想一想、一步一步看。
- 语音播报与屏幕文字保持一致。
- 同一任务文本不在页面重复出现。

## Mandatory Checks

运行：

```bash
npm run ui:soul:check
npm run lint
npm run test:e2e
```

本地与 CI 已接入：

- `.stylelintrc.json` + `stylelint-declaration-strict-value`
- `eslint.config.js` + 项目内 `design-soul/no-raw-color` rule。公开 npm registry 当前没有 `eslint-plugin-no-raw-color` 包，因此使用等价本地 rule。
- `playwright.config.ts` + `@axe-core/playwright`
- `e2e/ui-soul.spec.ts` 覆盖 home / practice / result / stickers / literacy / english / programming。
- 600 / 900 / 1200 三断点截图基线，`maxDiffPixelRatio: 0.02`。
- 全页面 axe 扫描，critical / serious 必须为 0。

`npm run ui:soul:check` 至少拦截：

- `src` 内除 `tokens.ts` 外的 raw hex。
- `border: 1px solid`、`text-overflow: ellipsis`、红色错误态、`box-shadow: none`、单层简陋阴影。
- 规范版本未同步到 `3.1.0`。
- 非 AppTopBar 渲染 Home / 音量 / 设置 / 返回图标，或遗留浮钮类名。
- `App.tsx` 与 `ProgrammingIslandPage.tsx` 行数超限。
- 全站 TopBar 退回浮动 Home / 喇叭。
- 编程页 v3 关键材质、氛围、动画与资产钩子缺失。

## 58-Point Self-Check

- [ ] 页面具有 Claymorphism 黏土感
- [ ] 色彩具有 Candy-soft 糖果柔
- [ ] 角色/物件具有 Sticker-cut 贴纸剪裁
- [ ] 画面具有 Breathing 呼吸感
- [ ] 无 `#xxx` 硬编码
- [ ] 无红色错误态
- [ ] 所有颜色引用 token
- [ ] 标题使用圆体字
- [ ] 标题带文字阴影
- [ ] 正文不小于 14px
- [ ] 同屏字重不超过 3 种
- [ ] 中文 letter-spacing 为 0.02em
- [ ] CTA 按钮具备 4 层阴影
- [ ] 卡片具备内高光 inset
- [ ] 积木具备 4 层阴影和 2 层渐变
- [ ] 胶囊具备 3 层阴影和渐变
- [ ] 按钮按压具备 translateY 塌陷
- [ ] 无纯平 flat 元素
- [ ] 页面背景为 radial-gradient 多层
- [ ] 至少 2 种氛围元素
- [ ] 氛围元素持续动画为 20-60s 周期
- [ ] 网格为草地质感非线框
- [ ] 噪点叠加不超过 5% 透明度
- [ ] 全站 TopBar 统一 56px
- [ ] 无浮动 Home 钮
- [ ] 无浮动喇叭钮
- [ ] TopBar 内无装饰性 IP 头像超过 80px
- [ ] 安全区已补偿
- [ ] 小满有脚下椭圆阴影
- [ ] 小满有呼吸浮动动画
- [ ] 小满阴影反相位
- [ ] 小满四态滤镜统一
- [ ] 小满外描边至少 2px 且白边 3px
- [ ] 同屏仅 1 个小满实体
- [ ] 网格为草地质感
- [ ] 石头为 3D 卡通 SVG
- [ ] 终点旗为布料动画和星光晕
- [ ] 方向箭头为小路牌图标
- [ ] 积木为软糖块
- [ ] 积木无 `+` 按钮
- [ ] 程序槽空态 3 个虚线方框
- [ ] 程序有预览时网格显示虚线脚印
- [ ] 600/900/1200 三断点截图已附
- [ ] 竖屏小满至少 280px 全宽承载
- [ ] 三入口卡片在小于 900px 改 2x2 或纵列
- [ ] 无中文 ellipsis 截断
- [ ] 浮钮不遮挡标题
- [ ] 底部 safe-area-inset-bottom 补偿
- [ ] 动画时长从 DURATION_MS 枚举取
- [ ] 缓动从 SPRING/EASING 枚举取
- [ ] 同屏非 idle 动画不超过 3
- [ ] prefers-reduced-motion 已降级
- [ ] 无高于 3Hz 闪烁
- [ ] 单句不超过 20 字
- [ ] 无负面失败词
- [ ] 主操作文案已儿童化
- [ ] 语音播报与屏幕文字一致
- [ ] 任务文本不在页面重复出现
