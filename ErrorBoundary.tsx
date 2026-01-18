
import React, { Component } from 'react';
import { AlertOctagon, RotateCcw, RefreshCw } from 'lucide-react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary: Catches rendering errors and provides recovery options.
 * Using Component<Props, State> ensure the compiler correctly resolves 'state', 'setState', and 'props'.
 */
export class ErrorBoundary extends Component<Props, State> {
  // Explicitly initialize state as a class property to ensure it's recognized by the TypeScript compiler
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: any): State {
    return { hasError: true, error, errorInfo: null };
  }

  // Handle side effects on error and update state using this.setState inherited from Component
  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
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

  public render() {
    // Access this.state from the base Component class to check for captured errors
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
                {/* Access state.error properly from the instance context */}
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
    // Correctly return this.props.children from the inherited Component class
    return this.props.children;
  }
}
