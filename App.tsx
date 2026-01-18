
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Cpu, Zap, Activity, ShieldCheck, HelpCircle, Loader2, Database,
  RefreshCw, Waves, Bug, Terminal, Layers, ArrowRight, Lock, 
  History as HistoryIcon, CircleAlert, Send, User as UserIcon, Bot,
  ShieldAlert, Scan, Binary, Layout, ArrowDownToLine, Eye, Sparkles
} from 'lucide-react';
import Editor from "@monaco-editor/react";
import { 
  ProjectState, AgentStatus, DesignSystem, User, 
  AgentTask, AgentType, SemanticChange, MemorySummary, 
  PersonalityProfile, NeuralError, DebugStrategy 
} from './types';
import { 
  getManagerResponse, getPlannerResponse, getDesignerResponse, 
  getCoderStreamResponse, getComplexityAnalysis,
  getErrorAnalysis, getMemoryCompressionResponse,
  getErrorInsight, getCopilotEdit
} from './geminiService';

const STORAGE_KEY = 'agentic_studio_pro_v15_final';

// --- Components ---

const PreviewDisplay: React.FC<{ fileSystem: Record<string, string>, status: AgentStatus }> = React.memo(({ fileSystem, status }) => {
  const [srcDoc, setSrcDoc] = useState('');
  const lastUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'ready') {
      const appCode = fileSystem['App.tsx'] || '';
      if (appCode === lastUpdateRef.current) return;
      
      const transformedCode = appCode
        .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '') 
        .replace(/export\s+default\s+/, 'window.App = '); 

      const doc = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@19.0.0",
              "react-dom": "https://esm.sh/react-dom@19.0.0/client",
              "lucide-react": "https://esm.sh/lucide-react@0.475.0"
            }
          }
          </script>
          <style>
            body { margin: 0; background: #020617; color: white; font-family: sans-serif; overflow: auto; }
            #root { min-height: 100vh; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom';
            
            try {
              ${transformedCode}
              const root = createRoot(document.getElementById('root'));
              const AppElement = window.App || (() => React.createElement('div', { className: 'p-10 text-center text-slate-500 font-mono text-sm' }, 'System Waiting for valid App.tsx export...'));
              root.render(React.createElement(AppElement));
            } catch (e) {
              document.getElementById('root').innerHTML = '<div style="background: #111; color: #ff5555; padding: 2rem; font-family: monospace; border: 1px solid #333;"><h1 style="margin: 0 0 1rem 0;">Runtime Fault</h1><pre style="white-space: pre-wrap;">' + e.message + '\\n\\n' + e.stack + '</pre></div>';
            }
          </script>
        </body>
        </html>
      `;
      setSrcDoc(doc);
      lastUpdateRef.current = appCode;
    }
  }, [status, fileSystem['App.tsx']]);

  return (
    <div className="w-full h-full relative bg-[#010409] flex flex-col">
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={12} className={status === 'ready' ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Live Synthesis Preview</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${status === 'ready' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex-1 relative">
        {status === 'busy' && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <div className="text-center">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Neural Construction in Progress</h2>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Freezing frame...</p>
            </div>
          </div>
        )}
        <iframe title="preview-sandbox" srcDoc={srcDoc} className="w-full h-full border-none bg-slate-950" sandbox="allow-scripts allow-forms allow-modals" />
      </div>
    </div>
  );
});

export default function App() {
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      userPrompt: "",
      personality: "Experimental",
      complexity: { score: 0, intent: 'new', reasoning: "" },
      fileSystem: { "App.tsx": "// Neural Copilot ready.\n// Highlight code and press Cmd+K to refactor.\n\nexport default function App() {\n  return <div className='p-20 text-center text-indigo-400 font-bold'>Hello Neural World</div>;\n}" },
      semanticChanges: [],
      neuralErrors: [],
      designCompliance: {},
      agentQueue: [],
      swarmPaused: false,
      terminalLogs: ["[SYSTEM] Neural Link established."],
      status: "idle",
      currentFile: "App.tsx",
      activeTab: 'code',
      resources: { cpu: 0, memory: 0, vfsSize: 0, processes: [] },
      history: [],
      selectedHistoryId: null,
      activeReview: null,
      activeTestSuite: null,
      activeCleanup: null,
      onboarding: { isActive: true, step: 0, hasSeenIntro: false },
      memorySummaries: [],
      immutableDirectives: ["Tailwind only.", "Modular architecture."]
    };
  });

  const [input, setInput] = useState(project.userPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isExecutingRef = useRef(false);
  
  // Copilot State
  const [copilotVisible, setCopilotVisible] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add Cmd+K command for Copilot
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setCopilotVisible(true);
    });

    // Close on escape
    editor.addCommand(monaco.KeyCode.Escape, () => {
      setCopilotVisible(false);
    });
  };

  const executeCopilot = async () => {
    if (!copilotInput.trim() || !editorRef.current) return;
    
    setIsCopilotThinking(true);
    const selection = editorRef.current.getSelection();
    const selectedText = editorRef.current.getModel().getValueInRange(selection);
    const fullText = editorRef.current.getValue();

    try {
      let currentResult = "";
      await getCopilotEdit(
        copilotInput,
        selectedText,
        fullText,
        project.designSystem || ({} as DesignSystem),
        project.personality,
        (chunk) => {
          currentResult = chunk;
          // Apply streamed text to editor at selection
          const range = selection;
          editorRef.current.executeEdits('neural-copilot', [
            { range: range, text: chunk, forceMoveMarkers: true }
          ]);
        }
      );

      setProject(p => ({
        ...p,
        status: 'ready',
        terminalLogs: [...p.terminalLogs, `[COPILOT] Successfully applied: ${copilotInput}`]
      }));
    } catch (err) {
      console.error("Copilot failed:", err);
    } finally {
      setIsCopilotThinking(false);
      setCopilotVisible(false);
      setCopilotInput('');
    }
  };

  const processQueue = useCallback(async () => {
    if (isExecutingRef.current || project.swarmPaused) return;
    
    const activeTaskIndex = project.agentQueue.findIndex(t => t.status === 'active');
    if (activeTaskIndex === -1) {
      if (project.agentQueue.length > 0) {
        setProject(p => ({
          ...p,
          agentQueue: p.agentQueue.map((t, i) => i === 0 ? { ...t, status: 'active' } : t)
        }));
      } else {
        setProject(p => ({ ...p, status: 'ready' }));
      }
      return;
    }
    
    const task = project.agentQueue[activeTaskIndex];
    isExecutingRef.current = true;

    try {
      switch (task.type) {
        case 'manager':
          const analysis = await getComplexityAnalysis(project.userPrompt, project.personality);
          const srs = await getManagerResponse(project.userPrompt, project.personality);
          const newQueue: AgentTask[] = (analysis.suggestedSequence || []).map((type: string, idx: number) => ({
            id: `${type}-${idx}`,
            type: type as AgentType,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            priority: idx + 1,
            status: idx === 0 ? 'active' : 'pending'
          }));
          setProject(prev => ({ ...prev, complexity: analysis, srs, agentQueue: newQueue }));
          break;

        case 'planner':
          const plan = await getPlannerResponse(project.srs!, project.personality);
          setProject(prev => ({ ...prev, plan, agentQueue: prev.agentQueue.filter(t => t.id !== task.id) }));
          break;

        case 'designer':
          const design = await getDesignerResponse(project.userPrompt, project.plan?.features || [], project.personality);
          setProject(prev => ({ ...prev, designSystem: design, agentQueue: prev.agentQueue.filter(t => t.id !== task.id) }));
          break;

        case 'coder':
          const files = project.plan?.files || ["App.tsx"];
          for (const file of files) {
            await getCoderStreamResponse(
              file, project.plan!, project.designSystem!, project.fileSystem, project.personality,
              (content) => setProject(p => ({ ...p, fileSystem: { ...p.fileSystem, [file]: content } })),
              () => project.swarmPaused
            );
          }
          setProject(prev => ({ ...prev, agentQueue: prev.agentQueue.filter(t => t.id !== task.id) }));
          break;

        default:
          setProject(prev => ({ ...prev, agentQueue: prev.agentQueue.filter(t => t.id !== task.id) }));
      }
    } catch (err) {
      console.error(err);
      setProject(prev => ({ ...prev, status: 'error', agentQueue: [] }));
    } finally {
      isExecutingRef.current = false;
    }
  }, [project]);

  useEffect(() => {
    if (project.status === 'busy') processQueue();
  }, [project.status, project.agentQueue, processQueue]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-100 font-sans overflow-hidden">
      {/* HUD Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Waves className="text-indigo-400" size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-[11px] tracking-[0.3em] uppercase text-white">Agentic Studio <span className="text-indigo-400">Pro</span></h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${project.status === 'ready' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Neural Link: {project.status.toUpperCase()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-4 border-r border-slate-800 pr-6">
             {['Minimalist', 'Enterprise', 'Playful', 'Experimental'].map(p => (
               <button 
                key={p} 
                onClick={() => setProject(prev => ({ ...prev, personality: p as PersonalityProfile }))}
                className={`text-[10px] font-bold uppercase tracking-widest transition-all ${project.personality === p ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
               >
                 {p}
               </button>
             ))}
           </div>
           <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Copilot Engaged</span>
                <span className="text-[10px] font-bold uppercase text-indigo-400 flex items-center gap-1"><Sparkles size={10} /> Active</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <Activity size={18} className={project.status === 'busy' ? 'text-indigo-400 animate-pulse' : 'text-slate-600'} />
           </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Control Column */}
        <div className="w-80 flex flex-col bg-slate-950 border-r border-slate-800">
           <div className="flex border-b border-slate-800 bg-slate-900/10">
             {[
               { id: 'code', label: 'Swarm', icon: Cpu },
               { id: 'preview', label: 'Live', icon: Eye }
             ].map(tab => (
               <button 
                key={tab.id}
                onClick={() => setProject(p => ({ ...p, activeTab: tab.id as any }))} 
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[8px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${
                  project.activeTab === tab.id ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 border-transparent hover:bg-slate-900'
                }`}
               >
                 <tab.icon size={12} /> {tab.label}
               </button>
             ))}
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest border-b border-slate-800 pb-2">Swarm Pipeline</div>
              {project.agentQueue.map((t) => (
                <div key={t.id} className={`p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden ${
                  t.status === 'active' ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-slate-900/40 border-slate-800 opacity-40'
                }`}>
                  <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-wider">
                    <span>{t.label}</span>
                    {t.status === 'active' && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-indigo-500 transition-all duration-1000 ${t.status === 'active' ? 'w-1/2 animate-pulse' : 'w-0'}`} />
                  </div>
                </div>
              ))}
              {project.agentQueue.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 opacity-10 text-center">
                   <Layout size={40} />
                   <span className="text-[10px] uppercase font-bold tracking-widest mt-4">Pipeline Idle</span>
                </div>
              )}
           </div>
        </div>

        {/* Dynamic Center Stage */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {project.activeTab === 'preview' ? (
            <PreviewDisplay fileSystem={project.fileSystem} status={project.status} />
          ) : (
            <div className="flex-1 relative bg-[#010409]">
              {/* Copilot Scanner Effect */}
              {isCopilotThinking && <div className="scanner-active absolute inset-0 z-40 pointer-events-none" />}
              
              {/* Inline Copilot UI */}
              {copilotVisible && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 w-[450px] bg-slate-900/90 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-indigo-400" size={16} />
                    <span className="text-[11px] font-bold text-indigo-100 uppercase tracking-[0.2em]">Neural Copilot Directive</span>
                  </div>
                  <div className="relative">
                    <input 
                      autoFocus
                      value={copilotInput}
                      onChange={e => setCopilotInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && executeCopilot()}
                      placeholder="e.g., 'Add a sleek modern navigation bar'"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-2xl py-4 pl-6 pr-14 text-[13px] text-white placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                    />
                    <button 
                      onClick={executeCopilot}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 text-white transition-all shadow-lg"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">
                    <span>Selection: {editorRef.current?.getSelection()?.isEmpty() ? 'Current Line' : 'Highlighted Area'}</span>
                    <span className="flex items-center gap-1"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded">ESC</kbd> to cancel</span>
                  </div>
                </div>
              )}

              <div className="absolute top-4 right-6 z-20 flex gap-2">
                 <div className="px-3 py-1 bg-indigo-600/10 backdrop-blur-md border border-indigo-500/20 rounded-full text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Binary size={10} /> Copilot Shortcut: Cmd+K
                 </div>
              </div>
              
              <Editor 
                height="100%" 
                language="typescript" 
                theme="vs-dark" 
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 13,
                  fontFamily: "'Fira Code', monospace",
                  minimap: { enabled: false },
                  lineNumbersMinChars: 3,
                  padding: { top: 20 },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on"
                }}
                value={project.currentFile ? project.fileSystem[project.currentFile] : ``} 
                onChange={(val) => {
                  if (project.currentFile && val) {
                    setProject(p => ({ ...p, fileSystem: { ...p.fileSystem, [project.currentFile!]: val } }));
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Right Asset/Terminal Column */}
        <div className="w-80 flex flex-col bg-slate-950 border-l border-slate-800">
           <div className="p-4 flex-1 space-y-6 overflow-y-auto font-mono text-[10px]">
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ArrowDownToLine size={12} /> Registry</span>
                  <RefreshCw size={10} className="hover:text-indigo-400 cursor-pointer transition-all" onClick={() => window.location.reload()} />
                </div>
                {Object.keys(project.fileSystem).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setProject(p => ({ ...p, currentFile: f }))} 
                    className={`w-full text-left p-2.5 rounded-xl transition-all border ${
                      project.currentFile === f ? 'text-indigo-400 bg-indigo-500/5 border-indigo-500/20' : 'text-slate-500 border-transparent'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${project.currentFile === f ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-700'}`} />
                       {f}
                    </span>
                  </button>
                ))}
              </section>

              <section className="space-y-3">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Neural Stream</div>
                <div className="space-y-1 opacity-60">
                  {project.terminalLogs.slice(-10).map((log, i) => (
                    <div key={i} className="text-slate-400 truncate tracking-tight">{log}</div>
                  ))}
                </div>
              </section>
           </div>
           
           <div className="p-5 border-t border-slate-800 bg-slate-900/20">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Inject core architectural directive..." 
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-300 resize-none outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-700 font-mono" 
            />
            <button 
              onClick={() => {
                setProject(p => ({ 
                  ...p, 
                  userPrompt: input, 
                  status: 'busy', 
                  agentQueue: [{ id: `init-${Date.now()}`, type: 'manager', label: 'Processing Intent', priority: 1, status: 'active' }] 
                }));
              }} 
              disabled={project.status === 'busy' || !input.trim()}
              className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl text-[10px] font-bold flex items-center justify-center gap-3 uppercase tracking-[0.3em] shadow-xl shadow-indigo-900/20 active:scale-[0.98] transition-all disabled:opacity-30"
            >
              <Zap size={14} fill="currentColor" /> Synthesis
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
