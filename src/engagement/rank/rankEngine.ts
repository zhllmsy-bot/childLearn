import type { FlowState } from '../flow';

export const RANK_TIERS = [
  { name: '青铜', skin: '果园' },
  { name: '白银', skin: '彩虹' },
  { name: '黄金', skin: '糖果' },
  { name: '铂金', skin: '森林' },
  { name: '钻石', skin: '宇宙' },
  { name: '星耀', skin: '星河' },
  { name: '王者', skin: '皇冠' },
] as const;

export const DIVISIONS_PER_TIER = 5;
export const STARS_PER_DIVISION = 5;
export const STARS_PER_TIER = DIVISIONS_PER_TIER * STARS_PER_DIVISION;
export const RANK_LADDER_STAR_CAP = RANK_TIERS.length * STARS_PER_TIER;

export interface RankSnapshot {
  totalStars: number;
  tierIndex: number;
  tierName: string;
  division: number;
  starsInDivision: number;
  starsPerDivision: number;
  prestigeStars: number;
  name: string;
  displayName: string;
  starLabel: string;
  nextName: string;
  progress: number;
  skin: string;
  isApex: boolean;
}

export interface RankStarsAwardInput {
  correct: number;
  total: number;
  mistakes: number;
  maxCombo: number;
  flowState: FlowState;
}

function clampStars(stars: number) {
  return Number.isFinite(stars) ? Math.max(0, Math.round(stars)) : 0;
}

function divisionName(tierName: string, division: number) {
  return `${tierName} ${division}`;
}

function nextDivisionName(totalStars: number) {
  const nextStars = totalStars + 1;

  if (nextStars >= RANK_LADDER_STAR_CAP) {
    return '王者星图';
  }

  const tierIndex = Math.floor(nextStars / STARS_PER_TIER);
  const starsInsideTier = nextStars % STARS_PER_TIER;
  const division = DIVISIONS_PER_TIER - Math.floor(starsInsideTier / STARS_PER_DIVISION);

  return divisionName(RANK_TIERS[tierIndex].name, division);
}

export function getRankSnapshot(stars: number): RankSnapshot {
  const totalStars = clampStars(stars);

  if (totalStars >= RANK_LADDER_STAR_CAP) {
    const tier = RANK_TIERS[RANK_TIERS.length - 1];
    const prestigeStars = totalStars - RANK_LADDER_STAR_CAP;
    const displayName =
      prestigeStars > 0 ? `王者星图 ${prestigeStars}` : divisionName(tier.name, 1);

    return {
      totalStars,
      tierIndex: RANK_TIERS.length - 1,
      tierName: tier.name,
      division: 1,
      starsInDivision: STARS_PER_DIVISION,
      starsPerDivision: STARS_PER_DIVISION,
      prestigeStars,
      name: displayName,
      displayName,
      starLabel:
        prestigeStars > 0 ? `星图 +${prestigeStars}` : `${STARS_PER_DIVISION}/${STARS_PER_DIVISION}`,
      nextName: `王者星图 ${prestigeStars + 1}`,
      progress: 1,
      skin: tier.skin,
      isApex: true,
    };
  }

  const tierIndex = Math.floor(totalStars / STARS_PER_TIER);
  const tier = RANK_TIERS[tierIndex];
  const starsInsideTier = totalStars % STARS_PER_TIER;
  const division = DIVISIONS_PER_TIER - Math.floor(starsInsideTier / STARS_PER_DIVISION);
  const starsInDivision = starsInsideTier % STARS_PER_DIVISION;
  const displayName = divisionName(tier.name, division);

  return {
    totalStars,
    tierIndex,
    tierName: tier.name,
    division,
    starsInDivision,
    starsPerDivision: STARS_PER_DIVISION,
    prestigeStars: 0,
    name: displayName,
    displayName,
    starLabel: `${starsInDivision}/${STARS_PER_DIVISION}`,
    nextName: nextDivisionName(totalStars),
    progress: starsInDivision / STARS_PER_DIVISION,
    skin: tier.skin,
    isApex: false,
  };
}

export function addRankStars(currentStars: number, amount: number) {
  return clampStars(currentStars + Math.max(0, Math.round(amount)));
}

export function calculateBatchRankStars({
  correct,
  total,
  mistakes,
  maxCombo,
  flowState,
}: RankStarsAwardInput) {
  if (total <= 0 || correct < Math.ceil(total * 0.8)) {
    return 0;
  }

  const stableLearningState =
    flowState === 'easy' || flowState === 'flow' || flowState === 'stretch';
  const cleanBatch = mistakes <= 2;
  const sustainedCombo = maxCombo >= Math.min(5, total);
  const perfectBatch = correct === total && mistakes === 0 && maxCombo >= total;

  return (
    1 +
    (stableLearningState && (cleanBatch || sustainedCombo) ? 1 : 0) +
    (stableLearningState && perfectBatch ? 1 : 0)
  );
}
