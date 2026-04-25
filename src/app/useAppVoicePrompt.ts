import { useCallback, type RefObject } from 'react';
import type { EnglishItem } from '../english/englishItems';
import type { LiteracyItem } from '../literacy/literacyItems';
import type { Question } from '../curriculum/types';
import type {
  ActiveQuestionTelemetry,
  AppScene,
  LevelResultSnapshot,
  SessionStats,
} from './appState';
import {
  buildEnglishVoiceLine,
  buildHintVoiceLine,
  buildHomeVoiceLine,
  buildLiteracyVoiceLine,
  buildProgrammingVoiceLine,
  buildQuestionVoiceLine,
  type VoiceLine,
} from '../voice/voiceLines';
import { track } from '../telemetry/track';

interface UseAppVoicePromptParams {
  activeQuestionTelemetryRef: RefObject<ActiveQuestionTelemetry | null>;
  difficulty: number;
  hintStage: number;
  lastResult: LevelResultSnapshot | null;
  question: Question;
  questionEventPayload: (
    targetQuestion: Question,
    targetQuestionIndex: number,
    extra?: Record<string, string | number | boolean | null | undefined>,
  ) => Record<string, string | number | boolean | null | undefined>;
  questionIndex: number;
  rankName: string;
  rankStars: number;
  scene: AppScene;
  selectedEnglishItem: EnglishItem;
  selectedLiteracyItem: LiteracyItem;
  speak: (line: VoiceLine, options?: { notifyOnUnsupported?: boolean }) => unknown;
  stats: SessionStats;
}

export function useAppVoicePrompt({
  activeQuestionTelemetryRef,
  difficulty,
  hintStage,
  lastResult,
  question,
  questionEventPayload,
  questionIndex,
  rankName,
  rankStars,
  scene,
  selectedEnglishItem,
  selectedLiteracyItem,
  speak,
  stats,
}: UseAppVoicePromptParams) {
  return useCallback(() => {
    const line =
      scene === 'practice'
        ? hintStage > 0
          ? buildHintVoiceLine(question, hintStage)
          : buildQuestionVoiceLine(question)
        : scene === 'result' && lastResult
          ? {
              moment: 'reward' as const,
              rate: '-8%',
              text: `本关完成。答对 ${lastResult.correct} 题，失误 ${lastResult.mistakes} 次，最高连击 ${lastResult.maxCombo}。`,
            }
        : scene === 'literacy'
          ? buildLiteracyVoiceLine(selectedLiteracyItem)
        : scene === 'english'
          ? buildEnglishVoiceLine(selectedEnglishItem)
        : scene === 'programming'
          ? buildProgrammingVoiceLine(
              '这里是编程岛。先放指令，再点运行，看看小满会怎么走。',
            )
        : buildHomeVoiceLine({
            rankName,
            stars: rankStars,
            correct: stats.correct,
            difficulty,
          });

    void speak(line, { notifyOnUnsupported: true });
    if (scene === 'practice') {
      const telemetry = activeQuestionTelemetryRef.current;
      if (telemetry?.questionId === question.id) {
        telemetry.audioReplayCount += 1;
        telemetry.lastInteractionAtMs = Date.now();
      }
      track(
        'question.audio_replay',
        questionEventPayload(question, questionIndex, {
          audioReplayCount: telemetry?.audioReplayCount ?? null,
        }),
      );
    }
    track('voice.prompt', {
      scene,
      fact:
        scene === 'practice'
          ? question.factId
          : scene === 'literacy'
            ? selectedLiteracyItem.id
            : scene === 'english'
              ? selectedEnglishItem.id
              : scene === 'programming'
                ? 'programming'
                : 'home',
    });
  }, [
    activeQuestionTelemetryRef,
    difficulty,
    hintStage,
    lastResult,
    question,
    questionEventPayload,
    questionIndex,
    rankName,
    rankStars,
    scene,
    selectedEnglishItem,
    selectedLiteracyItem,
    speak,
    stats.correct,
  ]);
}
