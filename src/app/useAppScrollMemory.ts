import { useEffect, useRef, type RefObject } from 'react';
import {
  readStoredScrollSnapshot,
  writeStoredScrollSnapshot,
  type AppScene,
} from './appState';

export function useAppScrollMemory(
  scene: AppScene,
  mainRef: RefObject<HTMLElement | null>,
) {
  const scrollPositionsRef = useRef<Partial<Record<AppScene, number>>>(
    readStoredScrollSnapshot(),
  );
  const currentScrollSceneRef = useRef<AppScene>(scene);
  const hasRestoredInitialScrollRef = useRef(false);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) {
      return undefined;
    }

    let persistTimeoutId: number | null = null;
    const rememberCurrentScroll = ({
      preserveNonZero = false,
    }: { preserveNonZero?: boolean } = {}) => {
      const sceneKey = currentScrollSceneRef.current;
      const scrollTop = Math.max(0, Math.round(node.scrollTop));
      const previousScrollTop = scrollPositionsRef.current[sceneKey] ?? 0;

      if (preserveNonZero && scrollTop === 0 && previousScrollTop > 0) {
        return;
      }

      scrollPositionsRef.current[sceneKey] = scrollTop;
    };
    const persistScrollSoon = () => {
      if (persistTimeoutId !== null) {
        return;
      }

      persistTimeoutId = window.setTimeout(() => {
        persistTimeoutId = null;
        writeStoredScrollSnapshot(scrollPositionsRef.current);
      }, 300);
    };
    const handleScroll = () => {
      rememberCurrentScroll();
      persistScrollSoon();
    };
    const flushScroll = () => {
      rememberCurrentScroll({ preserveNonZero: true });
      if (persistTimeoutId !== null) {
        window.clearTimeout(persistTimeoutId);
        persistTimeoutId = null;
      }
      writeStoredScrollSnapshot(scrollPositionsRef.current);
    };

    node.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', flushScroll);

    return () => {
      node.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', flushScroll);
      flushScroll();
    };
  }, [mainRef]);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) {
      return undefined;
    }

    currentScrollSceneRef.current = scene;
    const savedScrollTop = scrollPositionsRef.current[scene] ?? 0;
    const shouldAnimate = hasRestoredInitialScrollRef.current && savedScrollTop === 0;
    let frameId = 0;
    const restoreScroll = (attempt: number) => {
      const maxScrollTop = Math.max(node.scrollHeight - node.clientHeight, 0);
      const targetScrollTop = Math.min(savedScrollTop, maxScrollTop);

      node.scrollTo({
        top: targetScrollTop,
        behavior: shouldAnimate ? 'smooth' : 'auto',
      });
      hasRestoredInitialScrollRef.current = true;

      if (
        savedScrollTop > 0 &&
        attempt < 8 &&
        Math.abs(node.scrollTop - targetScrollTop) > 2
      ) {
        frameId = window.requestAnimationFrame(() => restoreScroll(attempt + 1));
      }
    };

    frameId = window.requestAnimationFrame(() => restoreScroll(0));

    return () => window.cancelAnimationFrame(frameId);
  }, [mainRef, scene]);
}
