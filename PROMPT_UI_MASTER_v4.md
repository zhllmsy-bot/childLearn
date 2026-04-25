# 儿童产品 UI 复刻提示词 v4

> 第 3 版同款总规约：薄荷黄背景 + 顶部三悬浮 + 红苹果方块 + COMBO 巨字斜飞 + 题卡缩飞角落 + 四段烟花。

## 技术与设计语言

- Tailwind CSS 负责布局、颜色、间距、圆角和响应式。
- Lucide 负责通用 UI 图标；练习主体可以保留少量 emoji 作为儿童识别物。
- Framer Motion 负责场景切换、题卡缩飞、按钮反馈、Combo 横幅和钻石飞出。
- 首页、父母报告、统计卡使用类似 Shadcn UI 的极简现代 surface：浅色半透明背景、细 ring、轻 shadow、清晰层级。
- 练习主舞台保留儿童庆典感，不把 Shadcn 的冷静后台风套到题卡和选项上。

## 现代前端 UI Harness

实现顺序固定为：

1. 先定视觉策略：`achievement home = shadcn-like calm surfaces`，`practice stage = 第 3 版儿童庆典`。
2. 再定交互策略：Home 只回成就首页；答错立即清空当前 Combo；答对触发题卡缩飞、钻石飞出、Combo 横幅和烟花。
3. 再实现：优先用 Tailwind 原子类、Lucide 图标和 Framer Motion 动画，不堆解释卡、不堆装饰卡。
4. 最后截图验证：首页、练习页、答对 Combo、答错 Combo 归零都需要过一遍。

主题解锁只展示成就，不自动切换当前背景；没有显式主题选择器时，当前主题固定为果园薄荷黄。

## 默认主题

```ts
export const BG = {
  mint: 'from-emerald-200 via-lime-200 to-yellow-200',
  sky: 'from-sky-200 via-blue-300 to-indigo-400',
  sunset: 'from-orange-200 via-pink-300 to-rose-400',
  candy: 'from-pink-200 via-purple-300 to-indigo-400',
};
```

默认页面必须使用：

```tsx
bg-gradient-to-b from-emerald-200 via-lime-200 to-yellow-200
```

渐变方向固定为 `to-b`，形成草地到阳光的儿童感。

## COMBO 横幅

触发规则：

| 连击 | 文案 | 字号 | 色系 |
|---|---|---|---|
| 3 | `COMBO ×3 不错哟！` | `text-6xl` | 琥珀黄 |
| 5 | `COMBO ×5 太棒了！` | `text-7xl` | 橙色 |
| 10 | `COMBO ×10 超级厉害！` | `text-8xl` | 金色 |
| 15+ | `COMBO ×N 无敌啦！` | `text-9xl` | 紫金 |

硬规则：

- 连击 `>= 3` 必须触发横幅。
- 必须使用 `WebkitTextStroke: '3px white'`。
- 必须从左侧斜向飞入：`x:[-200,0,0,0]`。
- 必须使用四段透明度关键帧：`opacity:[0,1,1,0]`。
- 横幅停留约 800ms 后淡出。

## 题卡缩飞

答对后题卡必须缩小并飞向右上角：

```tsx
animate={answered ? {
  scale: 0.35,
  x: '40vw',
  y: '-35vh',
  rotate: 8,
} : {
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
}}
transition={{ type: 'spring', stiffness: 180, damping: 22 }}
```

答对后约 200ms 开始缩飞，飞行结束后再切下一题。

## 四段式烟花

`celebrate(level)` 必须包含：

1. 中心爆破。
2. 左右角炮。
3. 金粉瀑布。
4. `great` / `amazing` 的星星与派对帽慢飘。

`amazing` 档使用粉彩派对色：

```ts
party: ['#FFB6C1', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA']
```

## 顶栏

顶部只保留三种悬浮元素：

- 左上圆形 Home。
- 右上主题胶囊。
- 右上第二排 Combo 徽章，仅 `combo > 0` 显示。

禁止把状态信息塞成一个大顶栏。

## 选项卡

选项必须是第 3 版红色方块款：

- `rounded-3xl`
- 饱和红色渐变：`from-rose-300 to-rose-400`
- 顶部苹果图标 `🍎`
- 巨大白色数字
- 彩色阴影 + `ring-2 ring-white`

交互：

- idle hover: `{ scale: 1.08, y: -6 }`
- idle tap: `{ scale: 0.92 }`
- correct: `scale:[1,1.2,1]` + `rotate:[0,-5,5,0]`
- wrong: `x:[-12,12,-12,12,0]`

## 钻石飞出

答对时必须有 `💎` 从中央飞向右上 Combo 徽章：

```tsx
initial={{ top: '50%', left: '50%', scale: 1.5, opacity: 1 }}
animate={{ top: '6rem', left: 'calc(100vw - 4rem)', scale: 0.6, opacity: 0 }}
transition={{ duration: 0.8, ease: 'easeIn' }}
```

## 禁止清单

- 默认主题背景不是 `from-emerald-200 via-lime-200 to-yellow-200`。
- 连击 `>= 3` 没有 COMBO 横幅。
- COMBO 字没有白色描边。
- 答对题卡不缩飞。
- 顶栏塞成一大坨卡片。
- 选项颜色太浅。
- `great` / `amazing` 没有星星与派对帽慢飘。
- 练习页出现大块机制解释详情。

## 自查清单

```text
□ 默认背景 emerald-200 → lime-200 → yellow-200，方向 to-b
□ 顶部三悬浮：Home 圆按钮 / 主题胶囊 / Combo 徽章
□ 连击 >=3 触发 ComboBanner
□ ComboBanner 斜飞入 + 白描边 + 停留后淡出
□ ComboBanner 字号分档 6xl/7xl/8xl/9xl
□ 答对后题卡 scale 0.35 + 飞向右上角
□ 答对有 💎 从中央飞到连击徽章
□ 选项是饱和红块 + 白字 + 🍎 顶标
□ 烟花第四段星星/派对帽从天而降 1.5s
□ 首页为成就展示，不是机制说明详情页
□ 练习页首屏直接答题，不放奖励闭环大面板
```
