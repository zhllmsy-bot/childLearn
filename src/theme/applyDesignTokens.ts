import { DESIGN_SOUL_CSS_VARS } from './tokens';

export function applyDesignTokens(root: HTMLElement = document.documentElement) {
  Object.entries(DESIGN_SOUL_CSS_VARS).forEach(([name, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      root.style.setProperty(name, String(value));
    }
  });
}
