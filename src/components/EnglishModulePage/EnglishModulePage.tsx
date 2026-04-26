import type { EnglishItem } from '../../english/englishItems';
import { LearningCardModulePage } from '../LearningCardModule/LearningCardModulePage';

interface EnglishModulePageProps {
  items: EnglishItem[];
  selectedItem: EnglishItem;
  onSelectItem: (item: EnglishItem) => void;
  onSpeakItem: (item: EnglishItem) => void;
}

export function EnglishModulePage({
  items,
  selectedItem,
  onSelectItem,
  onSpeakItem,
}: EnglishModulePageProps) {
  return (
    <LearningCardModulePage
      cards={items}
      selectedCard={selectedItem}
      labels={{
        moduleEyebrow: '英语模块',
        moduleTitle: '英语乐园',
        countLabel: '单词',
        primaryLabel: '今天跟读',
        phoneticLabel: '发音',
        graphicLabel: '图形提示',
        wordsLabel: '常用单词',
        gridEyebrow: '字母卡',
        gridTitle: '全部字母',
        speakLabel: '读一读',
      }}
      onSelectCard={onSelectItem}
      onSpeakCard={onSpeakItem}
    />
  );
}
