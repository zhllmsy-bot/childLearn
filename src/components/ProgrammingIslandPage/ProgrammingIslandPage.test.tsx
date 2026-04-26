// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ProgrammingIslandPage } from './ProgrammingIslandPage';

function renderPage() {
  return render(
    <ProgrammingIslandPage
      completedLevelIds={[]}
      initialLevelId="sequence-apple"
      onBack={vi.fn()}
      onCompleteLevel={vi.fn()}
      onSpeak={vi.fn()}
      unlockedLevelCount={1}
    />,
  );
}

describe('ProgrammingIslandPage', () => {
  it('renders the strict top bar and a single task bubble', () => {
    renderPage();

    expect(screen.getByRole('button', { name: '返回首页' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '打开设置' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '关闭声音' })).not.toBeNull();
    expect(screen.getAllByText('让小满一步一步走到能量果。')).toHaveLength(1);
    expect(screen.queryByText('单步')).toBeNull();
    expect(screen.queryByText('0.5x')).toBeNull();
    expect(screen.queryByText('提示')).toBeNull();
  });

  it('appends a drawer block on click and keeps the program slot accessible', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '前进积木' }));

    expect(screen.getByRole('list')).not.toBeNull();
    expect(screen.getByRole('listitem')).not.toBeNull();
    expect(screen.getByRole('button', { name: /第 1 块，前进/ })).not.toBeNull();
  });

  it('passes an axe audit for the default state', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
