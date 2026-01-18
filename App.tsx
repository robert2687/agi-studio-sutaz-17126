
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Cpu, Zap, ShieldCheck, Loader2, 
  Terminal, Binary, Code2, Microscope, Plus, 
  CheckCircle2, FastForward, 
  ChevronDown, Settings2, Eye, FileText,
  Rocket, Layers, BrainCircuit, Maximize2, Minimize2,
  LayoutGrid, Database, Activity, History, Trash2, ArrowDownCircle, RefreshCw, Anchor,
  GripVertical, Moon, Sun, Monitor, Play, Shield,
  ExternalLink, Code, Search, AlertTriangle, LifeBuoy
} from 'lucide-react';
import { 
  ProjectState, AgentTask, AgentType, MemorySummary, ThemeMode, 
  ResourceMetrics, LayoutConfig, DesignSystem, NeuralError 
} from './types';
import { 
  getManagerResponse, getPlannerResponse, getDesignerResponse, 
  getCoderStreamResponse, getComplexityAnalysis, getPatcherResponse, validateSynthesis 
} from './geminiService';
import { useTheme } from './ThemeContext';
import { useLayout } from './LayoutContext';

const STORAGE_KEY = 'agentic_studio_pro_v5_live';

// --- Shared Internal Components ---

const ResizeHandle: React.FC<{ panelId: string }> = ({ panelId }) => {
  const { updateWidth } = useLayout();
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const delta = (e.movementX / window.innerWidth) * 100;
      updateWidth(panelId, delta);
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, panelId, updateWidth]);

  return (
    <div 
      onMouseDown={onMouseDown}
      className={`w-1 h-full cursor-col-resize hover:bg-emerald-500/40 transition-colors flex items-center justify-center group shrink-0 ${isDragging ? 'bg-emerald-500/50' : ''}`}
    >
      <div className="w-px h-12 bg-slate-800 group-hover:bg-emerald-400/50 transition-colors" />
    </div>
  );
};

// --- Primary IDE Interface ---

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { config, toggleCollapse, reorderPanels } = useLayout();
  const isDark = theme === 'dark';

  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      userPrompt: "", personality: "Competitive", 
      complexity: { score: 1, intent: 'new', reasoning: "" },
      fileSystem: { "App.tsx": "// Neural interface initialized. Ready for synthesis." },
      semanticChanges: [], neuralErrors: [], designCompliance: {}, agentQueue: [], swarmPaused: false,
      terminalLogs: ["[KERNEL] System operational.", "[TELEMETRY] Neural load stabilized.", "[MODE] Competitive logic enabled."],
      status: "ready", currentFile: "App.tsx", activeTab: 'code', 
      resources: { cpu: 12.4, memory: 4.2, vfsSize: 0.8, vfsHealth: 100, entropy: 0.02, processes: [] },
      history: [], selectedHistoryId: null, activeReview: null, activeTestSuite: null, activeCleanup: null,
      onboarding: { isActive: true, step: 0, hasSeenIntro: false }, 
      memorySummaries: [], activeMemoryEpoch: null,
      immutableDirectives: ["Must be browser-native", "Tailwind CSS only", "Strict TypeScript"], 
      testCases: [], theme: "dark", layout: config
    };
  });

  const [input, setInput] = useState("");
  const isExecutingRef = useRef(false);
  const [activeSurfaceTab, setActiveSurfaceTab] = useState<"code" | "preview" | "tests">("code");
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  // --- Swarm Orchestration Logic ---

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
      setProject(p => ({ ...p, terminalLogs: [...p.terminalLogs, `[AGENT] ${task.label} active...`] }));
      
      switch (task.type) {
        case 'manager': {
          const analysis = await getComplexityAnalysis(project.userPrompt, project.personality);
          const srs = await getManagerResponse(project.userPrompt, project.personality);
          const types: AgentType[] = ['planner', 'designer', 'coder', 'validator'];
          const newQueue: AgentTask[] = types.map((type, idx) => ({
            id: `${type}-${Date.now()}-${idx}`,
            type: type, label: type.toUpperCase(), priority: idx, status: idx === 0 ? 'active' : 'pending'
          }));
          setProject(p => ({ ...p, complexity: analysis, srs, agentQueue: newQueue }));
          break;
        }
        case 'planner': {
          const plan = await getPlannerResponse(project.srs!, project.personality);
          setProject(p => ({ ...p, plan, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          break;
        }
        case 'designer': {
          const design = await getDesignerResponse(project.userPrompt, project.plan?.features || [], project.personality);
          setProject(p => ({ ...p, designSystem: design, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          break;
        }
        case 'coder': {
          const files = project.plan?.files || ["App.tsx"];
          for (const file of files) {
            setProject(p => ({ ...p, currentFile: file }));
            await getCoderStreamResponse(
              file, project.plan, project.designSystem!, project.fileSystem, project.personality,
              (content) => setProject(p => ({ ...p, fileSystem: { ...p.fileSystem, [file]: content } })),
              () => project.swarmPaused, task.contextOverride
            );
          }
          setProject(p => ({ ...p, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          break;
        }
        case 'validator': {
          const validation = await validateSynthesis(project.fileSystem, project.plan);
          if (!validation.valid) {
            const newErrors: NeuralError[] = validation.errors.map(err => ({
              id: `err-${Date.now()}`, agent: 'validator', type: 'logic', file: 'System', message: err, timestamp: Date.now(), severity: 'error', chatHistory: []
            }));
            const patchTasks: AgentTask[] = validation.errors.map((_, i) => ({
              id: `patch-${Date.now()}-${i}`, type: 'patcher', label: 'SELF_HEAL_PATCH', priority: -1, status: 'pending'
            }));
            setProject(p => ({ 
              ...p, 
              neuralErrors: [...p.neuralErrors, ...newErrors],
              agentQueue: [...patchTasks, ...p.agentQueue.filter(t => t.id !== task.id)],
              terminalLogs: [...p.terminalLogs, `[FAULT] Validation failed. Injecting ${patchTasks.length} patcher(s).`]
            }));
          } else {
            setProject(p => ({ ...p, terminalLogs: [...p.terminalLogs, `[SYSTEM] Formal verification PASSED.`], agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          }
          break;
        }
        case 'patcher': {
          const activeError = project.neuralErrors.find(e => e.severity === 'error');
          if (activeError) {
            const targetFile = activeError.file === 'System' ? 'App.tsx' : activeError.file;
            const patchedCode = await getPatcherResponse(activeError, project.fileSystem[targetFile] || "", project.designSystem!, project.personality);
            setProject(p => ({ 
              ...p, 
              fileSystem: { ...p.fileSystem, [targetFile]: patchedCode },
              neuralErrors: p.neuralErrors.filter(e => e.id !== activeError.id),
              agentQueue: p.agentQueue.filter(t => t.id !== task.id),
              terminalLogs: [...p.terminalLogs, `[PATCH] Self-healing cycle completed for ${targetFile}.`]
            }));
          } else {
            setProject(p => ({ ...p, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
          }
          break;
        }
        default:
          setProject(p => ({ ...p, agentQueue: p.agentQueue.filter(t => t.id !== task.id) }));
      }
    } catch (err: any) {
      setProject(p => ({ 
        ...p, status: 'error', 
        terminalLogs: [...p.terminalLogs, `[FAULT] Swarm mismatch in ${task.label}: ${err.message || err}`] 
      }));
    } finally {
      isExecutingRef.current = false;
    }
  }, [project]);

  useEffect(() => {
    if (project.status === 'busy' || project.agentQueue.length > 0) processQueue();
  }, [project.status, project.agentQueue, processQueue]);

  const initSynthesis = () => {
    if (!input.trim() || project.status === 'busy') return;
    setProject(p => ({
      ...p, userPrompt: input, status: 'busy',
      terminalLogs: [...p.terminalLogs, `[SYSTEM] Vector analysis initiated: "${input}"`],
      agentQueue: [{ id: 'init', type: 'manager', label: 'ANALYZE_VECTOR', priority: 0, status: 'active' }]
    }));
    setInput("");
  };

  const handleDragStart = (id: string) => setDraggedPanelId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedPanelId && draggedPanelId !== targetId) {
      reorderPanels(draggedPanelId, targetId);
    }
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#02040a] text-slate-100' : 'bg-[#f1f5f9] text-slate-900'}`}>
      
      {/* HEADER ORCHESTRATION */}
      <header className={`h-16 border-b flex items-center justify-between px-10 backdrop-blur-3xl z-50 shrink-0 ${isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-white/70 border-slate-200'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/20">
              <Zap size={20} className="text-black" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <h1 className={`text-[15px] font-black tracking-[0.35em] uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>Agentic Studio</h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Neural IDE · Hybrid Swarm</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800/30 mx-2" />
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300' : 'bg-slate-100 border-slate-200 text-blue-600 hover:text-blue-500'}`}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all cursor-default ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Competitive Engine</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-lg">ASP</div>
        </div>
      </header>

      {/* DYNAMIC PANEL MAPPING */}
      <main className="flex-1 flex overflow-hidden relative flex-col lg:flex-row">
        {config.order.map((panelId, index) => (
          <React.Fragment key={panelId}>
            <div 
              draggable 
              onDragStart={() => handleDragStart(panelId)}
              onDragOver={(e) => handleDragOver(e, panelId)}
              style={{ width: config.collapsed[panelId] ? '80px' : `${config.widths[panelId]}%` }}
              className={`flex-shrink-0 flex flex-col transition-all duration-500 relative border-r overflow-hidden ${isDark ? 'bg-slate-950/20 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}
              id={`${panelId}-panel`}
            >
              {panelId === 'pipeline' && <PipelinePanel project={project} isCollapsed={config.collapsed.pipeline} onToggle={() => toggleCollapse('pipeline')} />}
              {panelId === 'surface' && <SurfacePanel project={project} activeTab={activeSurfaceTab} setActiveTab={setActiveSurfaceTab} isCollapsed={config.collapsed.surface} onToggle={() => toggleCollapse('surface')} />}
              {panelId === 'logs' && <LogsPanel project={project} isCollapsed={config.collapsed.logs} onToggle={() => toggleCollapse('logs')} />}
            </div>
            {index < config.order.length - 1 && !config.collapsed[panelId] && <ResizeHandle panelId={panelId} />}
          </React.Fragment>
        ))}
      </main>

      {/* SYNTHESIS INPUT AREA */}
      <div className={`p-8 border-t backdrop-blur-3xl shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800/60' : 'bg-white border-slate-200'}`}>
        <div className={`max-w-5xl mx-auto flex items-center gap-4 border rounded-[2.5rem] p-2.5 pr-5 shadow-2xl transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 focus-within:border-emerald-500/40' : 'bg-slate-50 border-slate-200 focus-within:border-blue-500/40'}`}>
           <textarea 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), initSynthesis())}
            placeholder="Synthesize neural intent (e.g., 'Build a high-performance dashboard with streaming charts')" 
            className={`flex-1 bg-transparent border-none px-6 py-4 text-[14px] resize-none outline-none font-mono min-h-[50px] max-h-[150px] scrollbar-hide ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
          />
          <button 
            onClick={initSynthesis}
            disabled={project.status === 'busy' || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all active:scale-95 disabled:opacity-20 group"
          >
            <FastForward size={24} className="group-hover:translate-x-0.5 transition-transform" fill="currentColor" />
          </button>
        </div>
      </div>

      {/* SYSTEM STATUS FOOTER */}
      <footer className={`h-11 border-t flex items-center justify-between px-10 text-[10px] font-black uppercase tracking-[0.35em] shrink-0 ${isDark ? 'bg-[#02040a] border-slate-800/60 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${project.status === 'error' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`} />
            <span>VFS: {project.resources.vfsSize} MB</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${project.agentQueue.some(t => t.type === 'patcher') ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>Neural Sync Locked</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <BrainCircuit size={14} className="opacity-40" />
          <span className="text-emerald-500/40">v5.2.0-HYBRID-PRODUCTION</span>
        </div>
      </footer>
    </div>
  );
}

// --- Specific Panel Implementation ---

const PipelinePanel: React.FC<{ project: ProjectState; isCollapsed: boolean; onToggle: () => void }> = ({ project, isCollapsed, onToggle }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-7">
        <PanelHeader title="Pipeline" icon={Layers} isCollapsed={isCollapsed} onToggle={onToggle} />
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-7 space-y-7 scrollbar-hide">
          <TelemetryCard label="Neural Load" value={`${project.resources.cpu}%`} color="emerald" icon={Cpu} isCollapsed={false} />
          <TelemetryCard label="VFS Health" value={`${project.resources.vfsHealth}%`} color={project.resources.vfsHealth < 80 ? "amber" : "blue"} icon={LifeBuoy} isCollapsed={false} />
          <TelemetryCard label="Entropy" value={`${project.resources.entropy.toFixed(3)}`} color="purple" icon={Activity} isCollapsed={false} />
          
          <div className="pt-4 pb-10">
             <div className="flex items-center justify-between mb-5">
               <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Agent Queue</h3>
               {project.neuralErrors.length > 0 && (
                 <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 animate-pulse">
                   <AlertTriangle size={10} className="text-red-500" />
                   <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Self-Heal Active</span>
                 </div>
               )}
             </div>
             {project.agentQueue.length === 0 ? (
               <div className="p-8 border-2 border-dashed border-slate-800/40 rounded-3xl text-center">
                 <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Idle State</span>
               </div>
             ) : (
               project.agentQueue.map(task => (
                 <div key={task.id} className={`p-5 rounded-2xl border mb-4 transition-all duration-500 ${task.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-slate-900/40 border-slate-800/40 opacity-40 grayscale'}`}>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${task.status === 'active' ? 'bg-emerald-500/20' : task.type === 'patcher' ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
                          {task.type === 'patcher' ? <LifeBuoy size={12} className="text-amber-400" /> : <Rocket size={12} className={task.status === 'active' ? 'text-emerald-400' : 'text-slate-600'} />}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{task.label}</span>
                     </div>
                     {task.status === 'active' && <Loader2 size={14} className="animate-spin text-emerald-500" />}
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>
      )}
    </div>
  );
};

const SurfacePanel: React.FC<{ project: ProjectState; activeTab: string; setActiveTab: any; isCollapsed: boolean; onToggle: () => void }> = ({ project, activeTab, setActiveTab, isCollapsed, onToggle }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const renderTabContent = () => {
    switch (activeTab) {
      case "code":
        return (
          <div className="h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex-1 overflow-auto p-10 font-mono text-[14px] leading-relaxed selection:bg-emerald-500/20">
              <pre className={isDark ? 'text-emerald-400/90' : 'text-slate-800'}>
                <code>{project.currentFile ? project.fileSystem[project.currentFile] : "// Neural interface ready. Input intent below."}</code>
              </pre>
            </div>
          </div>
        );
      case "preview":
        return (
          <div className="h-full flex items-center justify-center bg-black/5 animate-in slide-in-from-bottom-2 duration-600">
            <div className={`p-16 border rounded-[3rem] text-center space-y-6 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-2xl'}`}>
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                <Monitor size={40} className="text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-black uppercase tracking-[0.2em]">Synthesis Engine</div>
                <p className="text-xs text-slate-500 font-mono mt-2 tracking-widest uppercase">Real-time render virtualization active</p>
              </div>
            </div>
          </div>
        );
      case "tests":
        return (
          <div className="h-full p-12 space-y-8 animate-in fade-in duration-700">
             <div className="flex items-center justify-between border-b border-slate-800/60 pb-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Formal Verification Layer</h3>
                <span className={`text-[10px] font-mono ${project.neuralErrors.length > 0 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-400 bg-emerald-400/10'} px-3 py-1 rounded-full uppercase`}>
                  {project.neuralErrors.length > 0 ? 'Alignment Warning' : 'All Engines Green'}
                </span>
             </div>
             {project.neuralErrors.length > 0 ? (
               project.neuralErrors.map(err => (
                 <div key={err.id} className="p-7 border border-red-500/20 bg-red-500/5 rounded-[2rem] space-y-3">
                   <div className="flex items-center gap-3">
                     <AlertTriangle size={16} className="text-red-500" />
                     <span className="text-[13px] font-bold uppercase tracking-tight">{err.type} Fault Detected</span>
                   </div>
                   <p className="text-[11px] font-mono text-slate-400 leading-relaxed">{err.message}</p>
                 </div>
               ))
             ) : (
               [1, 2, 3].map(i => (
                 <div key={i} className={`p-7 border rounded-[2rem] flex items-center justify-between transition-all hover:scale-[1.01] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
                   <div className="flex items-center gap-5">
                     <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[13px] font-bold">Neural Alignment Vector {i}</span>
                       <span className="text-[10px] text-slate-500 font-mono">Structural integrity verified.</span>
                     </div>
                   </div>
                   <span className="text-[11px] font-black font-mono text-emerald-400 uppercase tracking-widest">Validated</span>
                 </div>
               ))
             )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`h-16 border-b flex items-center px-8 justify-between shrink-0 ${isDark ? 'bg-slate-950/20 border-slate-800/60' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          {["code", "preview", "tests"].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-8 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-5">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">{project.currentFile || "sys.vfs"}</span>
            <button onClick={onToggle} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"><Maximize2 size={14} /></button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden relative">
        {project.status === 'busy' && <div className="absolute inset-0 bg-emerald-500/[0.03] scanner-active z-10 pointer-events-none" />}
        {renderTabContent()}
      </div>
    </div>
  );
};

const LogsPanel: React.FC<{ project: ProjectState; isCollapsed: boolean; onToggle: () => void }> = ({ project, isCollapsed, onToggle }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [project.terminalLogs]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-7 shrink-0">
        <PanelHeader title="Neural Logs" icon={Terminal} isCollapsed={isCollapsed} onToggle={onToggle} />
      </div>
      {!isCollapsed && (
        <div ref={logRef} className="flex-1 overflow-y-auto px-7 space-y-4 pb-12 scrollbar-hide font-mono text-[10px]">
          {project.terminalLogs.map((log, i) => {
             const tag = log.match(/\[(.*?)\]/)?.[1] || "INFO";
             const colorMap: Record<string, string> = {
               KERNEL: "text-blue-400", AGENT: "text-emerald-400", SYSTEM: "text-slate-500", FAULT: "text-red-400", TELEMETRY: "text-purple-400", PATCH: "text-amber-400"
             };
             return (
               <div key={i} className={`flex gap-4 p-3 rounded-2xl border border-transparent hover:bg-slate-800/30 transition-all group ${log.includes('FAULT') ? 'bg-red-500/5 border-red-500/10' : log.includes('PATCH') ? 'bg-amber-500/5 border-amber-500/10' : ''}`}>
                 <span className={`${colorMap[tag] || 'text-emerald-500'} font-black shrink-0 tracking-widest`}>[{tag}]</span>
                 <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} group-hover:text-slate-200 leading-relaxed break-words`}>{log.replace(/\[.*?\]/, '').trim()}</span>
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
};

// --- Atomic UI Helpers ---

const PanelHeader: React.FC<{ title: string; icon: any; isCollapsed: boolean; onToggle: () => void }> = ({ title, icon: Icon, isCollapsed, onToggle }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-4">
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
        <Icon size={16} className="text-emerald-400" />
      </div>
      {!isCollapsed && <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500">{title}</h2>}
    </div>
    <button onClick={onToggle} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300">
      {isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
    </button>
  </div>
);

const TelemetryCard: React.FC<{ label: string; value: string; color: string; icon: any; isCollapsed: boolean }> = ({ label, value, color, icon: Icon, isCollapsed }) => {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400'
  };
  return (
    <div className={`p-5 rounded-[2rem] bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition-all group overflow-hidden ${isCollapsed ? 'p-3' : ''}`}>
      <div className="flex items-center gap-5">
        <div className={`p-3 rounded-2xl bg-slate-950 border border-slate-800 group-hover:border-${color}-500/30 transition-all shadow-inner`}>
          <Icon size={16} className={colorMap[color] || 'text-slate-400'} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">{label}</span>
            <span className={`text-[15px] font-black font-mono mt-0.5 ${colorMap[color] || 'text-slate-400'}`}>{value}</span>
          </div>
        )}
      </div>
    </div>
  );
};
