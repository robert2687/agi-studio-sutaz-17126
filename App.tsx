import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Cpu, Zap, Activity, ShieldCheck, Loader2, Database,
  Terminal, ArrowRight, Bot, Binary, Code2, Rocket, 
  Microscope, Beaker, Plus, Play, CheckCircle2, XCircle,
  TrendingUp, Dna, Gauge, FastForward, Sparkles, RefreshCcw,
  ChevronDown, ChevronRight, Filter, Search, LayoutGrid,
  Settings2, Eye, FileText
} from 'lucide-react';
import Editor from "@monaco-editor/react";
import { 
  ProjectState, AgentStatus, DesignSystem, 
  AgentTask, AgentType, PersonalityProfile, TestCase 
} from './types';
import { 
  getManagerResponse, getPlannerResponse, getDesignerResponse, 
  getCoderStreamResponse, getComplexityAnalysis, getErrorAnalysis, getCopilotEdit
} from './geminiService';

const STORAGE_KEY = 'agentic_studio_pro_hybrid_v1';

// --- Sub-Components ---

const CollapsibleSection: React.FC<{ 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}> = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800/50 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-900/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={14} className="text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
      </button>
      {isOpen && <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1 duration-300">{children}</div>}
    </div>
  );
};

const MetricGauge: React.FC<{ label: string; value: string; color: string; icon: any }> = ({ label, value, color, icon: Icon }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-${color}/30 transition-colors`}>
        <Icon size={12} className={`text-${color}-400 opacity-60`} />
      </div>
      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</span>
    </div>
    <span className={`text-[11px] font-bold mono text-${color}-400`}>{value}</span>
  </div>
);

export default function App() {
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      userPrompt: "", personality: "Competitive", 
      complexity: { score: 1, intent: 'new', reasoning: "" },
      fileSystem: { "App.tsx": "export default function App() {\n  return <div>Neural Interface Ready</div>\n}" },
      semanticChanges: [], neuralErrors: [], designCompliance: {}, agentQueue: [], swarmPaused: false,
      terminalLogs: ["[KERNEL] System operational.", "[TELEMETRY] Neural load stabilized.", "[MODE] Competitive logic enabled."],
      status: "ready", currentFile: "App.tsx", activeTab: 'code', resources: { cpu: 12, memory: 4, vfsSize: 1, processes: [] },
      history: [], selectedHistoryId: null, activeReview: null, activeTestSuite: null, activeCleanup: null,
      onboarding: { isActive: true, step: 0, hasSeenIntro: false }, memorySummaries: [], immutableDirectives: [], testCases: []
    };
  });

  const [input, setInput] = useState("");
  const editorRef = useRef<any>(null);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

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
      setProject(p => ({ ...p, terminalLogs: [...p.terminalLogs, `[AGENT] Starting task: ${task.label}`] }));
      
      switch (task.type) {
        case 'manager':
          const analysis = await getComplexityAnalysis(project.userPrompt, project.personality);
          const srs = await getManagerResponse(project.userPrompt, project.personality);
          const types = ['planner', 'designer', 'coder'];
          const newQueue: AgentTask[] = types.map((type, idx) => ({
            id: `${type}-${Date.now()}-${idx}`,
            type: type as AgentType,
            label: type.toUpperCase(),
            priority: idx,
            status: idx === 0 ? 'active' : 'pending'
          }));
          setProject(p => ({ ...p, complexity: analysis, srs, agentQueue: newQueue }));
          break;
        case 'planner':
          const plan = await getPlannerResponse(project.srs!, project.personality);
          setProject(p => ({ ...p, plan, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          break;
        case 'designer':
          const design = await getDesignerResponse(project.userPrompt, project.plan?.features || [], project.personality);
          setProject(p => ({ ...p, designSystem: design, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          break;
        case 'coder':
          const files = project.plan?.files || ["App.tsx"];
          for (const file of files) {
            await getCoderStreamResponse(
              file, project.plan, project.designSystem!, project.fileSystem, project.personality,
              (content) => setProject(p => ({ ...p, fileSystem: { ...p.fileSystem, [file]: content } })),
              () => project.swarmPaused
            );
          }
          setProject(p => ({ ...p, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          break;
        default:
          setProject(p => ({ ...p, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
      }
    } catch (err) {
      setProject(p => ({ 
        ...p, 
        status: 'error', 
        terminalLogs: [...p.terminalLogs, `[ERROR] Task ${task.label} failed: ${err}`] 
      }));
    } finally {
      isExecutingRef.current = false;
    }
  }, [project]);

  useEffect(() => {
    if (project.status === 'busy') processQueue();
  }, [project.status, project.agentQueue, processQueue]);

  const initSynthesis = () => {
    setProject(p => ({
      ...p,
      userPrompt: input,
      status: 'busy',
      terminalLogs: [...p.terminalLogs, `[SYSTEM] Synthesis initialized for: ${input}`],
      agentQueue: [{ id: 'init', type: 'manager', label: 'ANALYZE_INTENT', priority: 0, status: 'active' }]
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#02040a] text-slate-100 overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800/80 flex items-center justify-between px-6 bg-slate-950/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Zap size={14} className="text-black" fill="currentColor" />
            </div>
            <h1 className="text-[12px] font-bold tracking-[0.25em] uppercase text-white">Agentic Studio <span className="text-emerald-500 font-black">Pro</span></h1>
          </div>
          <div className="h-4 w-px bg-slate-800 mx-2" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">All systems nominal</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Competitive logic enabled</span>
          </div>
          <div className="flex items-center gap-4 border-l border-slate-800 pl-8">
             <button className="text-slate-500 hover:text-white transition-colors"><Settings2 size={16} /></button>
             <div className="flex items-center gap-2">
               <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold">AS</div>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Neural Pipeline */}
        <aside className="w-[24rem] flex flex-col bg-slate-950/20 border-r border-slate-800/80 overflow-y-auto scrollbar-hide">
          <CollapsibleSection title="Neural Metrics" icon={Activity}>
            <div className="space-y-4 pt-2">
              <MetricGauge label="Neural Load" value="14.2%" color="emerald" icon={Cpu} />
              <MetricGauge label="Clock Speed" value="5.2 GHz" color="blue" icon={Gauge} />
              <MetricGauge label="Context SAT" value="48.1k" color="amber" icon={Database} />
              <div className="h-1 w-full bg-slate-900 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500/60 w-[42%]" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Swarm Vector" icon={Bot}>
            <div className="space-y-3 pt-2">
              {project.agentQueue.length > 0 ? project.agentQueue.map((task) => (
                <div key={task.id} className={`p-4 rounded-xl border transition-all ${
                  task.status === 'active' 
                    ? 'bg-emerald-600/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                    : 'bg-slate-900/40 border-slate-800/40 opacity-40'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${task.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      {task.label}
                    </span>
                    {task.status === 'active' && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${task.status === 'active' ? (i <= 3 ? 'bg-emerald-500/50' : 'bg-slate-800') : 'bg-slate-800'}`} />
                    ))}
                  </div>
                </div>
              )) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/40 rounded-2xl opacity-20 space-y-3">
                  <ShieldCheck size={32} strokeWidth={1} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Queue Neutral</span>
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Neural Directives" icon={ShieldCheck} defaultOpen={false}>
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <p className="text-[10px] text-emerald-300/60 leading-relaxed font-mono italic">
                  "Logical coherence must be preserved at O(N) complexity thresholds. Synthesis is deterministic."
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Strict Type Validation</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Design Compliance v3.0</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </aside>

        {/* Center Panel: Code Surface */}
        <section className="flex-1 flex flex-col bg-slate-950/40">
          <div className="h-12 border-b border-slate-800/80 flex items-center px-6 justify-between bg-slate-900/20">
            <div className="flex items-center gap-8">
              {[
                { id: 'code', icon: Code2, label: 'Code' },
                { id: 'preview', icon: Eye, label: 'Preview' },
                { id: 'tests', icon: Microscope, label: 'Tests' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setProject(p => ({ ...p, activeTab: tab.id as any }))}
                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 py-3.5 ${
                    project.activeTab === tab.id 
                      ? 'text-emerald-400 border-emerald-500 shadow-[0_4px_10px_-4px_rgba(16,185,129,0.3)]' 
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Synthesis Mode</span>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                <div className="w-1 h-1 rounded-full bg-blue-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">React 19</span>
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {project.status === 'busy' && (
              <div className="absolute inset-0 bg-emerald-500/[0.02] pointer-events-none z-10 scanner-active" />
            )}
            
            {project.activeTab === 'code' ? (
              <Editor 
                height="100%" 
                language="typescript" 
                theme="vs-dark" 
                value={project.currentFile ? project.fileSystem[project.currentFile] : ""}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 24, bottom: 24 },
                  lineHeight: 1.6,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  roundedSelection: true,
                  automaticLayout: true
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700">
                  <LayoutGrid size={40} strokeWidth={1} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Surface Initializing</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    The {project.activeTab} environment is waiting for logic synthesis to complete.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-950/60 border-t border-slate-800/80">
            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800/80 rounded-[20px] p-2 pr-4 shadow-xl">
               <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)}
                placeholder="Describe your intent or algorithmic challenge..." 
                className="flex-1 bg-transparent border-none p-3 text-[12px] text-slate-300 resize-none outline-none font-mono min-h-[50px] scrollbar-hide"
              />
              <button 
                onClick={initSynthesis}
                disabled={project.status === 'busy' || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20 transition-all active:scale-90 disabled:opacity-20"
              >
                <FastForward size={20} fill="currentColor" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel: Neural Logs */}
        <aside className="w-[22rem] flex flex-col bg-slate-950/20 border-l border-slate-800/80">
          <CollapsibleSection title="Neural Logs" icon={Terminal}>
            <div className="h-[calc(100vh-400px)] flex flex-col pt-2">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide font-mono text-[10px] leading-relaxed">
                {project.terminalLogs.map((log, i) => {
                  const tag = log.match(/\[(.*?)\]/)?.[1] || "INFO";
                  const tagColor = {
                    KERNEL: "text-blue-400",
                    TELEMETRY: "text-emerald-400",
                    MODE: "text-amber-400",
                    AGENT: "text-purple-400",
                    ERROR: "text-red-400",
                    SYSTEM: "text-slate-300"
                  }[tag] || "text-slate-500";

                  return (
                    <div key={i} className="flex gap-2 group">
                      <span className={`${tagColor} font-bold opacity-60`}>[{tag}]</span>
                      <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{log.replace(/\[.*?\]/, '').trim()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 pt-4 mt-4 border-t border-slate-800/50">
                <button className="text-[9px] font-bold text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">Clear Logs</button>
                <div className="flex-1" />
                <Filter size={12} className="text-slate-600" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Virtual File System" icon={Database}>
            <div className="space-y-2 pt-2">
              {Object.keys(project.fileSystem).map(f => (
                <button 
                  key={f} 
                  onClick={() => setProject(p => ({ ...p, currentFile: f }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    project.currentFile === f 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-900/30 border-slate-800/50 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <FileText size={14} className={project.currentFile === f ? 'text-emerald-400' : 'text-slate-600'} />
                    {f}
                  </div>
                  {project.currentFile === f && <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />}
                </button>
              ))}
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-800/50 text-slate-700 hover:border-slate-600 hover:text-slate-500 transition-all">
                <Plus size={14} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Inject Vector</span>
              </button>
            </div>
          </CollapsibleSection>
        </aside>
      </main>

      {/* Logic Ribbon */}
      <footer className="h-8 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between px-6 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            <span>VFS Snapshot: 1.2 MB</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            <span>Neural Coherence: 0.98</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>Engine: <span className="text-slate-400 font-black tracking-normal">Gemini 3 Pro</span></span>
          <div className="h-3 w-px bg-slate-800" />
          <span>Epoch: <span className="text-slate-400">1.4.2</span></span>
        </div>
      </footer>
    </div>
  );
}