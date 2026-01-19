
import React from 'react';
import { AlertOctagon, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary: Catches rendering errors and provides recovery options.
 * Using React.Component explicitly ensures inherited members like 'state', 'setState', and 'props' are correctly resolved by the compiler.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Explicitly initialize state in the constructor to ensure it's correctly linked with React.Component's internal state mechanism
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: any): State {
    return { hasError: true, error, errorInfo: null };
  }

  /**
   * Fix for line 43: componentDidCatch now correctly uses this.setState inherited from React.Component.
   */
  public componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // Using this.setState inherited from React.Component
    this.setState({ errorInfo });
  }

  private handleRestartWorkflow = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
  };

  private handleReload = () => {
    window.location.reload();
  };

  /**
   * Fix for line 111: render method correctly accesses this.props and this.state via React.Component inheritance.
   */
  public render() {
    // Check state captured by the ErrorBoundary instance
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 text-slate-200 font-sans">
          <div className="w-full max-w-2xl bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-[32px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <AlertOctagon className="text-red-500" size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white tracking-tight uppercase tracking-[0.2em]">Neural Engine Failure</h1>
                <p className="text-slate-500 text-sm font-medium">The Agent Swarm encountered an unrecoverable state.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Error Signature</span>
                <span className="text-[10px] font-mono text-red-400/50 bg-red-400/5 px-2 py-0.5 rounded uppercase">CRITICAL_FAULT</span>
              </div>
              <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 font-mono text-[11px] leading-relaxed text-slate-300 overflow-auto max-h-48 scrollbar-hide">
                {/* Properly display error stack or message */}
                {String(this.state.error?.stack || this.state.error || "Unknown system fault.")}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button 
                onClick={this.handleReload} 
                className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 group"
              >
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                Quick Reload
              </button>
              
              <button 
                onClick={this.handleRestartWorkflow} 
                className="flex items-center justify-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                <RotateCcw size={14} />
                Restart Workflow
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Correctly return children from the React.Component base class via this.props
    return this.props.children;
  }
}
