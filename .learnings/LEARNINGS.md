# Learnings

Use this file for corrections, conventions, and better workflows.

---

## [LRN-YYYYMMDD-001] category

**Logged**: YYYY-MM-DDTHH:MM:SSZ
**Priority**: medium
**Status**: pending
**Area**: general

### Summary
One-line description of the learning.

### Details
What happened, what was wrong, and what is now understood to be correct.

### Suggested Action
Concrete next step or rule to avoid repeating the issue.

### Related Files
- path/to/file

### See Also
- Optional reference to related entries such as `ERR-YYYYMMDD-001`

---

## [LRN-20260424-001] correction

**Logged**: 2026-04-24T13:49:15Z
**Priority**: high
**Status**: active
**Area**: frontend

### Summary
Current Combo must reset to 0 on a wrong answer, even though the original PRD said combo should not clear.

### Details
The user explicitly corrected the behavior after seeing `34 COMBO` remain after failure. The intended behavior is now: wrong answer clears the visible/current combo immediately, while `maxEver` may remain available for parent reports.

### Suggested Action
Do not reintroduce `miss: () => {}` combo behavior. Preserve `missCombo` semantics in tests and UI interactions.

### Related Files
- src/engagement/combo/comboEngine.ts
- src/engagement/combo/useCombo.ts
- src/engagement/combo/comboEngine.test.ts

### See Also
- None

---

## [LRN-20260424-002] correction

**Logged**: 2026-04-24T13:55:24Z
**Priority**: high
**Status**: active
**Area**: frontend

### Summary
The Home button is navigation to an achievement-focused homepage, not a reset control.

### Details
The user clarified that clicking Home should return to a homepage whose main purpose is achievement display. It should preserve earned stars, stickers, rank, and max combo instead of clearing progress.

### Suggested Action
Keep Home mapped to the `home` scene / achievement dashboard. Use explicit restart/reset controls only if the user asks for them.

### Related Files
- src/App.tsx
- src/components/HomeDashboard/HomeDashboard.tsx
- src/components/TopBar/TopBar.tsx

### See Also
- LRN-20260424-001

---

## [LRN-20260424-003] workflow

**Logged**: 2026-04-24T19:42:24Z
**Priority**: medium
**Status**: active
**Area**: frontend

### Summary
CosyVoice2 improves voice control potential but should be treated as cached generation, not live TTS.

### Details
On the local macOS POC, CosyVoice2-0.5B plus venv/model assets used about 7.0GB, and CPU synthesis ran around 3x real-time for short Chinese child-learning prompts. Generated WAV samples were small and usable, but live per-question generation would add noticeable waiting.

### Suggested Action
If CosyVoice is integrated, pre-generate stable stage lines and cache dynamic question audio by normalized text. Keep Edge/browser TTS as fallback while the model service warms or a cache miss is generated.

### Related Files
- output/cosyvoice-poc/generate_childlearn_samples.py
- output/cosyvoice-poc/samples/index.html
- .gitignore

### See Also
- ERR-20260424-004
