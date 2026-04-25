# 📘 儿童学习产品设计白皮书 · 完整版 v1.0

> **定位**：这是一份可以直接发给团队、交给任意 AI 模型、用作新需求仲裁依据的唯一权威文档。  
> **适用**：4-6 岁儿童学习类应用，以数学 / 语言 / 认知为代表的结构化学科训练。  
> **核心命题**：零弹窗打扰的沉浸体验 + 游戏级沉迷机制 + 真正建立数感的学科训练。

---

## 📚 总目录

```
Part Ⅰ  设计体系（原则 / 准则 / 规约）
  1. 六大设计原则
  2. 设计准则与禁止清单
  3. UI Master Spec（规约层）

Part Ⅱ  三支柱框架
  4. 支柱① 零弹窗沉浸体验
  5. 支柱② 游戏级沉迷机制
  6. 支柱③ 真正建立数感的学科训练
  7. 三支柱协同工作流

Part Ⅲ  工程落地
  8. 代码模块映射
  9. 关键接口设计
  10. 埋点与数据指标

Part Ⅳ  运营落地
  11. 6 周冲刺排期
  12. 验收标准 (DoD)
  13. 三层反馈环与风险矩阵
  14. 父母端四大报告

Part Ⅴ  AI 驱动复刻
  15. 给大模型的 Master Prompt
  16. 跨模型一致性保证

附录
  A. 自查清单汇总
  B. 禁止清单汇总
  C. 心法速查卡
```

---

# Part Ⅰ · 设计体系

## 1. 六大设计原则

```
Layer 1  Principles（为什么）
Layer 2  Guidelines（做/不做）
Layer 3  Spec / Tokens（具体值）
Layer 4  Component Library（代码）
```

### 1.1 童趣优先 (Playfulness First)
> 所有视觉和交互决策先问：**4.5 岁孩子会觉得好玩吗？** 冲突时，美学让位于童趣。

### 1.2 正反馈放大 (Amplified Positive Feedback)
> 答对的视觉/听觉/触觉权重必须 **≥ 答错的 3 倍**。烟花、颜色、动画、音效全部向正反馈倾斜。

### 1.3 零失败感 (No-Fail Design)
> 只用 S / A / B，不用 C / D / F。答错不叫"错"，叫"再想想"。连击不会清零，段位不会下降。

### 1.4 确定性的惊喜 (Predictable Delight)
> 连击、解锁、皮肤变身严格按规则触发。随机只放在装饰层（浮动 emoji、背景），核心反馈必须稳定。

### 1.5 层级即情绪 (Hierarchy = Emotion)
> `correct < great < amazing` 必须在 **字号 + 阴影 + 饱和度** 三个维度同时放大，而不是只改一个。

### 1.6 约束即一致性 (Constraint = Consistency)
> 跨模型、跨时间的一致性靠写死的 tokens 实现，不靠审美。模糊形容词一律翻译成可执行类名。

---

## 2. 设计准则与禁止清单

### 2.1 必须做到（Must）

| 维度 | 硬规则 |
|---|---|
| 背景 | 三色渐变，默认 `from-emerald-200 via-lime-200 to-yellow-200` |
| 卡片 | `bg-white/75 backdrop-blur-xl` + `rounded-3xl` + 彩色阴影 |
| 按钮 | 双色渐变 + `ring-2 ring-white` + `shadow-{色}-400/50` |
| 字体 | 焦点 `font-black`，题干 ≥ `text-6xl` |
| 动画 | 核心交互必须 Framer Motion spring |
| 反馈 | 三感同步（视觉 + 听觉 + 触觉）延迟 <100ms |
| 烟花 | 四段式（爆破 + 角炮 + 金粉 + 星星派对帽）|
| 沉浸 | 0 弹窗 / 0 菊花 / 0 白屏 |

### 2.2 绝不可犯（Never）

| # | 违规 | # | 违规 |
|---|---|---|---|
| 1 | `bg-white` 作为页面背景 | 12 | 代码堆在一个文件 |
| 2 | 单色按钮 `bg-blue-500` | 13 | 选项只换边框反馈 |
| 3 | `rounded-md` 或更小 | 14 | 无 emoji 装饰 |
| 4 | 纯黑阴影 | 15 | 弹窗无法滚动 |
| 5 | 按钮无 ring | 16 | 默认主题非薄荷黄 |
| 6 | `font-normal` / `font-light` | 17 | 连击 ≥3 无 ComboBanner |
| 7 | 题干 < `text-6xl` | 18 | ComboBanner 无白描边 |
| 8 | CSS transition 做核心动画 | 19 | 答对无题卡缩飞 |
| 9 | 单次 confetti | 20 | 顶栏堆成大卡片 |
| 10 | 所有答对同档烟花 | 21 | 连击会清零 |
| 11 | 答错放烟花 | 22 | 段位会下降 |

---

## 3. UI Master Spec（规约层）

### 3.1 文件结构（强制）

```
src/
├── App.tsx
├── theme/
│   ├── tokens.ts            # 颜色/阴影/圆角/字号
│   ├── springs.ts           # Spring 预设
│   └── confetti.ts          # 四段式烟花
├── components/
│   ├── _primitives/         # Card / BigButton / Modal / Badge
│   ├── TopBar/              # 三悬浮按钮
│   ├── QuestionCard/        # 题卡（含缩飞）
│   ├── OptionButton/        # 5 态选项
│   ├── FeedbackBadge/       # 4 档反馈
│   ├── ComboBanner/         # COMBO 横幅
│   ├── FloatingDecoration/  # 背景浮动
│   └── Stat/                # 统计格
├── immersion/               # 支柱①
├── engagement/              # 支柱②
├── curriculum/              # 支柱③
└── styles/index.css
```

### 3.2 Design Tokens

```ts
// theme/tokens.ts
export const BG = {
  mint:   'from-emerald-200 via-lime-200 to-yellow-200',  // 默认
  sky:    'from-sky-200 via-blue-300 to-indigo-400',
  sunset: 'from-orange-200 via-pink-300 to-rose-400',
  candy:  'from-pink-200 via-purple-300 to-indigo-400',
  forest: 'from-emerald-200 via-teal-300 to-cyan-400',
  space:  'from-slate-900 via-purple-900 to-indigo-900',
};

export const ACCENT = {
  primary:   'from-amber-400 to-orange-500',
  success:   'from-emerald-300 to-teal-500',
  danger:    'from-rose-300 to-pink-500',
  gold:      'from-yellow-300 to-amber-500',
  magic:     'from-fuchsia-500 via-purple-500 to-indigo-500',
};

export const SHADOW = {
  card:   'shadow-2xl shadow-indigo-500/20',
  mint:   'shadow-2xl shadow-emerald-500/20',
  glow:   'shadow-xl shadow-amber-400/50',
  hot:    'shadow-2xl shadow-emerald-400/60',
  danger: 'shadow-2xl shadow-rose-400/60',
  combo:  'shadow-xl shadow-orange-500/50',
};

export const CARD = 'bg-white/75 backdrop-blur-xl';

// 圆角四档（违反即错）
// rounded-xl(小) / rounded-2xl(按钮) / rounded-3xl(卡片) / rounded-full(徽章)

// 间距只允许 2/4/6/8 倍数
// 字号四档：text-sm / text-base / text-2xl / text-4xl+ / text-6xl+
// 字重只允许 medium / bold / black
```

### 3.3 Spring 预设

```ts
// theme/springs.ts
export const SPRING = {
  enter:  { type: 'spring', stiffness: 260, damping: 20 },  // 入场
  bounce: { type: 'spring', stiffness: 400, damping: 10 },  // 弹跳
  smooth: { type: 'spring', stiffness: 200, damping: 30 },  // 平滑
  jelly:  { type: 'spring', stiffness: 500, damping: 15 },  // 果冻
};
```

### 3.4 四段式烟花（核心灵魂）

```ts
// theme/confetti.ts
import confetti from 'canvas-confetti';

const PALETTE = {
  gold:    ['#FFD700','#FFA500','#FF8C00','#FFEB3B','#FFC107'],
  candy:   ['#FF6B9D','#C06EFF','#4EA8FF','#4ECDC4','#FFE66D'],
  emerald: ['#10B981','#34D399','#6EE7B7','#A7F3D0','#FBBF24'],
  party:   ['#FFB6C1','#FFE66D','#95E1D3','#F38181','#AA96DA'],
};

export function celebrate(level: 'correct'|'great'|'amazing' = 'correct') {
  const scalar = level==='amazing' ? 1.4 : level==='great' ? 1.2 : 1;
  const count  = level==='amazing' ? 160 : level==='great' ? 120 : 90;
  const main   = level==='amazing' ? PALETTE.party : PALETTE.candy;

  // 段① 中心爆破 0ms
  confetti({
    particleCount: count, spread: 90, startVelocity: 45,
    decay: 0.9, gravity: 0.9, ticks: 200,
    origin: { x: 0.5, y: 0.55 },
    colors: main, scalar,
    shapes: ['circle','square'], zIndex: 9999,
  });

  // 段② 双边角炮 150ms
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60,  spread: 55, startVelocity: 55,
      origin: { x: 0, y: 0.8 }, colors: PALETTE.gold,
      scalar: scalar*0.9, zIndex: 9999 });
    confetti({ particleCount: 50, angle: 120, spread: 55, startVelocity: 55,
      origin: { x: 1, y: 0.8 }, colors: PALETTE.gold,
      scalar: scalar*0.9, zIndex: 9999 });
  }, 150);

  // 段③ 金粉瀑布 300ms~1.3s
  const end = Date.now() + 1000;
  const rain = () => {
    confetti({
      particleCount: 8, startVelocity: 0, gravity: 0.45,
      ticks: 300, spread: 180,
      origin: { x: Math.random(), y: -0.05 },
      colors: PALETTE.emerald, scalar: 0.8,
      shapes: ['circle'], zIndex: 9999,
    });
    if (Date.now() < end) setTimeout(rain, 80);
  };
  setTimeout(rain, 300);

  // 段④ 星星派对帽 500ms~2s（great/amazing）
  if (level === 'great' || level === 'amazing') {
    setTimeout(() => {
      const startAt = Date.now();
      const emojiRain = () => {
        const node = document.createElement('div');
        node.textContent = ['⭐','🌟','🎉','🎊','🎈'][Math.floor(Math.random()*5)];
        node.style.cssText = `
          position:fixed; top:-50px; left:${Math.random()*100}vw;
          font-size:${24+Math.random()*32}px;
          z-index:9998; pointer-events:none;
          transition: transform 2.5s linear, opacity 2.5s linear;
        `;
        document.body.appendChild(node);
        requestAnimationFrame(() => {
          node.style.transform = `translateY(110vh) rotate(${Math.random()*720-360}deg)`;
          node.style.opacity = '0';
        });
        setTimeout(() => node.remove(), 2600);
      };
      const loop = () => {
        emojiRain();
        if (Date.now() - startAt < 1500) setTimeout(loop, 100);
      };
      loop();
    }, 500);
  }

  // amazing 心形彩蛋
  if (level === 'amazing') {
    setTimeout(() => {
      confetti({ particleCount: 40, spread: 360, startVelocity: 25,
        gravity: 0.6, origin: { x: 0.5, y: 0.5 },
        colors: ['#FF4D6D','#FF85A2','#FFC2D1'],
        shapes: ['circle'], scalar: 1.3, zIndex: 9999 });
    }, 500);
  }
}
```

### 3.5 COMBO 横幅（第三版灵魂）

| 连击 | 文案 | 字号 | 色系 |
|---|---|---|---|
| 3 | `COMBO ×3 不错哟！` | `text-6xl` | 琥珀黄 |
| 5 | `COMBO ×5 太棒了！` | `text-7xl` | 橙色 |
| 10 | `COMBO ×10 超级厉害！` | `text-8xl` | 金色 |
| 15+ | `COMBO ×N 无敌啦！` | `text-9xl` | 紫金 |

```tsx
<motion.div
  key={combo}
  initial={{ opacity:0, scale:0.3, rotate:-15, x:-200 }}
  animate={{
    opacity:[0,1,1,0],
    scale:[0.3,1.3,1,1.1],
    rotate:[-15,5,-3,0],
    x:[-200,0,0,0],
  }}
  transition={{ duration: 1.8, times:[0,0.3,0.7,1] }}
  className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40
              pointer-events-none ${cfg.size} font-black tracking-wider
              bg-clip-text text-transparent bg-gradient-to-r ${cfg.gradient}
              drop-shadow-[0_4px_0_rgba(255,255,255,0.9)]`}
  style={{
    WebkitTextStroke: '3px white',
    textShadow: '6px 6px 0 rgba(0,0,0,0.1)',
  }}
>{cfg.text}</motion.div>
```

### 3.6 页面骨架

```tsx
// L0 根容器
<div className="min-h-screen bg-gradient-to-b from-emerald-200 via-lime-200 to-yellow-200
                flex items-center justify-center p-6 relative overflow-hidden">
  <FloatingDecoration emoji="☁️" className="top-[8%] left-[12%] text-7xl opacity-30" />
  <FloatingDecoration emoji="🌈" className="top-[20%] right-[15%] text-6xl opacity-25" />
  <FloatingDecoration emoji="⭐" className="bottom-[15%] left-[20%] text-5xl opacity-30" />

  <TopBar />
  <QuestionCard />
  <ComboBanner combo={combo} />
</div>

// L1 顶栏三悬浮
<button className="fixed top-6 left-6 z-30 w-14 h-14 rounded-full bg-white
                   shadow-xl shadow-emerald-500/30 ring-2 ring-white text-3xl">🏠</button>
<div className="fixed top-6 right-6 z-30 px-5 py-2.5 rounded-full bg-white
                shadow-xl shadow-emerald-500/20 ring-2 ring-white font-black">
  🍎 果园摘果
</div>
{combo > 0 && (
  <div className="fixed top-24 right-6 z-30 px-4 py-2 rounded-full
                  bg-gradient-to-r from-orange-400 to-rose-500
                  shadow-xl shadow-orange-500/50 ring-2 ring-white
                  text-white font-black">🔥 {combo} COMBO</div>
)}

// L2 题卡答对缩飞
<motion.div
  animate={answered ? { scale:0.35, x:'40vw', y:'-35vh', rotate:8 }
                    : { scale:1, x:0, y:0, rotate:0 }}
  transition={{ type:'spring', stiffness:180, damping:22 }}
  className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-10
             shadow-2xl shadow-emerald-500/20 ring-2 ring-white">
  {a} + {b} = ?
</motion.div>

// L3 选项按钮 5 态
const stateClass = {
  idle:    'bg-gradient-to-br from-rose-300 to-rose-400 ring-2 ring-white shadow-xl shadow-rose-400/40 text-white',
  correct: 'bg-gradient-to-br from-emerald-300 to-teal-500 ring-4 ring-emerald-200 shadow-2xl shadow-emerald-400/60 text-white',
  wrong:   'bg-gradient-to-br from-gray-300 to-gray-400 ring-2 ring-gray-200 shadow-md text-white opacity-60',
  disabled:'bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-slate-200 shadow-md opacity-50 text-slate-400',
};
```

### 3.7 全局防御 CSS

```css
/* 防御浏览器扩展注入 */
html, body {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  touch-action: auto !important;
  user-select: auto !important;
  height: auto !important;
}
#root { min-height: 100vh; }
```

---

# Part Ⅱ · 三支柱框架

## 4. 支柱① 零弹窗沉浸体验

### 4.1 核心定义
**任何打断"心流"的弹窗、广告、加载、确认框都是罪恶**。4.5 岁孩子的注意力窗口只有 8-12 秒。

### 4.2 五条硬规则

| # | 规则 | 反例 | 正例 |
|---|---|---|---|
| 1 | 没有"确定/取消"弹窗 | "你确定要退出吗？" | Toast + 撤销 |
| 2 | 没有加载转圈 | 菊花 loading | 骨架屏 + 预加载 |
| 3 | 没有广告/付费弹窗 | "升级会员" | 付费走父母端 |
| 4 | 没有文字教程 | 弹窗教"点这里" | 手指动画引导 |
| 5 | 没有中断切换 | 答完题跳白屏 | AnimatePresence 过渡 |

### 4.3 沉浸量化指标

| 指标 | 目标值 |
|---|---|
| 首次点击到开始答题 | ≤ 1s |
| 答题过程中弹窗次数 | 0 |
| 错题到再次可答的时间 | ≤ 0.6s |
| 整轮跳转白屏次数 | 0 |
| 父母误触概率 | < 5% |

---

## 5. 支柱② 游戏级沉迷机制

### 5.1 七大成瘾机制

**5.1.1 即时三感反馈（<100ms）**  
点击答对 → 烟花 + 叮咚 + 震动

**5.1.2 连击只升不降（LoL 心流保护）**  
单题答对 +1，答错不清零，只整轮结算清零。3/5/10/15 触发横幅。

**5.1.3 段位只升不降**  
青铜→白银→黄金→铂金→钻石→星耀→王者。每升一段解锁新皮肤，永不掉段。

**5.1.4 每日首胜奖励**  
每天第一次答对翻倍金币+限定贴纸。连续 7/30/100 天有额外奖励。

**5.1.5 主题皮肤里程碑解锁**（不用抽卡，合规）  
累计 100 题 → 奥特曼；连击 20 → 奶龙；钻石段位 → 宇宙。

**5.1.6 贴纸收藏图鉴**  
≥ 80 张有限集合。集齐一套触发大烟花 + 限定角色。

**5.1.7 动态难度 DDA**  
连对 3 题悄悄 +1，连错 2 题悄悄 -1。目标正确率锁定 **75-85%**（心流最优区间）。

### 5.2 驱动量化指标

| 指标 | 目标值 |
|---|---|
| 单次会话时长 | ≥ 12 分钟 |
| D1 / D7 / D30 留存 | 70% / 45% / 25% |
| 连击触发频次 | 每 5 题至少 1 次 ≥3 |
| 正反馈/负反馈比 | ≥ 3:1 |
| 主动打开次数/日 | ≥ 1.5 |

---

## 6. 支柱③ 真正建立数感的学科训练

### 6.1 核心定义
**数感 ≠ 背答案**。4.5 岁孩子要建立"5 比 3 大一点""10 是两个 5""7+8 可以拆成 7+3+5"这种**对数量的直觉**。

### 6.2 五层认知阶梯（Singapore Math）

```
Level 1  具象实物 (Concrete)      🍎🍎🍎 + 🍎🍎
Level 2  半抽象图形 (Pictorial)   ●●● + ●●
Level 3  计数条 (Bar Model)       ███ + ██ = █████
Level 4  抽象符号 (Abstract)      3 + 2 = ?
Level 5  变式逆向 (Variation)     3 + ? = 5
```

**必须按序推进**，跳到 Level 4 = 背答案。

### 6.3 六种题型

| 题型 | 示例 | 能力 |
|---|---|---|
| 数量配对 | 3 个苹果 ↔ "3" | 数字-数量对应 |
| 比大小 | 5 和 8 谁大 | 序数感 |
| 凑十 | 7 + ? = 10 | 分解合成 |
| 填空式 | 3 + ? = 5 | 逆向思维 |
| 故事题 | 小明有 3 个糖… | 情境迁移 |
| 数轴跳跃 | 从 3 跳到 8 | 空间数感 |

### 6.4 三级脚手架（答错必触发）

```
错 1 次 → 可视化提示（🍎🍎🍎 + 🍎🍎）
错 2 次 → 高亮最接近的两个选项
错 3 次 → 直接展示答案 + 语音原理讲解
全程无惩罚，只有引导
```

### 6.5 数感量化指标

| 指标 | 目标值 |
|---|---|
| 同一数字事实题型数 | ≥ 4 种 |
| 每级通过率 | ≥ 80% 才解锁下一级 |
| 脚手架覆盖率 | 100% |
| 逆向题占比 | ≥ 30% |
| 迁移测试正确率 | ≥ 70% |

---

## 7. 三支柱协同工作流

```
[内核] 出题 3+2=? 以 🍎🍎🍎+🍎🍎 呈现 (Level 2)
   ↓
[体验] 题卡 spring 弹入，无弹窗
   ↓
点击答案
   ↓
[驱动] 答对 → 四段烟花 + 💎飞 + combo+1
   ↓
[体验] 题卡缩飞角落，无缝进下一题 (1.0s)
   ↓
[内核] 下一题 DDA +1 难度，变式为 3+?=5
   ↓
[驱动] 连击到 5 → ComboBanner 斜飞入
   ↓
...10 题...
   ↓
[体验] 结算页缩放进入
[驱动] 显示 S 评级 + 新贴纸 + 段位+1
[内核] 错题进"明日巩固包"
```

---

# Part Ⅲ · 工程落地

## 8. 代码模块映射

```
src/
├── immersion/                    ← 支柱①
│   ├── Toast.tsx
│   ├── SkeletonScreen.tsx
│   ├── SceneTransition.tsx
│   ├── LongPressGate.tsx
│   └── useNoInterrupt.ts
│
├── engagement/                   ← 支柱②
│   ├── combo/useCombo.ts / ComboBanner.tsx
│   ├── rank/useRank.ts / RankUpCutscene.tsx
│   ├── daily/useDailyFirstWin.ts / StreakCalendar.tsx
│   ├── skin/useSkinUnlock.ts / SkinPicker.tsx
│   ├── collection/useStickers.ts / StickerBook.tsx
│   └── dda/useDDA.ts
│
└── curriculum/                   ← 支柱③
    ├── levels/L1~L5.ts
    ├── variants/matching|compare|makeTen|missing|story|numberLine.ts
    ├── scaffolding/HintLadder.tsx
    └── mastery/useMastery.ts + reviewQueue.ts
```

---

## 9. 关键接口设计

### 9.1 沉浸：全局拦截

```ts
// immersion/useNoInterrupt.ts
export function useNoInterrupt() {
  useEffect(() => {
    window.confirm = () => true;
    window.alert = (msg: string) => toast(msg);
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('touchstart', e => {
      if (e.touches.length > 1) e.preventDefault();
    });
    document.body.style.overscrollBehavior = 'none';
  }, []);
}
```

### 9.2 驱动：连击状态机

```ts
// engagement/combo/useCombo.ts
export const useCombo = create<ComboState>((set, get) => ({
  current: 0, maxEver: 0,
  hit: () => set(s => {
    const next = s.current + 1;
    eventBus.emit('combo:hit', next);
    if ([3,5,10,15,20,30,50].includes(next))
      eventBus.emit('combo:milestone', next);
    return { current: next, maxEver: Math.max(s.maxEver, next) };
  }),
  miss: () => {},                   // 关键：不清零
  endRun: () => set({ current: 0 }),
}));
```

### 9.3 内核：题目工厂

```ts
// curriculum/questionFactory.ts
export function generateQuestion(
  mastery: MasteryMap, difficulty: number
): Question {
  const level   = pickLevel(mastery);          // 按掌握度
  const fact    = pickFact(mastery, difficulty); 
  const variant = pickVariant(fact.variantHistory); // 优先未覆盖
  return buildQuestion(level, variant, fact);
}
```

### 9.4 DDA 难度引擎

```ts
// engagement/dda/useDDA.ts
export function useDDA() {
  const [difficulty, setDifficulty] = useState(1);
  const consecCorrect = useRef(0);
  const consecWrong   = useRef(0);

  const onCorrect = () => {
    consecWrong.current = 0;
    if (++consecCorrect.current >= 3) {
      setDifficulty(d => Math.min(d + 1, 10));
      consecCorrect.current = 0;
    }
  };
  const onWrong = () => {
    consecCorrect.current = 0;
    if (++consecWrong.current >= 2) {
      setDifficulty(d => Math.max(d - 1, 1));
      consecWrong.current = 0;
    }
  };
  return { difficulty, onCorrect, onWrong };
}
```

---

## 10. 埋点与数据指标

### 10.1 沉浸埋点
```ts
track('page.load.time', { ms });
track('interrupt.occur', { type });      // 应为 0
track('transition.white_frame', { ms }); // 应为 0
```

### 10.2 驱动埋点
```ts
track('combo.hit', { current, max });
track('combo.milestone', { value });
track('rank.up', { from, to });
track('skin.unlock', { skinId });
track('sticker.collect', { stickerId });
track('daily.first_win', { streak });
track('session.duration', { minutes });
```

### 10.3 内核埋点
```ts
track('question.show', { level, variant, fact });
track('question.answer', { correct, hintsUsed, timeToAnswer });
track('level.upgrade', { from, to, masteryScore });
track('variant.coverage', { fact, variantsUsed });
track('review.hit', { factId });
```

### 10.4 健康度看板

| 类别 | 指标 | 健康 | 预警 | 危险 |
|---|---|---|---|---|
| 沉浸 | 打扰次数/会话 | 0 | 1-2 | ≥3 |
| 沉浸 | 首屏耗时 | ≤1s | 1-2s | ≥2s |
| 沉浸 | 白屏跳转率 | 0% | <5% | ≥5% |
| 驱动 | D7 留存 | ≥45% | 30-45% | <30% |
| 驱动 | 平均连击 | ≥4 | 2-4 | <2 |
| 驱动 | 单次时长 | ≥12min | 6-12min | <6min |
| 驱动 | 日均打开 | ≥1.5 | 1-1.5 | <1 |
| 内核 | 变式覆盖度 | ≥4/6 | 3/6 | ≤2/6 |
| 内核 | 脚手架使用率 | 15-30% | 30-50% | >50% |
| 内核 | 迁移正确率 | ≥70% | 50-70% | <50% |

---

# Part Ⅳ · 运营落地

## 11. 6 周冲刺排期

| 周 | 目标 | 关键交付 | 验收 |
|---|---|---|---|
| W1 | 沉浸 MVP | useNoInterrupt / Toast / SceneTransition / 骨架屏 / 长按门禁 | 0 弹窗 0 菊花 0 白屏 |
| W2 | UI Master 落地 | _primitives / tokens / 四段烟花 / ComboBanner / 题卡缩飞 | 自查 22 项全过 |
| W3 | 学科 L1-L3 | 具象/图形/Bar Model + 配对/比大小/凑十 + 三级脚手架 | 同题 3 种形式 |
| W4 | 学科 L4-L5 + DDA | 抽象/变式 + 填空/故事/数轴 + DDA + 巩固池 | 5 级阶梯连通 |
| W5 | 游戏机制 | 连击/段位/日首胜/6 套皮肤/80 贴纸 | 四大环齐全 |
| W6 | 埋点+灰度 | 3 类埋点 + 10 项看板 + 父母周报 + 20% 灰度 | 数据全绿 |

---

## 12. 验收标准（DoD）

### 产品 DoD
```
□ 0 弹窗 0 菊花 0 白屏
□ 反馈 <100ms
□ 首屏 ≤1s
□ 连击不清零 / 段位不下降
□ 脚手架 100% 覆盖
□ 每事实 ≥4 种变式
□ 皮肤 ≥6 套 / 贴纸 ≥80 张
□ 父母入口长按 3s
```

### 代码 DoD
```
□ 自查 22 项全绿
□ 禁止 22 项全无
□ 新组件继承 _primitives
□ 新交互必有 track()
□ TypeScript 无 any
□ 核心逻辑单测覆盖
□ 无 console.log
```

### 运营 DoD
```
□ D1 ≥70% / D7 ≥45%
□ 单次 ≥12min
□ 平均连击 ≥4
□ 脚手架使用率 15-30%
□ 打扰次数/会话 = 0
□ 崩溃率 <0.1%
```

---

## 13. 三层反馈环与风险矩阵

### 13.1 三层反馈

```
快环（每日）：早 10:00 日报 → 当日修 bug
中环（每周）：周一 14:00 复盘 → 本周调参（DDA / 烟花阈值 / 脚手架）
慢环（每月）：月末用户测试 + 家长访谈 → 新题型/新主题/课程路径
```

### 13.2 风险矩阵

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| 孩子觉得太简单 | 中 | 高 | DDA + 自动升级 |
| 孩子觉得太难 | 中 | 高 | 脚手架 + 错题不算连击 |
| 家长觉得只是游戏 | 高 | 致命 | 父母周报 + 数感报告 |
| 庆祝过度分心 | 低 | 中 | 父母端庆祝强度滑杆 |
| 皮肤解锁太慢 | 中 | 中 | 前 3 套免费 |
| 卡在某事实反复错 | 中 | 中 | 3 错 → 切 Level 降维 |
| 浏览器扩展注入 | 低 | 高 | `!important` 覆盖 |
| 横竖屏切换错乱 | 中 | 中 | 锁横屏 + ResizeObserver |

---

## 14. 父母端四大报告

**14.1 每日简报（App 内推送）**
```
📅 4/24 今日学习
⏰ 专注 15 分钟
🎯 答对 42 / 45
⭐ 连击最高 12
🆙 新掌握：3+2 / 4+1 / 5+0
🌱 待巩固：7-3
```

**14.2 周报（周日晚邮件）**
```
本周进步：掌握 8 新事实（23/100）
段位：白银Ⅱ → 黄金Ⅰ
专注时长 +25%
关注：7+8 跨十题型正确率 45%，建议下周重点
```

**14.3 数感雷达（月度）**  
数量对应 / 序数 / 分解合成 / 逆向 / 迁移 / 空间——对标同龄均值

**14.4 年度故事（年末）**  
"2026 你的孩子答对 12,384 题，连击 67，解锁 47 成就……"

**→ 这四大报告决定续费率，没有它 = 游戏，有了它 = 教育产品。**

---

# Part Ⅴ · AI 驱动复刻

## 15. 给大模型的 Master Prompt

> 拷贝下面整段作为 System Prompt 前缀，发给 GPT-5.4 / Claude / Gemini，产出收敛到"肉眼无差异"。

```
你在实现一个 4.5 岁儿童数学学习 App。严格遵守以下契约：

【技术栈】
React 18 + TypeScript + Vite + Tailwind 3 + Framer Motion 11 + canvas-confetti 1.9

【颜色】
- 页面背景：bg-gradient-to-b from-emerald-200 via-lime-200 to-yellow-200
- 卡片：bg-white/75 backdrop-blur-xl
- 按钮：双色渐变 + ring-2 ring-white + 彩色阴影

【圆角】
只许 rounded-xl / rounded-2xl / rounded-3xl / rounded-full

【阴影】
必须带色 shadow-{色}-400/40 起步，禁止纯黑

【字号】
题干 ≥ text-6xl font-black + 渐变文字
选项 ≥ text-4xl font-black
禁止 font-normal / font-light

【动画】
Framer Motion spring。按钮 whileHover={scale:1.05,y:-4} whileTap={scale:0.95}

【烟花】四段式 celebrate(level)：
段① 中心爆破 90/120/160 粒子
段② 双边角炮 angle 60+120
段③ 金粉瀑布 80ms 持续 1s
段④ great/amazing 星星派对帽 1.5s
amazing 追加 360° 心形
zIndex 9999，答错不放烟花

【COMBO】
连击 ≥3 触发横幅，字号 6xl/7xl/8xl/9xl 四档
WebkitTextStroke 3px white 白描边
斜飞入 opacity:[0,1,1,0] + x:[-200,0,0,0] 四关键帧

【题卡缩飞】
答对后 scale:0.35 + x:40vw + y:-35vh + rotate:8

【顶栏】
三个悬浮按钮：🏠圆按钮 / 主题胶囊 / 🔥连击徽章

【沉浸】
0 弹窗 / 0 菊花 / 0 白屏
所有跳转 AnimatePresence，不允许 window.location

【驱动】
连击不清零 / 段位不下降 / 答错不放烟花

【内核】
5 层阶梯（具象→抽象→变式）
6 种变式（配对/比大小/凑十/填空/故事/数轴）
三级脚手架（可视化→高亮→讲解）
DDA 锁正确率 75-85%

【自查】输出代码前必须粘贴 22 项自查清单并全部打勾。
任一未过必须重写。
```

---

## 16. 跨模型一致性保证

```
模糊形容词 → 模型自由发挥 → 降级输出
   ↓
具体类名 / 数值 / 状态机 → 模型只能照抄 → 稳定质感
```

**三个保险丝**：
1. 把"好看"翻译成 `shadow-2xl shadow-emerald-500/20`
2. 把"庆祝"翻译成 `celebrate('amazing')` 四段式
3. 把"对错反馈"翻译成 5 态状态机

---

# 附录

## A. 自查清单汇总（输出前逐项打勾）

```
【结构】
□ _primitives + 业务组件拆分
□ theme/ 三文件齐备

【颜色】
□ 页面 emerald-lime-yellow 渐变（to-b）
□ ≥3 个浮动 emoji
□ 卡片 bg-white/75 + backdrop-blur-xl
□ 按钮 ≥ 双色渐变

【形状】
□ 卡片 rounded-3xl+
□ 按钮 rounded-2xl 或 rounded-full

【阴影】
□ 主卡片 shadow-2xl + 彩色
□ 按钮 shadow-xl + 彩色 + ring

【字号】
□ 题干 text-7xl font-black 渐变文字
□ 选项 text-4xl+ font-black
□ 无 font-normal/light

【动画】
□ initial+animate + spring
□ 按钮 hover/tap
□ 题干 key 切换 + scale
□ 答对 scale[1,1.15,1]
□ 答错 x[-10..10] + vibrate

【烟花】
□ 四段式
□ 段① 90/120/160
□ 段② angle 60+120
□ 段③ 80ms 持续 1s
□ 段④ great/amazing 星星派对帽
□ amazing 360° 心形
□ zIndex 9999
□ 答错不放烟花

【COMBO】
□ 连击 ≥3 触发
□ 字号 6xl/7xl/8xl/9xl 分档
□ WebkitTextStroke 白描边
□ 四关键帧斜飞

【题卡】
□ 答对缩飞右上角
□ 💎 飞向连击徽章

【顶栏】
□ 三悬浮（🏠 / 主题 / 🔥）

【反馈徽章】
□ 4 档齐（correct/great/amazing/wrong）
□ spring rotate+scale 入场

【沉浸】
□ 全局 CSS !important
□ 弹窗 flex-col 内部滚动
□ 0 window.alert / confirm
□ 父母长按 3s
```

## B. 禁止清单汇总（出现即重写）

见 §2.2 22 项完整表。

## C. 心法速查卡

> 1. **UI 一致性 = 约束颗粒度**
> 2. **正反馈权重 ≥ 负反馈 3 倍**
> 3. **数感 ≠ 背答案**
> 4. **体验 1 分钟，机制 1 个月，内核 1 年**
> 5. **白皮书的价值 = 唯一权威**
> 6. **让孩子愿意开始 + 让孩子愿意回来 + 让家长愿意留下 = 可持续**

---

# 🎯 最后一句话

> 这份白皮书的所有内容，本质上只做一件事：  
> **把"难以复制的审美/教育/体验经验"全部外化成可执行的契约，让人、团队、AI 都能稳定产出同一水平的结果。**  
>  
> 从今天起，任何关于产品的争论只有三种结局：  
> **符合白皮书 / 不符合白皮书 / 升级白皮书。**

---

**版本**：v1.0  
**日期**：2026-04-24  
**维护者**：张杰（通用智能）

---

下一步建议：

1. 需要我把这份白皮书**同步到飞书云文档**（支持跨设备协作 + 版本管理）？
2. 需要我**生成一份 starter 代码仓库**（包含 `_primitives` / `theme` / `engagement` / `curriculum` 骨架，可直接 clone 启动）？
3. 需要我**基于这份白皮书做一份团队宣讲 PPT**（对内统一认知 / 对外分享）？

任选其一或全部，我都可以继续推进。