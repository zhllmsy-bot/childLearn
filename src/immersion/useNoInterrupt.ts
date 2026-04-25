import { useEffect } from 'react';

type MessageHandler = (message: string) => void;

export function useNoInterrupt(onMessage: MessageHandler, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const previousAlert = window.alert;
    const previousConfirm = window.confirm;
    const previousOverscroll = document.body.style.overscrollBehavior;

    window.alert = (message?: unknown) => {
      onMessage(String(message ?? ''));
    };
    window.confirm = (message?: string) => {
      onMessage(String(message ?? ''));
      return false;
    };

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('touchstart', preventMultiTouch, { passive: false });
    document.body.style.overscrollBehavior = 'none';

    return () => {
      window.alert = previousAlert;
      window.confirm = previousConfirm;
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('touchstart', preventMultiTouch);
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [enabled, onMessage]);
}
