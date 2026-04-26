import {
  ArrowLeft,
  Gift,
  Home,
  Settings2,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SPRING } from '../../theme/springs';

type AppTopBarIcon =
  | 'back'
  | 'home'
  | 'mute'
  | 'parent-report'
  | 'settings'
  | 'sound'
  | 'stickers';

export interface AppTopBarAction {
  ariaLabel: string;
  holdMs?: number;
  icon: AppTopBarIcon;
  id: string;
  onClick?: () => void;
  onHold?: () => void;
  popover?: ReactNode;
  pressed?: boolean;
}

export interface AppTopBarConfig {
  actions?: AppTopBarAction[];
  leadingAction?: AppTopBarAction | null;
  progressDots?: boolean[];
  status?: ReactNode;
  title: ReactNode;
}

interface TopBarEntry {
  config: AppTopBarConfig;
  priority: number;
}

interface AppTopBarContextValue {
  config: AppTopBarConfig;
  registerConfig: (id: string, config: AppTopBarConfig, priority: number) => void;
  unregisterConfig: (id: string) => void;
}

const DEFAULT_TOPBAR_CONFIG: AppTopBarConfig = {
  actions: [],
  leadingAction: null,
  title: '果园摘果',
};

const AppTopBarContext = createContext<AppTopBarContextValue | null>(null);

function pickActiveConfig(entries: Record<string, TopBarEntry>): AppTopBarConfig {
  const activeEntry = Object.values(entries).sort((a, b) => b.priority - a.priority)[0];
  return activeEntry?.config ?? DEFAULT_TOPBAR_CONFIG;
}

export function AppTopBarProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, TopBarEntry>>({});
  const registerConfig = useCallback(
    (id: string, config: AppTopBarConfig, priority: number) => {
      setEntries((current) => ({
        ...current,
        [id]: { config, priority },
      }));
    },
    [],
  );
  const unregisterConfig = useCallback((id: string) => {
    setEntries((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const config = useMemo(() => pickActiveConfig(entries), [entries]);
  const value = useMemo(
    () => ({ config, registerConfig, unregisterConfig }),
    [config, registerConfig, unregisterConfig],
  );

  return (
    <AppTopBarContext.Provider value={value}>{children}</AppTopBarContext.Provider>
  );
}

export function useTopBarConfig(config: AppTopBarConfig, priority = 0) {
  const context = useContext(AppTopBarContext);
  const id = useId();

  if (!context) {
    throw new Error('useTopBarConfig must be used inside AppTopBarProvider');
  }

  const { registerConfig, unregisterConfig } = context;

  useLayoutEffect(() => {
    registerConfig(id, config, priority);
    return () => unregisterConfig(id);
  }, [config, id, priority, registerConfig, unregisterConfig]);
}

function renderIcon(icon: AppTopBarIcon) {
  switch (icon) {
    case 'back':
      return <ArrowLeft size={24} strokeWidth={3.1} />;
    case 'home':
      return <Home size={24} strokeWidth={3.1} />;
    case 'mute':
      return <VolumeX size={24} strokeWidth={3.1} />;
    case 'parent-report':
      return <ShieldCheck size={24} strokeWidth={3.1} />;
    case 'settings':
      return <Settings2 size={24} strokeWidth={3.1} />;
    case 'sound':
      return <Volume2 size={24} strokeWidth={3.1} />;
    case 'stickers':
      return <Gift size={24} strokeWidth={3.1} />;
  }
}

function AppTopBarButton({ action }: { action: AppTopBarAction }) {
  const [holdProgress, setHoldProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const holdMs = action.holdMs ?? 0;
  const hasHoldAction = Boolean(action.onHold && holdMs > 0);

  const clearHold = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
    timerRef.current = null;
    frameRef.current = null;
    setHoldProgress(0);
  }, []);

  const tickHold = useCallback(() => {
    const elapsed = Date.now() - startedAtRef.current;
    setHoldProgress(Math.min(elapsed / holdMs, 1));
    if (elapsed < holdMs) {
      frameRef.current = window.requestAnimationFrame(tickHold);
    }
  }, [holdMs]);

  const beginHold = useCallback(() => {
    if (!hasHoldAction) {
      return;
    }
    clearHold();
    startedAtRef.current = Date.now();
    frameRef.current = window.requestAnimationFrame(tickHold);
    timerRef.current = window.setTimeout(() => {
      clearHold();
      action.onHold?.();
    }, holdMs);
  }, [action, clearHold, hasHoldAction, holdMs, tickHold]);

  return (
    <motion.button
      aria-label={action.ariaLabel}
      aria-pressed={action.pressed}
      className="icon-btn-48"
      onClick={hasHoldAction ? undefined : action.onClick}
      onPointerCancel={clearHold}
      onPointerDown={beginHold}
      onPointerLeave={clearHold}
      onPointerUp={clearHold}
      transition={SPRING.bounce}
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ y: 4 }}
    >
      {hasHoldAction ? (
        <span
          aria-hidden="true"
          className="app-topbar-hold-ring"
          style={{
            background: `conic-gradient(var(--right) ${holdProgress * 360}deg, transparent 0deg)`,
          }}
        />
      ) : null}
      <span className="app-topbar-icon" aria-hidden="true">
        {renderIcon(action.icon)}
      </span>
    </motion.button>
  );
}

function AppTopBarActionSlot({ action }: { action: AppTopBarAction }) {
  return (
    <div className="app-topbar-action">
      <AppTopBarButton action={action} />
      {action.popover}
    </div>
  );
}

export function AppTopBar() {
  const context = useContext(AppTopBarContext);

  if (!context) {
    throw new Error('AppTopBar must be used inside AppTopBarProvider');
  }

  const { actions = [], leadingAction, progressDots, status, title } = context.config;

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="app-topbar"
      initial={{ opacity: 0, y: -8 }}
      role="banner"
      transition={SPRING.enter}
    >
      <div className="app-topbar-leading">
        {leadingAction ? <AppTopBarActionSlot action={leadingAction} /> : null}
      </div>

      <div className="topbar-title">
        <h1 className="app-topbar-title">{title}</h1>
        {progressDots ? (
          <div
            aria-label="关卡进度"
            className="programming-progress-pill app-topbar-progress"
            role="img"
          >
            {progressDots.map((filled, index) => (
              <span
                key={`topbar-dot-${index + 1}`}
                className="app-topbar-progress-dot"
                style={{
                  background: filled ? 'var(--brand-primary)' : 'var(--border-default)',
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="topbar-actions">
        {status ? <div className="app-topbar-status">{status}</div> : null}
        {actions.map((action) => (
          <AppTopBarActionSlot action={action} key={action.id} />
        ))}
      </div>
    </motion.header>
  );
}
