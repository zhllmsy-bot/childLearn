import React from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { track } from '../../telemetry/track';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const APP_STATE_STORAGE_KEY = 'childlearn.app-state-v1';

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    track('app.error_boundary', {
      message: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 600) ?? null,
    });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  private handleResetRun = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
      window.location.assign(window.location.origin + window.location.pathname);
    }
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-gradient-to-b from-emerald-100 via-lime-50 to-sky-100 px-5 py-8 text-emerald-950">
        <section className="w-full max-w-xl rounded-[2rem] bg-white/92 p-6 text-center shadow-2xl shadow-emerald-500/20 ring-2 ring-white">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <ShieldCheck size={42} strokeWidth={3} />
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight">学习页休息一下</h1>
          <p className="mt-3 text-lg font-bold leading-relaxed text-emerald-800/80">
            刚才有一段学习状态没有接住。奖励、贴纸和能力记录都还在，可以重试，
            也可以回到首页重新开始本关。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-lg font-black text-white shadow-lg shadow-emerald-500/25 ring-2 ring-white"
            >
              <RotateCcw size={22} strokeWidth={3} />
              重试
            </button>
            <button
              type="button"
              onClick={this.handleResetRun}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-50 px-5 text-lg font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
            >
              回首页
            </button>
          </div>
        </section>
      </main>
    );
  }
}
