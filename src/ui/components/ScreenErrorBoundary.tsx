import React from 'react';

interface Props { children: React.ReactNode; routeKey: string }
interface State { error: Error | null }

export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error(`Screen ${this.props.routeKey} failed`, error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="rounded-2xl border border-rose-900/60 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-rose-300">当前屏幕加载异常</h2>
        <p className="mt-2 text-sm text-slate-400 break-words">{this.state.error.message}</p>
        <button className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200" onClick={() => this.setState({ error: null })}>重新加载此屏</button>
      </section>
    );
  }
}
