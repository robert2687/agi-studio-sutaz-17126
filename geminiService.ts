
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DesignSystem, PersonalityProfile, MemorySummary, NeuralError } from "./types";

const getAI = () => new GoogleGenAI( { apiKey: process.env.API_KEY || "" } );

const PRO_MODEL = 'gemini-1.5-pro';
const FLASH_MODEL = 'gemini-1.5-flash';
const MAX_THINKING = 32768;

const getPersonalityInstruction = ( p: PersonalityProfile ) =>
{
  switch ( p )
  {
    case 'Minimalist': return "Be concise. Use single-responsibility components. Zero dependencies unless critical.";
    case 'Enterprise': return "Standardize everything. Robust types, error boundaries, and detailed documentation.";
    case 'Playful': return "Vibrant, interactive, and creative UI patterns. Surprising micro-interactions.";
    case 'Experimental': return "Bleeding-edge React 19 features, unconventional CSS patterns, and bold UX.";
    case 'Competitive': return `MISSION: High-performance algorithmic synthesis.
    STRATEGY: O(N log N) or better. Formalize constraints first.
    CODE: Production-grade, type-safe, and zero bloat.
    WORKFLOW: Analyze -> Plan -> Execute -> Formal Verification.`;
    default: return "";
  }
};

export const getPatcherResponse = async (
  error: NeuralError,
  fileContent: string,
  design: DesignSystem,
  personality: PersonalityProfile
): Promise<string> =>
{
  const ai = getAI();
  const prompt = `ROLE: Neural Patcher.
  TASK: Perform a self-healing operation on the provided file content.
  FAULT: ${ error.message }
  FILE: ${ error.file }
  CONTENT: ${ fileContent }
  DESIGN_SYSTEM: ${ JSON.stringify( design ) }
  STYLE: ${ getPersonalityInstruction( personality ) }

  OBJECTIVE: Resolve the fault while maintaining strict design compliance and architectural integrity.
  Respond ONLY with the corrected code. No markdown.`;

  const response = await ai.models.generateContent( { model: PRO_MODEL, contents: [ prompt ] } );
  return response.text || fileContent;
};

export const validateSynthesis = async (
  fileSystem: Record<string, string>,
  plan: any
): Promise<{ valid: boolean; errors: string[] }> =>
{
  const ai = getAI();
  const options = {
    model: FLASH_MODEL,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          valid: { type: Type.BOOLEAN },
          errors: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [ "valid", "errors" ]
      }
    }
  };

  const prompt = `ROLE: Formal Validator.
    TASK: Verify structural integrity and plan alignment for the virtual file system.
    FILES: ${ Object.keys( fileSystem ).join( ', ' ) }
    PLAN: ${ JSON.stringify( plan ) }

    Check for:
    1. Missing exports/imports.
    2. Plan deviations.
    3. Structural collisions.`;

  const response = await ai.models.generateContent( { ...options, contents: [ prompt ] } );
  return JSON.parse( response.text || '{"valid": true, "errors": []}' );
};

export const compressMemory = async (
  logs: string[],
  plan: any,
  directives: string[],
  unresolvedIssues: string[],
  personality: PersonalityProfile
): Promise<MemorySummary> =>
{
  const ai = getAI();
  const options = {
    model: PRO_MODEL,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          epoch: { type: Type.NUMBER },
          timestamp: { type: Type.NUMBER },
          immutableDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          architecturalStatus: { type: Type.STRING },
          unresolvedIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
          compressionRatio: { type: Type.STRING },
          keyLearnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          structuralAnchors: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [ "epoch", "timestamp", "immutableDirectives", "architecturalStatus", "unresolvedIssues", "compressionRatio", "keyLearnings", "structuralAnchors" ]
      }
    }
  };

  const prompt = `ROLE: Neural Memory Architect.
    TASK: Perform a high-density lossy compression of the current SharedContext while preserving Architectural DNA.

    LOGS (Last 50): ${ logs.slice( -50 ).join( '\n' ) }
    ARCHITECTURAL_PLAN: ${ JSON.stringify( plan ) }
    IMMUTABLE_DIRECTIVES: ${ directives.join( ', ' ) }
    UNRESOLVED_ISSUES: ${ unresolvedIssues.join( ', ' ) }
    PERSONALITY: ${ personality }

    COMPRESSION PROTOCOL:
    1. NEVER compress Immutable Directives. They are Swarm DNA.
    2. Identify 'Structural Anchors' (the 3-5 most critical files or logic blocks).
    3. Summarize key learnings/decisions that led to the current state.
    4. Provide a high-level 'Architectural Status' string (max 200 chars).
    5. Calculate an Estimated Compression Ratio (e.g. "8.4x").`;

  const response = await ai.models.generateContent( { ...options, contents: [ prompt ] } );
  return JSON.parse( response.text || "{}" );
};

export const rehydrateFocus = async (
  summary: MemorySummary,
  personality: PersonalityProfile
): Promise<string> =>
{
  const ai = getAI();
  const prompt = `ROLE: Context Aligner.
    TASK: Convert a Memory Epoch Summary into a set of 'Focus Directives' for a coding agent.
    SUMMARY: ${ JSON.stringify( summary ) }
    PERSONALITY: ${ personality }

    OBJECTIVE: Remind the agent of the architectural intent and design constraints captured in this epoch.
    Be authoritative and precise. Ensure they don't drift from the primary mission.`;

  const response = await ai.models.generateContent( { model: PRO_MODEL, contents: [ prompt ] } );
  return response.text || "Maintain architectural alignment with defined intent.";
};

export const getCopilotEdit = async (
  instruction: string,
  selection: string,
  fullFile: string,
  design: DesignSystem,
  personality: PersonalityProfile,
  onChunk: ( text: string ) => void
) =>
{
  const ai = getAI();
  const prompt = `ROLE: Neural Copilot. PERSONALITY: ${ personality }.

  TASK: ${ instruction }
  SELECTION: ${ selection || "Full context provided." }
  FILE_CONTENT: ${ fullFile }
  DESIGN_SYSTEM: ${ JSON.stringify( design ) }

  Respond ONLY with raw code. No markdown. No comments outside the code.`;

  const result = await ai.models.generateContentStream( { model: PRO_MODEL, contents: [ prompt ] } );
  let content = "";
  for await ( const chunk of result )
  {
    const text = chunk.text;
    if ( text )
    {
      content += text;
      onChunk( content );
    }
  }
  return content;
};

export const getComplexityAnalysis = async ( prompt: string, personality: PersonalityProfile ) =>
{
  const ai = getAI();
  const response = await ai.models.generateContent( {
    model: PRO_MODEL,
    contents: [ `Analyze complexity for prompt: "${ prompt }". Personality: ${ personality }.` ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Complexity score 1-10" },
          intent: { type: Type.STRING, enum: [ "new", "modification", "fix" ] },
          reasoning: { type: Type.STRING },
          suggestedSequence: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [ "score", "intent", "reasoning", "suggestedSequence" ]
      }
    }
  } );

  return JSON.parse( response.text || "{}" );
};

export const getManagerResponse = async ( prompt: string, personality: PersonalityProfile ) =>
{
  const ai = getAI();
  const response = await ai.models.generateContent( {
    model: PRO_MODEL,
    contents: [ `ROLE: Manager. SRS Generation for: "${ prompt }". Tuning: ${ getPersonalityInstruction( personality ) }` ]
  } );
  return response.text || "";
};

export const getPlannerResponse = async ( srs: string, personality: PersonalityProfile ) =>
{
  const ai = getAI();
  const response = await ai.models.generateContent( {
    model: PRO_MODEL,
    contents: [ `Decompose SRS into architectural plan. SRS: ${ srs }. Personality: ${ personality }.` ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          features: { type: Type.ARRAY, items: { type: Type.STRING } },
          files: { type: Type.ARRAY, items: { type: Type.STRING } },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          algorithmicPlan: { type: Type.STRING }
        },
        required: [ "features", "files", "dependencies", "algorithmicPlan" ]
      }
    }
  } );

  return JSON.parse( response.text || "{}" );
};

export const getDesignerResponse = async ( prompt: string, features: string[], personality: PersonalityProfile ): Promise<DesignSystem> =>
{
  const ai = getAI();
  const response = await ai.models.generateContent( {
    model: PRO_MODEL,
    contents: [ `Generate DesignSystem. Prompt: ${ prompt }. Features: ${ features.join( ', ' ) }. Mode: ${ personality }.` ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metadata: {
            type: Type.OBJECT,
            properties: {
              appName: { type: Type.STRING },
              styleVibe: { type: Type.STRING }
            },
            required: [ "appName", "styleVibe" ]
          },
          colors: {
            type: Type.OBJECT,
            properties: {
              background: { type: Type.STRING },
              foreground: { type: Type.STRING },
              primary: { type: Type.STRING },
              primaryForeground: { type: Type.STRING },
              secondary: { type: Type.STRING },
              accent: { type: Type.STRING },
              muted: { type: Type.STRING },
              border: { type: Type.STRING }
            },
            required: [ "background", "foreground", "primary", "primaryForeground", "secondary", "accent", "muted", "border" ]
          },
          layout: {
            type: Type.OBJECT,
            properties: {
              radius: { type: Type.STRING },
              spacing: { type: Type.STRING },
              container: { type: Type.STRING }
            },
            required: [ "radius", "spacing", "container" ]
          },
          typography: {
            type: Type.OBJECT,
            properties: {
              fontSans: { type: Type.STRING },
              h1: { type: Type.STRING },
              h2: { type: Type.STRING },
              body: { type: Type.STRING }
            },
            required: [ "fontSans", "h1", "h2", "body" ]
          }
        },
        required: [ "metadata", "colors", "layout", "typography" ]
      }
    }
  } );

  return JSON.parse( response.text || "{}" );
};

export const getCoderStreamResponse = async (
  fileName: string,
  plan: any,
  design: DesignSystem,
  fileSystem: Record<string, string>,
  personality: PersonalityProfile,
  onChunk: ( content: string ) => void,
  isPaused: () => boolean,
  contextOverride?: string
) =>
{
  const ai = getAI();
  const prompt = `Synthesize FILE: ${ fileName }.
  CONTEXT_OVERRIDE: ${ contextOverride || "None." }
  PLAN: ${ JSON.stringify( plan ) }
  DESIGN: ${ JSON.stringify( design ) }
  VFS: ${ Object.keys( fileSystem ).join( ', ' ) }
  STYLE: ${ getPersonalityInstruction( personality ) }

  REQUIREMENT: Output ONLY code. No markdown code blocks.`;

  const result = await ai.models.generateContentStream( { model: PRO_MODEL, contents: [ prompt ] } );

  let fullText = "";
  for await ( const chunk of result )
  {
    if ( isPaused() ) break;
    const text = chunk.text;
    if ( text )
    {
      fullText += text;
      onChunk( fullText );
    }
  }
  return fullText;
};

export const getErrorAnalysis = async ( error: string, file: string, content: string, p: PersonalityProfile ) =>
{
  const ai = getAI();
  const response = await ai.models.generateContent( {
    model: PRO_MODEL,
    contents: [ `FAULT DETECTED: ${ error }. FILE: ${ file }. CONTENT: ${ content.slice( 0, 3000 ) }. MODE: ${ p }. Analyze and propose repair.` ],
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
                impact: { type: Type.STRING },
                risk: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: [ "label", "description", "impact", "risk", "confidence" ]
            }
          }
        },
        required: [ "reasoning", "strategies" ]
      }
    }
  } );

  return JSON.parse( response.text || "{}" );
};
