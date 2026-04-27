import { expect, test, type Page } from '@playwright/test';
import { createEmptyLearnerProfile } from '../src/ai/learnerModel';
import type { Question } from '../src/curriculum/types';

const APP_STATE_KEY = 'childlearn.app-state-v1';
const DDA_STATE_KEY = 'childlearn.dda-state';
const LEARNER_MODEL_KEY = 'childlearn.learner-model-v1';

function buildMultiStepCrossTenQuestion(): Question {
  return {
    id: 'cross-ten-multistep-6-plus-7',
    level: 3,
    variant: 'makeTen',
    source: 'llm',
    factId: 'cross-ten-6-plus-7',
    prompt: '把 7 拆一拆，先把 6 凑到 10。',
    expression: '6 + 7 = ?',
    answer: 13,
    options: [
      { id: 'final-12', label: '12', value: 12 },
      { id: 'final-13', label: '13', value: 13 },
      { id: 'final-14', label: '14', value: 14 },
      { id: 'final-11', label: '11', value: 11 },
    ],
    objects: Array.from({ length: 13 }, () => 'apple'),
    barModel: [6, 7],
    scaffoldText: '先想一想，6 离 10 还差几个。',
    principleText: '遇到跨 10 的加法，可以先拆一拆，再凑到 10。',
    reasoning: {
      kind: 'multiStep',
      strategy: 'makeTen',
      narrative: '把 7 拆成 4 和 3，6+4=10，10+3=13。',
      steps: [
        {
          stepId: 'split',
          stem: '7 可以拆成几和几，让 6 凑到 10？',
          choices: [
            { id: 'split-34', label: '3 和 4', value: 34 },
            { id: 'split-43', label: '4 和 3', value: 43 },
            { id: 'split-52', label: '5 和 2', value: 52 },
            { id: 'split-25', label: '2 和 5', value: 25 },
          ],
          correctIndex: 1,
          stepSkillKey: 'decomposition',
          hintOnWrong: '6 差 4 才到 10 哦，所以要先拆出一个 4。',
        },
        {
          stepId: 'make-ten',
          stem: '6 + 4 = __',
          choices: [
            { id: 'step2-9', label: '9', value: 9 },
            { id: 'step2-10', label: '10', value: 10 },
            { id: 'step2-11', label: '11', value: 11 },
            { id: 'step2-8', label: '8', value: 8 },
          ],
          correctIndex: 1,
          stepSkillKey: 'makeTenBasic',
          hintOnWrong: '先把 6 凑到 10，这一步要算 6 + 4。',
        },
        {
          stepId: 'finish',
          stem: '10 + 3 = __',
          choices: [
            { id: 'step3-12', label: '12', value: 12 },
            { id: 'step3-13', label: '13', value: 13 },
            { id: 'step3-14', label: '14', value: 14 },
            { id: 'step3-11', label: '11', value: 11 },
          ],
          correctIndex: 1,
          stepSkillKey: 'addWithin20',
          hintOnWrong: '还剩 3 个，再接到 10 后面。',
        },
      ],
    },
  };
}

function buildNarrationCrossTenQuestion(): Question {
  return {
    id: 'cross-ten-narration-8-plus-5',
    level: 3,
    variant: 'makeTen',
    source: 'llm',
    factId: 'cross-ten-narration-8-plus-5',
    prompt: '8 + 5 = 13，你是怎么算的？选出也能说通的步骤。',
    expression: '8 + 5 = ?',
    answer: 13,
    options: [
      {
        id: 'narration-a',
        label: '把 5 拆成 2 和 3 → 8+2=10 → 10+3=13',
        value: 13,
      },
      {
        id: 'narration-b',
        label: '从 1 开始一个一个数到 13',
        value: 1,
      },
      {
        id: 'narration-c',
        label: '把 8 拆成 5 和 3 → 5+5=10 → 10+3=13',
        value: 13,
      },
      {
        id: 'narration-d',
        label: '不知道，先随便猜一个',
        value: 0,
      },
    ],
    objects: Array.from({ length: 13 }, () => 'apple'),
    barModel: [8, 5],
    scaffoldText: '想想哪一步是先把一个数凑到 10。',
    principleText: '会说出步骤，说明这条路已经记在脑子里了。',
    reasoning: {
      kind: 'narration',
      strategy: 'makeTen',
      narrative: '把 5 拆成 2 和 3，8+2=10，10+3=13。',
      acceptedOptionValues: [13],
    },
  };
}

function buildSeedLearnerProfile() {
  const profile = createEmptyLearnerProfile('playwright-child');
  const now = 1_777_777_777_000;

  profile.recommendedSkill = 'crossTenBridge';
  profile.updatedAt = now;
  profile.skills.makeTen = {
    ...profile.skills.makeTen,
    theta: 0.7,
    confidence: 0.72,
    attempts: 8,
    lastSeen: now,
  };
  profile.skills.crossTenBridge = {
    ...profile.skills.crossTenBridge,
    theta: 0.25,
    confidence: 0.42,
    attempts: 4,
    lastSeen: now,
  };

  return profile;
}

function buildSeedDdaState() {
  return {
    difficulty: 4,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    recentWindow: [1, 1, 1, 0, 1],
    skillWindows: {},
    focusSkillKey: null,
  };
}

async function waitForStoredSnapshot(page: Page) {
  await page.waitForFunction((key) => Boolean(window.localStorage.getItem(key)), APP_STATE_KEY);
}

async function readStoredAppState(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, APP_STATE_KEY);
}

async function seedPracticeSnapshot(page: Page, question: Question) {
  const emptyProfile = createEmptyLearnerProfile('playwright-child');
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload();
  await waitForStoredSnapshot(page);
  await page.evaluate(
    ({ appStateKey, ddaStateKey, learnerModelKey, question: nextQuestion, learnerProfile }) => {
      const snapshot = JSON.parse(window.localStorage.getItem(appStateKey) ?? 'null');
      if (!snapshot) {
        throw new Error('Missing app snapshot');
      }

      snapshot.scene = 'practice';
      snapshot.questionIndex = 0;
      snapshot.question = nextQuestion;
      snapshot.selectedOptionId = null;
      snapshot.feedback = null;
      snapshot.answered = false;
      snapshot.hintStage = 0;
      snapshot.reasoningStepIndex = 0;
      snapshot.reasoningStepAttempts = [];
      snapshot.reasoningVisibleHint = null;
      snapshot.levelQuestionGoal = 1;
      snapshot.levelProgress = 0;
      snapshot.levelMistakes = 0;
      snapshot.levelBestCombo = 0;
      snapshot.levelStarsEarned = 0;
      snapshot.levelLatestStickerId = null;
      snapshot.levelNewSpirits = [];
      snapshot.lastResult = null;
      snapshot.reviewQueue = [];
      snapshot.practiceRunId = 'playwright-seeded-run';
      snapshot.levelAttemptRecords = [];
      snapshot.recentFlowStates = [];
      snapshot.currentRunPolicy = null;
      snapshot.currentRunPolicyBatchId = null;
      snapshot.currentRunMode = 'level';
      snapshot.diagnosticRunSeed = null;
      snapshot.updatedAt = 1_777_888_888_000;

      window.localStorage.setItem(appStateKey, JSON.stringify(snapshot));
      window.localStorage.setItem(learnerModelKey, JSON.stringify(learnerProfile));
      window.localStorage.setItem(
        ddaStateKey,
        JSON.stringify({
          difficulty: 4,
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
          recentWindow: [],
          skillWindows: {},
          focusSkillKey: null,
        }),
      );
    },
    {
      appStateKey: APP_STATE_KEY,
      ddaStateKey: DDA_STATE_KEY,
      learnerModelKey: LEARNER_MODEL_KEY,
      question,
      learnerProfile: emptyProfile,
    },
  );
  await page.reload();
}

async function moveTokenIntoBridge(page: Page) {
  await page.getByTestId('make-ten-leftover-token').first().click();
}

test.describe('cross-ten reasoning flow', () => {
  test.use({ viewport: { width: 1180, height: 820 } });

  test('starts from home and completes the multi-step make-ten bridge with AI hint support', async ({
    page,
  }) => {
    let crossTenQuestionRequests = 0;
    let crossTenHintRequests = 0;

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/ai?action=cross-ten-question', async (route) => {
      crossTenQuestionRequests += 1;
      const payload = route.request().postDataJSON() as {
        target?: { targetTheta?: number };
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          confidence: 0.94,
          estimatedTheta: payload?.target?.targetTheta ?? 0.75,
          question: buildMultiStepCrossTenQuestion(),
        }),
      });
    });
    await page.route('**/api/ai?action=cross-ten-hint', async (route) => {
      crossTenHintRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hint: '6 差 4 才到 10 哦，所以要先拆出一个 4。',
        }),
      });
    });
    await page.addInitScript(
      ({ ddaState, learnerProfile, learnerStateKey, ddaStateKey }) => {
        window.localStorage.clear();
        window.localStorage.setItem(learnerStateKey, JSON.stringify(learnerProfile));
        window.localStorage.setItem(ddaStateKey, JSON.stringify(ddaState));
      },
      {
        learnerProfile: buildSeedLearnerProfile(),
        ddaState: buildSeedDdaState(),
        learnerStateKey: LEARNER_MODEL_KEY,
        ddaStateKey: DDA_STATE_KEY,
      },
    );

    await page.goto('/');
    await expect(page.getByRole('heading', { name: '今天练 5 道？' })).toBeVisible();
    await page.getByRole('button', { name: '继续闯关' }).click();

    await expect(page.getByTestId('reasoning-panel')).toContainText('凑十小步骤');
    await expect(page.getByTestId('reasoning-panel')).toContainText(
      '7 可以拆成几和几，让 6 凑到 10？',
    );
    await expect.poll(() => crossTenQuestionRequests).toBe(1);

    await expect(page.getByTestId('make-ten-leftover-token')).toHaveCount(7);
    for (let index = 0; index < 4; index += 1) {
      await moveTokenIntoBridge(page);
    }
    await expect(page.getByTestId('make-ten-bridge-status')).toContainText(
      '刚好凑到 10 啦，还剩 3 个。',
    );

    await page.getByRole('button', { name: '选择答案 5 和 2' }).click();
    await expect(page.getByTestId('reasoning-panel')).toContainText(
      '6 差 4 才到 10 哦，所以要先拆出一个 4。',
    );
    await expect.poll(() => crossTenHintRequests).toBe(1);

    await page.waitForTimeout(4200);
    await page.getByRole('button', { name: '选择答案 4 和 3' }).click();
    await expect(page.getByTestId('reasoning-panel')).toContainText('6 + 4 = __');

    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '选择答案 10' }).click();
    await expect(page.getByTestId('reasoning-panel')).toContainText('10 + 3 = __');

    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '选择答案 13' }).click();
    await page.waitForFunction((key) => {
      const snapshot = JSON.parse(window.localStorage.getItem(key) ?? 'null');
      return Array.isArray(snapshot?.levelAttemptRecords) && snapshot.levelAttemptRecords.length === 1;
    }, APP_STATE_KEY);

    const snapshot = await readStoredAppState(page);
    expect(snapshot?.levelAttemptRecords).toHaveLength(1);
    expect(snapshot?.levelAttemptRecords[0]?.finalCorrect).toBe(true);
    expect(snapshot?.levelAttemptRecords[0]?.strategyUse).toEqual({
      attemptedStrategy: 'makeTen',
      stepsCorrect: [false, true, true],
      totalSteps: 3,
    });
  });

  test('accepts multiple narration answers that truly explain the make-ten path', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedPracticeSnapshot(page, buildNarrationCrossTenQuestion());

    await expect(page.getByTestId('reasoning-panel')).toContainText('说说你是怎么想的');
    await expect(page.getByTestId('reasoning-panel')).toContainText(
      '8 + 5 = 13，你是怎么算的？选出也能说通的步骤。',
    );
    await expect(page.getByRole('button', { name: '选择答案 把 8 拆成 5 和 3 → 5+5=10 → 10+3=13' })).toBeVisible();
    await expect(page.getByRole('button', { name: '选择答案 把 5 拆成 2 和 3 → 8+2=10 → 10+3=13' })).toBeVisible();

    await page
      .getByRole('button', {
        name: '选择答案 把 8 拆成 5 和 3 → 5+5=10 → 10+3=13',
      })
      .click();

    await page.waitForFunction((key) => {
      const snapshot = JSON.parse(window.localStorage.getItem(key) ?? 'null');
      return Array.isArray(snapshot?.levelAttemptRecords) && snapshot.levelAttemptRecords.length === 1;
    }, APP_STATE_KEY);

    const snapshot = await readStoredAppState(page);
    expect(snapshot?.levelAttemptRecords[0]?.finalCorrect).toBe(true);
    expect(snapshot?.levelAttemptRecords[0]?.strategyUse).toEqual({
      attemptedStrategy: 'makeTen',
      stepsCorrect: [],
      totalSteps: 0,
      narrationChoice: '把 8 拆成 5 和 3 → 5+5=10 → 10+3=13',
    });
  });
});
