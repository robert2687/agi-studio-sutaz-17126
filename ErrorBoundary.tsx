
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/**
 * ErrorBoundary: Catches rendering errors in the studio components.
 */
// Fix: Extending Component directly from the named import to ensure proper inheritance.
export class ErrorBoundary extends Component<Props, State> {
  // Define state with proper type to ensure it's correctly recognized by the class.
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  constructor(props: Props) {
    // super(props) is required for class components to initialize the this context.
    super(props);
  }

  // Lifecycle method to update state when an error is thrown in a child component.
  static getDerivedStateFromError(error: any): Partial<State> {
    return { hasError: true, error };
  }

  // Lifecycle method to capture additional error info.
  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    // Fix: Successfully call setState from Component base class.
    this.setState({ errorInfo });
  }

  handleRestartWorkflow = () => {
    localStorage.clear();
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    // Check state for errors during the render cycle.
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 text-slate-200">
          <div className="w-full max-w-xl bg-[#0f172a] border border-red-900/50 rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <AlertOctagon className="text-red-500" size={32} />
              <h1 className="text-xl font-bold uppercase tracking-widest">Neural Crash</h1>
            </div>
            <p className="text-slate-400 text-sm font-mono bg-black/30 p-4 rounded border border-slate-800">
              {String(this.state.error)}
            </p>
            <div className="flex gap-4">
              <button onClick={this.handleReload} className="px-6 py-2 bg-slate-800 rounded-lg text-xs font-bold">RELOAD</button>
              <button onClick={this.handleRestartWorkflow} className="px-6 py-2 bg-red-600 rounded-lg text-xs font-bold">RESET STUDIO</button>
            </div>
          </div>
        </div>
      );
    }
    // Fix: Successfully access props from Component base class.
    return this.props.children;
  }
}
