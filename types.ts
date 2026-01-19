
export interface User {
  username: string;
}

export type PersonalityProfile = "Minimalist" | "Enterprise" | "Playful" | "Experimental" | "Competitive";

export interface DesignSystem {
  metadata: {
    appName: string;
    styleVibe: "Modern" | "Corporate" | "Playful" | "Brutalist" | "Minimalist" | "Competitive";
  };
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
  };
  layout: {
    radius: string;
    spacing: string;
    container: string;
  };
  typography: {
    fontSans: string;
    h1: string;
    h2: string;
    body: string;
  };
}

export type AgentType = "manager" | "planner" | "designer" | "architect" | "coder" | "reviewer" | "compiler" | "patcher" | "tester" | "cleanup" | "compressor" | "validator" | "aligner" | "debugger";

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  status: 'pending' | 'passed' | 'failed' | 'running';
}

export interface DebugStrategy {
  label: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  codeSnippet?: string;
  confidence: number;
}

export interface ErrorChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface NeuralError {
  id: string;
  agent: AgentType;
  type: 'syntax' | 'runtime' | 'logic' | 'design';
  file: string;
  message: string;
  timestamp: number;
  severity: 'warning' | 'error' | 'fatal';
  analysis?: {
    reasoning: string[];
    strategies: DebugStrategy[];
  };
  chatHistory: ErrorChatMessage[];
}

export interface SemanticChange {
  id: string;
  filePath: string;
  intent: 'feature' | 'refactor' | 'fix' | 'security' | 'style';
  reasoning: string;
  risk: 'low' | 'medium' | 'high';
  riskReason?: string;
  confidence: number;
  timestamp: number;
  agentType: AgentType;
}

export interface DesignViolation {
  file: string;
  property: string;
  violation: string;
  suggestion: string;
  severity: 'warning' | 'error';
}

export interface DesignComplianceReport {
  score: number;
  violations: DesignViolation[];
  summary: string;
}

export interface MemorySummary {
  epoch: number;
  timestamp: number;
  immutableDirectives: string[];
  architecturalStatus: string;
  unresolvedIssues: string[];
  compressionRatio: string;
  keyLearnings: string[];
  structuralAnchors?: string[]; // New: key files/components that define the architecture
}

export interface AgentTask {
  id: string;
  type: AgentType;
  label: string;
  priority: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  injected?: boolean;
  contextOverride?: string; // New: used to pass memory summaries to the agent
}

export type AgentStatus = "idle" | "busy" | "ready" | "error";

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  vfsSize: number;
  processes: string[];
}

export interface ProjectState {
  userPrompt: string;
  personality: PersonalityProfile;
  complexity: {
    score: number;
    intent: 'new' | 'modification' | 'fix';
    reasoning: string;
  };
  srs?: string;
  plan?: {
    features: string[];
    files: string[];
    dependencies: string[];
    algorithmicPlan?: string;
  };
  designSystem?: DesignSystem;
  fileSystem: Record<string, string>;
  semanticChanges: SemanticChange[];
  neuralErrors: NeuralError[];
  designCompliance: Record<string, DesignComplianceReport>;
  agentQueue: AgentTask[];
  swarmPaused: boolean;
  terminalLogs: string[];
  memorySummaries: MemorySummary[];
  activeMemoryEpoch: number | null; // New: tracks which memory is currently "rehydrated"
  status: AgentStatus;
  currentFile: string | null;
  activeTab: 'code' | 'sandbox' | 'memory' | 'validator' | 'preview' | 'tests';
  resources: ResourceMetrics;
  history: HistorySnapshot[];
  selectedHistoryId: string | null;
  activeReview: ReviewReport | null;
  activeTestSuite: TestSuite | null;
  activeCleanup: CleanupReport | null;
  onboarding: OnboardingState;
  immutableDirectives: string[];
  testCases: TestCase[];
}

export interface ReviewReport {
  id: string;
  timestamp: number;
  overallScore: number;
  scores: { quality: number; a11y: number; performance: number; design: number; };
  comments: { file: string; message: string; severity: string; }[];
}

export interface TestSuite {
  id: string;
  timestamp: number;
  testCount: number;
  passCount: number;
  failCount: number;
  results: { testName: string; passed: boolean; error?: string; }[];
}

export interface CleanupReport {
  id: string;
  timestamp: number;
  bloatReduction: string;
  actions: { type: string; target: string; description: string; impact: string; }[];
  updatedFileSystem: Record<string, string>;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  label: string;
  status: AgentStatus;
  fileSystem: Record<string, string>;
}

export interface OnboardingState {
  isActive: boolean;
  step: number;
  hasSeenIntro: boolean;
}
