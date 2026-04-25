import type { LiteracyItem } from '../../literacy/literacyItems';
import { LearningCardModulePage } from '../LearningCardModule/LearningCardModulePage';

interface LiteracyModulePageProps {
  items: LiteracyItem[];
  selectedItem: LiteracyItem;
  onBack: () => void;
  onSelectItem: (item: LiteracyItem) => void;
  onSpeakItem: (item: LiteracyItem) => void;
}

export function LiteracyModulePage({
  items,
  selectedItem,
  onBack,
  onSelectItem,
  onSpeakItem,
}: LiteracyModulePageProps) {
  return (
    <LearningCardModulePage
      cards={items}
      selectedCard={selectedItem}
      labels={{
        moduleEyebrow: '识字模块',
        moduleTitle: '识字乐园',
        countLabel: '汉字',
        primaryLabel: '今天认读',
        phoneticLabel: '拼音',
        graphicLabel: '图形提示',
        wordsLabel: '常用词组',
        gridEyebrow: '字卡',
        gridTitle: '全部汉字',
        speakLabel: '读一读',
        backLabel: '回首页',
      }}
      onBack={onBack}
      onSelectCard={onSelectItem}
      onSpeakCard={onSpeakItem}
    />
  );
}
