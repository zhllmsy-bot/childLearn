import { useCallback, useEffect, useRef } from 'react';

export function useAppScheduler() {
  const timeoutIds = useRef<number[]>([]);
  const flowIdRef = useRef(0);

  const schedule = useCallback((task: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutIds.current = timeoutIds.current.filter((storedId) => storedId !== id);
      task();
    }, delay);
    timeoutIds.current.push(id);
  }, []);

  const clearScheduled = useCallback(() => {
    timeoutIds.current.forEach((id) => window.clearTimeout(id));
    timeoutIds.current = [];
  }, []);

  const waitFor = useCallback(
    (delay: number) =>
      new Promise<void>((resolve) => {
        schedule(resolve, delay);
      }),
    [schedule],
  );

  const beginFlow = useCallback(() => {
    flowIdRef.current += 1;
    return flowIdRef.current;
  }, []);

  const isCurrentFlow = useCallback((flowId: number) => flowIdRef.current === flowId, []);

  useEffect(() => () => clearScheduled(), [clearScheduled]);

  return {
    schedule,
    clearScheduled,
    waitFor,
    beginFlow,
    isCurrentFlow,
  };
}
