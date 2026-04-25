import type { EnglishItem } from '../../english/englishItems';
import { LearningCardModulePage } from '../LearningCardModule/LearningCardModulePage';

interface EnglishModulePageProps {
  items: EnglishItem[];
  selectedItem: EnglishItem;
  onBack: () => void;
  onSelectItem: (item: EnglishItem) => void;
  onSpeakItem: (item: EnglishItem) => void;
}

export function EnglishModulePage({
  items,
  selectedItem,
  onBack,
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
        backLabel: '回首页',
      }}
      onBack={onBack}
      onSelectCard={onSelectItem}
      onSpeakCard={onSpeakItem}
    />
  );
}
