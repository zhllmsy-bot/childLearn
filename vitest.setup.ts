import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.stubGlobal('matchMedia', vi.fn(() => ({
  addEventListener: vi.fn(),
  addListener: vi.fn(),
  dispatchEvent: vi.fn(),
  matches: false,
  media: '',
  onchange: null,
  removeEventListener: vi.fn(),
  removeListener: vi.fn(),
})));
