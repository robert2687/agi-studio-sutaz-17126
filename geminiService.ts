
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DesignSystem, SemanticChange, PersonalityProfile, MemorySummary, ErrorChatMessage } from "./types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPersonalityInstruction = (p: PersonalityProfile) => {
  switch (p) {
    case 'Minimalist': return "Be concise. Use as little code as possible. No fluff. Zen-like clarity. Prefer single-responsibility files.";
    case 'Enterprise': return "Think Enterprise. Scalability is key. Enforce robust patterns (DI, Clean Architecture). Verbose documentation. Safety first.";
    case 'Playful': return "Be delightful. Use micro-interactions. Bright, fun tone. Friendly code comments. Creativity over strict convention.";
    case 'Experimental': return "Be a boundary pusher. Use the latest features. Unconventional layouts. Dark, neon, futuristic vibes. Take architectural risks.";
    default: return "";
  }
};

export const getCopilotEdit = async (
  instruction: string,
  selection: string,
  fullFile: string,
  design: DesignSystem,
  personality: PersonalityProfile,
  onChunk: (text: string) => void
) => {
  const ai = getAI();
  const prompt = `ROLE: Neural Copilot. TUNING: ${personality}.
  
  TASK: Transform or generate code based on this instruction: "${instruction}"
  
  CONTEXT:
  - FILE CONTENT: ${fullFile}
  - CURRENT SELECTION: ${selection || "None (Generate new code)"}
  - DESIGN SYSTEM: ${JSON.stringify(design)}
  
  RULES:
  1. If selection exists, replace it with the corrected/new code.
  2. If no selection, generate the code for the instruction at the current cursor position.
  3. Respond ONLY with the raw code. Do not use markdown blocks (\`\`\`).
  4. Follow the design system strictly.
  5. Adhere to ${personality} coding style.`;

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3-pro-preview",
    contents: prompt,
  });

  let fullContent = "";
  for await (const chunk of responseStream) {
    const text = (chunk as GenerateContentResponse).text;
    if (text) {
      fullContent += text;
      onChunk(fullContent);
    }
  }
  return fullContent;
};

export const getErrorInsight = async (
  errorMsg: string,
  filePath: string,
  fileContent: string,
  question: string,
  history: ErrorChatMessage[],
  personality: PersonalityProfile
): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `ROLE: Neural Debugging Specialist. TUNING: ${personality}.
    
    CONTEXT:
    ERROR: ${errorMsg}
    FILE: ${filePath}
    CONTENT: ${fileContent.slice(0, 3000)}
    
    HISTORY:
    ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
    
    USER QUESTION: ${question}
    
    Provide a deep, expert-level insight focusing on the root cause and architectural implications. Keep it in line with the ${personality} profile.`,
  });
  return response.text || "Neural connection lost. Please retry.";
};

export const getMemoryCompressionResponse = async (
  logs: string[],
  changes: SemanticChange[],
  srs: string,
  errors: string[],
  personality: PersonalityProfile,
  epoch: number
): Promise<MemorySummary> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `ROLE: Neural Memory Optimizer. TUNING: ${personality}.
    Summarize the current project state into a concise MemorySummary for Epoch ${epoch}.
    
    INPUT LOGS: ${logs.join('\n').slice(-5000)}
    SEMANTIC CHANGES: ${JSON.stringify(changes)}
    SYSTEM REQUIREMENTS: ${srs}
    PENDING ERRORS: ${errors.join(', ')}
    
    CRITICAL RULES:
    1. Preserve high-level architectural intent.
    2. Identify unresolved issues that must be addressed.
    3. Identify "Key Learnings" about the codebase.
    4. Provide directives that MUST be carried over to the next epoch.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          immutableDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          architecturalStatus: { type: Type.STRING },
          unresolvedIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
          compressionRatio: { type: Type.STRING },
          keyLearnings: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["immutableDirectives", "architecturalStatus", "unresolvedIssues", "compressionRatio", "keyLearnings"]
      }
    }
  });
  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    epoch,
    timestamp: Date.now()
  };
};

export const getErrorAnalysis = async (
  errorMsg: string,
  filePath: string,
  content: string,
  personality: PersonalityProfile
) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `ROLE: Neural Debugger. TUNING: ${personality}.
    
    ANALYZING ERROR: "${errorMsg}"
    FILE: ${filePath}
    CONTENT (SNIPPET): ${content.slice(0, 2000)}
    
    GOAL:
    1. Break down why this happened in multiple steps of reasoning.
    2. Propose 3 distinct patch strategies with impact, risk scores, and confidence (0-1).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                risk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                codeSnippet: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["label", "description", "impact", "risk", "confidence"]
            }
          }
        },
        required: ["reasoning", "strategies"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getDesignSystemValidation = async (
  filePath: string,
  content: string,
  design: DesignSystem,
  personality: PersonalityProfile
) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `ROLE: Design System Auditor. TUNING: ${personality}.
    ${getPersonalityInstruction(personality)}
    
    Audit ${filePath} against Design System:
    ${JSON.stringify(design)}
    
    CONTENT:
    ${content.slice(0, 3000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          violations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                property: { type: Type.STRING },
                violation: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['warning', 'error'] }
              },
              required: ["property", "violation", "suggestion", "severity"]
            }
          }
        },
        required: ["score", "summary", "violations"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getComplexityAnalysis = async (prompt: string, personality: PersonalityProfile) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze: "${prompt}". TUNING: ${personality}.
    ${getPersonalityInstruction(personality)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          intent: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          suggestedSequence: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "intent", "reasoning", "suggestedSequence"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getManagerResponse = async (prompt: string, personality: PersonalityProfile) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `ROLE: Product Manager. TUNING: ${personality}.
    Generate SRS for: "${prompt}".
    Personality constraints: ${getPersonalityInstruction(personality)}`,
  });
  return response.text || "";
};

export const getPlannerResponse = async (srs: string, personality: PersonalityProfile) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Plan file structure. TUNING: ${personality}.
    SRS: ${srs}. 
    Architectural Style: ${getPersonalityInstruction(personality)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          features: { type: Type.ARRAY, items: { type: Type.STRING } },
          files: { type: Type.ARRAY, items: { type: Type.STRING } },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["features", "files", "dependencies"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
};

export const getDesignerResponse = async (prompt: string, features: string[], personality: PersonalityProfile) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Design theme for: "${prompt}". TUNING: ${personality}.
    Vibe: ${personality}. 
    ${getPersonalityInstruction(personality)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metadata: { type: Type.OBJECT, properties: { appName: { type: Type.STRING }, styleVibe: { type: Type.STRING } } },
          colors: { type: Type.OBJECT, properties: { background: { type: Type.STRING }, foreground: { type: Type.STRING }, primary: { type: Type.STRING }, primaryForeground: { type: Type.STRING }, secondary: { type: Type.STRING }, accent: { type: Type.STRING }, muted: { type: Type.STRING }, border: { type: Type.STRING } } },
          layout: { type: Type.OBJECT, properties: { radius: { type: Type.STRING }, spacing: { type: Type.STRING }, container: { type: Type.STRING } } },
          typography: { type: Type.OBJECT, properties: { fontSans: { type: Type.STRING }, h1: { type: Type.STRING }, h2: { type: Type.STRING }, body: { type: Type.STRING } } },
        },
      },
    },
  });
  return JSON.parse(response.text || "{}");
};

export const getCoderStreamResponse = async (
  filePath: string,
  plan: any,
  design: DesignSystem,
  existingFiles: Record<string, string>,
  personality: PersonalityProfile,
  onChunk: (text: string) => void,
  isPaused: () => boolean
) => {
  const ai = getAI();
  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3-pro-preview",
    contents: `ROLE: Senior Developer. TUNING: ${personality}.
    Implement ${filePath}. 
    Personality constraints: ${getPersonalityInstruction(personality)}
    WRITE ONLY FULL CODE.`,
  });
  let fullContent = "";
  for await (const chunk of responseStream) {
    while (isPaused()) await new Promise(r => setTimeout(r, 500));
    const text = (chunk as GenerateContentResponse).text;
    if (text) { fullContent += text; onChunk(fullContent); }
  }
  return fullContent;
};
