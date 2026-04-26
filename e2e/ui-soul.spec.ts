import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const APP_STATE_KEY = 'childlearn.app-state-v1';

const pages = [
  { scene: 'home', title: '今天练' },
  { scene: 'practice', title: '本关' },
  { scene: 'result', title: '本关完成' },
  { scene: 'stickers', title: '贴纸' },
  { scene: 'literacy', title: '识字乐园' },
  { scene: 'english', title: '英语乐园' },
  { scene: 'programming', title: '小满出发啦' },
] as const;

const viewports = [
  { name: 'w600', width: 600, height: 900 },
  { name: 'w900', width: 900, height: 700 },
  { name: 'w1200', width: 1200, height: 800 },
] as const;

async function waitForStoredSnapshot(page: Page) {
  await page.waitForFunction((key) => Boolean(window.localStorage.getItem(key)), APP_STATE_KEY);
}

async function setScene(page: Page, scene: (typeof pages)[number]['scene']) {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload();
  await waitForStoredSnapshot(page);

  if (scene === 'home') {
    return;
  }

  await page.evaluate(
    ({ key, nextScene }) => {
      const snapshot = JSON.parse(window.localStorage.getItem(key) ?? 'null');
      if (!snapshot) {
        throw new Error('Missing app snapshot');
      }

      snapshot.scene = nextScene;
      snapshot.updatedAt = 1_778_000_000_000;
      snapshot.answered = false;
      snapshot.feedback = null;
      snapshot.selectedOptionId = null;

      if (nextScene === 'result') {
        snapshot.lastResult = {
          correct: 8,
          total: 10,
          mistakes: 1,
          maxCombo: 5,
          starsEarned: 2,
          rankName: '小芽',
          difficulty: 2,
          sticker: null,
          gardenReward: {
            didWaterToday: true,
            streak: 3,
            totalWaterings: 5,
            fruitCoins: 12,
            chestTier: 'rainbow',
            chestLabel: '彩虹宝箱',
            treeStage: {
              emoji: '🌸',
              name: '开花树',
              progress: 2,
              goal: 4,
              nextLabel: '结果树',
            },
            badges: [{ id: 'daily-water', emoji: '💧', label: '今日浇水' }],
          },
          newSpirits: [],
        };
      }

      window.localStorage.setItem(key, JSON.stringify(snapshot));
    },
    { key: APP_STATE_KEY, nextScene: scene },
  );

  await page.reload();
}

async function openScene(page: Page, scene: (typeof pages)[number]['scene'], title: string) {
  await setScene(page, scene);
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
  await page.waitForTimeout(1_200);
}

for (const viewport of viewports) {
  test.describe(`UI soul ${viewport.name}`, () => {
    test.use({ viewport });

    for (const appPage of pages) {
      test(`${appPage.scene} matches visual soul and has no serious a11y issues`, async ({
        page,
      }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openScene(page, appPage.scene, appPage.title);

        const a11y = await new AxeBuilder({ page }).analyze();
        const seriousViolations = a11y.violations.filter(
          (violation) => violation.impact === 'critical' || violation.impact === 'serious',
        );
        expect(seriousViolations).toEqual([]);

        await expect(page).toHaveScreenshot(`${appPage.scene}-${viewport.name}.png`, {
          animations: 'disabled',
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}
