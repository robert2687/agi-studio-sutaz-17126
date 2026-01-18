import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Cpu, Zap, ShieldCheck, Loader2, 
  Terminal, Binary, Code2, Microscope, Plus, 
  CheckCircle2, FastForward, 
  ChevronDown, Settings2, Eye, FileText,
  Rocket, Layers, BrainCircuit, Maximize2, Minimize2,
  LayoutGrid
} from 'lucide-react';
import { 
  ProjectState, AgentTask, AgentType
} from './types';
import { 
  getManagerResponse, getPlannerResponse, getDesignerResponse, 
  getCoderStreamResponse, getComplexityAnalysis
} from './geminiService';

const STORAGE_KEY = 'agentic_studio_pro_v3';

// --- UI Components ---

const PanelHeader: React.FC<{ 
  title: string; 
  icon: any; 
  badge?: string; 
  isCollapsed: boolean; 
  onToggle: () => void 
}> = ({ title, icon: Icon, badge, isCollapsed, onToggle }) => (
  <div className="flex items-center justify-between mb-6 px-2">
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0">
        <Icon size={14} className="text-emerald-400" />
      </div>
      {!isCollapsed && (
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 truncate animate-in fade-in duration-500">{title}</h2>
      )}
    </div>
    <div className="flex items-center gap-2">
      {!isCollapsed && badge && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex-shrink-0">
          {badge}
        </span>
      )}
      <button 
        onClick={onToggle}
        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-600 hover:text-slate-300"
      >
        {isCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
      </button>
    </div>
  </div>
);

const TelemetryCard: React.FC<{ label: string; value: string; color: string; icon: any; trend?: string; isCollapsed: boolean }> = ({ label, value, color, icon: Icon, trend, isCollapsed }) => (
  <div className={`p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700/50 transition-all group relative overflow-hidden ${isCollapsed ? 'p-2' : ''}`}>
    <div className="flex items-center justify-between relative z-10">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-${color}-500/30 transition-all shadow-inner`}>
          <Icon size={14} className={`text-${color}-400 opacity-60`} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col animate-in fade-in duration-300">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>
            <span className={`text-[13px] font-black mono text-${color}-400`}>{value}</span>
          </div>
        )}
      </div>
    </div>
    <div className={`absolute bottom-0 left-0 h-0.5 bg-${color}-500/20 w-full opacity-0 group-hover:opacity-100 transition-opacity`} />
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
      status: "ready", currentFile: "App.tsx", activeTab: 'code', resources: { cpu: 14.2, memory: 4.8, vfsSize: 1.2, processes: [] },
      history: [], selectedHistoryId: null, activeReview: null, activeTestSuite: null, activeCleanup: null,
      onboarding: { isActive: true, step: 0, hasSeenIntro: false }, memorySummaries: [], immutableDirectives: [], testCases: []
    };
  });

  const [input, setInput] = useState("");
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [highlightedLogIndex, setHighlightedLogIndex] = useState<number | null>(null);
  const isExecutingRef = useRef(false);

  // --- REQUESTED LOCAL TAB STATE ---
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "tests">("code");

  // --- REQUESTED RENDER LOGIC ---
  const renderTabContent = () => {
    switch (activeTab) {
      case "code":
        return (
          <pre className="p-8 font-mono text-sm leading-relaxed text-emerald-400/90 selection:bg-emerald-500/20">
            <code>{`export default function App() {
  return <div>Ready for S</div>
}`}</code>
          </pre>
        );

      case "preview":
        return (
          <div style={{ padding: "10px" }} className="animate-in fade-in duration-500">
            <h3 style={{ marginBottom: "8px" }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Preview</h3>
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              className="flex items-center justify-center min-h-[300px] shadow-inner"
            >
              <div className="text-2xl font-bold tracking-tight text-white">Ready for S</div>
            </div>
          </div>
        );

      case "tests":
        return (
          <div style={{ padding: "10px" }} className="animate-in fade-in duration-500">
            <h3 style={{ marginBottom: "8px" }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Test Results</h3>
            <ul className="space-y-4 py-4">
              {[
                "Component renders without crashing",
                "Displays correct text",
                "No runtime errors detected"
              ].map((test, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300 group">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  </div>
                  ✓ {test}
                </li>
              ))}
            </ul>
          </div>
        );
    }
  };

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
      setProject(p => ({ ...p, terminalLogs: [...p.terminalLogs, `[AGENT] ${task.label} operational...`] }));
      
      switch (task.type) {
        case 'manager':
          const analysis = await getComplexityAnalysis(project.userPrompt, project.personality);
          const srs = await getManagerResponse(project.userPrompt, project.personality);
          const types: AgentType[] = ['planner', 'designer', 'coder'];
          const newQueue: AgentTask[] = types.map((type, idx) => ({
            id: `${type}-${Date.now()}-${idx}`,
            type: type,
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
        terminalLogs: [...p.terminalLogs, `[FAULT] Neural mismatch in ${task.label}: ${err}`] 
      }));
    } finally {
      isExecutingRef.current = false;
    }
  }, [project]);

  useEffect(() => {
    if (project.status === 'busy') processQueue();
  }, [project.status, project.agentQueue, processQueue]);

  const initSynthesis = () => {
    if (!input.trim()) return;
    setProject(p => ({
      ...p,
      userPrompt: input,
      status: 'busy',
      terminalLogs: [...p.terminalLogs, `[SYSTEM] Vector analysis initiated: "${input}"`],
      agentQueue: [{ id: 'init', type: 'manager', label: 'ANALYZE_VECTOR', priority: 0, status: 'active' }]
    }));
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#02040a] text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* HEADER */}
      <header className="h-16 border-b border-slate-800/60 flex items-center justify-between px-10 bg-slate-950/40 backdrop-blur-3xl z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/20">
              <Zap size={18} className="text-black" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[14px] font-black tracking-[0.35em] uppercase text-white">Agentic Studio</h1>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Neural IDE · Competitive Logic</span>
            </div>
          </div>
          <div className="h-5 w-px bg-slate-800/80 mx-2" />
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">All systems nominal</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-inner group hover:bg-emerald-500/10 transition-all cursor-default">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Competitive logic enabled</span>
          </div>
          <div className="flex items-center gap-5 border-l border-slate-800/80 pl-8">
             <button className="text-slate-500 hover:text-white transition-colors"><Settings2 size={18} /></button>
             <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">ASP</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL */}
        <aside className={`transition-all duration-500 ease-in-out flex flex-col bg-slate-950/20 border-r border-slate-800/60 overflow-hidden ${isLeftCollapsed ? 'w-[72px]' : 'w-[24rem] p-8'}`}>
          <div className={`${isLeftCollapsed ? 'p-4' : ''}`}>
            <PanelHeader 
              title="Neural Pipeline" 
              icon={BrainCircuit} 
              badge={`${project.agentQueue.length} Active`} 
              isCollapsed={isLeftCollapsed}
              onToggle={() => setIsLeftCollapsed(!isLeftCollapsed)}
            />
          </div>
          
          <div className={`space-y-4 overflow-y-auto scrollbar-hide flex-1 ${isLeftCollapsed ? 'px-4' : 'px-2'}`}>
            <TelemetryCard label="Neural Load" value={`${project.resources.cpu.toFixed(1)}%`} color="emerald" icon={Cpu} isCollapsed={isLeftCollapsed} />
            <TelemetryCard label="Swarm Capacity" value="98.2%" color="blue" icon={Layers} isCollapsed={isLeftCollapsed} />
            <TelemetryCard label="Logic Vectors" value="1.04k" color="purple" icon={Binary} isCollapsed={isLeftCollapsed} />
            
            {!isLeftCollapsed && (
              <div className="pt-6 animate-in fade-in duration-700">
                <details className="group" open>
                  <summary className="flex items-center justify-between cursor-pointer list-none py-4 border-t border-slate-800/40">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={14} className="text-slate-600 group-open:text-emerald-400 transition-colors" />
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-slate-300">Neural Directives</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-700 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="pb-4 space-y-4">
                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl relative overflow-hidden">
                      <p className="text-[11px] text-emerald-300/60 leading-relaxed font-mono italic">
                        "Synthesis is deterministic. Complexity bounds must stay within O(N log N)."
                      </p>
                    </div>
                  </div>
                </details>

                <div className="pt-4">
                  <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-800/40" /> Vector Queue <div className="h-px flex-1 bg-slate-800/40" />
                  </div>
                  {project.agentQueue.length > 0 ? project.agentQueue.map((task) => (
                    <div key={task.id} className={`p-5 rounded-2xl border transition-all mb-4 ${
                      task.status === 'active' 
                        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-2xl shadow-emerald-500/5' 
                        : 'bg-slate-900/40 border-slate-800/40 opacity-40 grayscale'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          {task.label}
                        </span>
                        {task.status === 'active' && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/30 rounded-3xl opacity-20 space-y-4">
                      <Rocket size={40} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Core Dormant</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER PANEL */}
        <section className="flex-1 flex flex-col bg-slate-950/40 relative min-w-0">
          <div className="h-16 border-b border-slate-800/60 flex items-center px-10 justify-between bg-slate-950/20 backdrop-blur-xl shrink-0">
            
            {/* --- REQUESTED TABS BLOCK --- */}
            <div className="tabs">
              <button
                className={`tab px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "code" ? "active bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTab("code")}
              >
                Code
              </button>

              <button
                className={`tab px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "preview" ? "active bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTab("preview")}
              >
                Preview
              </button>

              <button
                className={`tab px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "tests" ? "active bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTab("tests")}
              >
                Tests
              </button>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 shadow-inner">
                <FileText size={13} className="text-blue-400/60" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.currentFile || "App.tsx"}</span>
              </div>
            </div>
          </div>

          {/* --- REQUESTED PANEL BODY --- */}
          <div className="panel-body flex-1 relative overflow-hidden group bg-slate-950/40 overflow-y-auto scrollbar-hide">
            {project.status === 'busy' && (
              <div className="absolute inset-0 bg-emerald-500/[0.015] pointer-events-none z-10 scanner-active" />
            )}
            {renderTabContent()}
          </div>

          {/* Neural Prompt Field */}
          <div className="p-4 sm:p-10 bg-slate-950/80 border-t border-slate-800/60 backdrop-blur-3xl shrink-0">
            <div className="max-w-4xl mx-auto flex items-center gap-4 sm:gap-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-2 sm:p-3 pr-4 sm:pr-5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] focus-within:border-emerald-500/40 transition-all">
               <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), initSynthesis())}
                placeholder="Declare synthesis intent..." 
                className="flex-1 bg-transparent border-none px-4 sm:px-6 py-3 sm:py-4 text-[13px] sm:text-[14px] text-slate-200 resize-none outline-none font-mono min-h-[40px] max-h-[150px] scrollbar-hide"
              />
              <button 
                onClick={initSynthesis}
                disabled={project.status === 'busy' || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90 disabled:opacity-20 disabled:grayscale shrink-0"
              >
                <FastForward size={24} className="sm:w-7 sm:h-7" fill="currentColor" />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <aside className={`transition-all duration-500 ease-in-out flex flex-col bg-slate-950/20 border-l border-slate-800/60 overflow-hidden ${isRightCollapsed ? 'w-[72px]' : 'w-[22rem] p-8'}`}>
          <div className={`${isRightCollapsed ? 'p-4' : ''}`}>
            <PanelHeader 
              title="Neural Logs" 
              icon={Terminal} 
              badge="Streaming" 
              isCollapsed={isRightCollapsed}
              onToggle={() => setIsRightCollapsed(!isRightCollapsed)}
            />
          </div>

          <div 
            className={`flex-1 overflow-y-auto space-y-4 pb-8 pr-2 scrollbar-hide font-mono text-[10px] leading-relaxed relative ${isRightCollapsed ? 'opacity-20 pointer-events-none px-4' : 'px-2'}`}
          >
            {project.terminalLogs.map((log, i) => {
              const tagMatch = log.match(/\[(.*?)\]/);
              const tag = tagMatch ? tagMatch[1] : "INFO";
              const tagColor = {
                KERNEL: "text-blue-400",
                TELEMETRY: "text-emerald-400",
                MODE: "text-amber-400",
                AGENT: "text-purple-400",
                FAULT: "text-red-400",
                SYSTEM: "text-slate-400"
              }[tag] || "text-slate-500";

              return (
                <div 
                  key={i} 
                  className={`log-entry flex gap-3.5 group animate-in slide-in-from-right-1 duration-300 p-2 rounded-lg transition-all border ${highlightedLogIndex === i ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02] highlight-active' : 'border-transparent'}`}
                >
                  <span className={`${tagColor} font-black opacity-80 whitespace-nowrap`}>[{tag}]</span>
                  <span className="text-slate-500 group-hover:text-slate-300 transition-colors break-words">{log.replace(/\[.*?\]/, '').trim()}</span>
                </div>
              );
            })}
          </div>

          {!isRightCollapsed && (
            <div className="pt-8 border-t border-slate-800/40 animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Virtual VFS</h3>
                <Plus size={14} className="text-slate-700 hover:text-white cursor-pointer transition-colors" />
              </div>
              <div className="space-y-2.5">
                {Object.keys(project.fileSystem).map(f => (
                  <button 
                    key={f}
                    onClick={() => setProject(p => ({ ...p, currentFile: f }))}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${
                      project.currentFile === f 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-xl' 
                        : 'bg-slate-900/40 border-slate-800/40 text-slate-600 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-[11px] font-bold">
                      <FileText size={15} className={project.currentFile === f ? 'text-emerald-400' : 'text-slate-700'} />
                      {f}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* FOOTER */}
      <footer className="h-10 border-t border-slate-800/60 bg-[#02040a] flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 shrink-0">
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500/40" />
            <span className="hidden xs:inline">VFS: 1.44 MB</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
            <span className="hidden xs:inline">Sync: 0.9999</span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <BrainCircuit size={12} className="opacity-40" />
            <span className="hidden sm:inline">Core: <span className="text-slate-400 font-bold tracking-normal">G3-Pro-Competitive</span></span>
          </div>
          <div className="h-4 w-px bg-slate-800/80" />
          <span className="text-emerald-500/40">PRO BUILD v3.0.42</span>
        </div>
      </footer>
    </div>
  );
}
