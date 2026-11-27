import {
  DailyPulseItem,
  Question,
} from '../types/platform';
import { blobToBase64 } from '../utils/liveAudio';
import { isValidOpenAiKey, loadOpenAiApiKey } from '../utils/storage';

export interface ClientProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter';
  apiKey?: string;
  model?: string;
}

export interface CopilotRequestParams {
  messages: Array<{ role: string; content: string }>;
  context?: {
    view?: string;
    questionTitle?: string;
    questionPrompt?: string;
    trackName?: string;
    concept?: string;
    tableSchemas?: string;
    codeBuffer?: string;
    diagramSummary?: string;
  };
  mode?: string;
  providerConfig?: ClientProviderConfig;
}

export interface MockScorecardPayload {
  score: number;
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';
  summary: string;
  technicalStrengths: string[];
  growthAreas: string[];
  rubricScores: {
    gca: number;
    rrk: number;
    leadership: number;
    googleyness: number;
  };
}

async function postAiJson<T>(url: string, payload?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? 'Server returned an unexpected non-JSON response. Please retry.'
        : `AI service error (HTTP ${res.status}). Please retry.`
    );
  }

  let data: T & { error?: string };
  try {
    data = JSON.parse(rawText || '{}') as T & { error?: string };
  } catch {
    throw new Error('Server returned malformed JSON. Please retry.');
  }

  if (!res.ok) {
    throw new Error(data.error || `AI request failed (HTTP ${res.status}).`);
  }

  return data;
}

function buildCopilotSystemInstruction(context?: CopilotRequestParams['context']): string {
  return `You are the Study AI Copilot inside DataForge DE, a Staff Data Engineering Mentor specializing in Tier-1 interviews (Google Cloud Consulting, Meta, Amazon, Uber, Snowflake, Databricks).
Be crisp, structured, technically rigorous, and directly reference the user's active problem, schema, or code context.
Use clean Markdown headings, bullet points, ASCII architecture/table diagrams when helpful, and exact Big-O / distributed compute complexity (shuffle, skew, partition pruning, slot usage).
Never invent fake results. If debugging user code/SQL, pinpoint the exact bug line and show the corrected snippet.

ACTIVE WORKSPACE CONTEXT:
- Active View: ${context?.view || 'Hub'}
- Track: ${context?.trackName || 'General Data Engineering'}
- Active Concept: ${context?.concept || 'None selected'}
- Question Title: ${context?.questionTitle || 'None active'}
- Problem Statement: ${context?.questionPrompt || 'N/A'}
- Table Schemas / Constraints: ${context?.tableSchemas || 'N/A'}
- User Code / SQL Buffer:
\`\`\`
${context?.codeBuffer || '// Empty'}
\`\`\`
- Architecture / Schema Diagram State: ${context?.diagramSummary || 'N/A'}`;
}

export async function sendCopilotChat(params: CopilotRequestParams): Promise<{
  reply: string;
  modelUsed: string;
  retried?: boolean;
  fallbackFrom?: string;
}> {
  if (params.providerConfig?.provider === 'openai') {
    const apiKey = (params.providerConfig.apiKey || loadOpenAiApiKey()).trim();
    if (isValidOpenAiKey(apiKey)) {
      const model = params.providerConfig.model?.trim() || 'gpt-4o';
      const systemInstruction = buildCopilotSystemInstruction(params.context);
      const chatMessages = params.messages.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemInstruction }, ...chatMessages],
        }),
      });

      const rawText = await res.text();
      let parsed: {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string; code?: string };
      } = {};
      try {
        parsed = JSON.parse(rawText || '{}') as typeof parsed;
      } catch {
        // ignore non-JSON body
      }

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('OpenAI API key was rejected (401). Open ⚙️ Provider to update your sk-... key.');
        }
        if (res.status === 429) {
          throw new Error(
            parsed.error?.message
              ? `OpenAI API error (429): ${parsed.error.message}`
              : 'OpenAI rate limit or quota exceeded (429). Check billing or switch back to Gemini.'
          );
        }
        throw new Error(
          parsed.error?.message
            ? `OpenAI API error (${res.status}): ${parsed.error.message}`
            : `OpenAI API request failed (HTTP ${res.status}).`
        );
      }

      const reply = parsed.choices?.[0]?.message?.content?.trim() || 'No response received from OpenAI.';
      return { reply, modelUsed: model };
    }
  }

  return postAiJson('/api/ai/copilot', params);
}

export async function generateDailyPulse(): Promise<
  DailyPulseItem & { modelUsed: string; retried: boolean; fallbackFrom?: string }
> {
  return postAiJson('/api/ai/daily-pulse');
}

export async function generateDsaProblem(params: {
  targetPattern?: string;
  difficulty?: string;
  topicHint?: string;
}): Promise<{
  question: Question;
  modelUsed: string;
  retried: boolean;
  fallbackFrom?: string;
}> {
  return postAiJson('/api/ai/generate-dsa-problem', params);
}

export async function reviewArchitecture(params: {
  questionTitle: string;
  scenario: string;
  task: string;
  constraints: string[];
  nodes: Array<{ id: string; label: string; category: string; subtitle?: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
  tradeOffMatrix?: Array<{ decision: string; alternative: string; rationale: string }>;
}): Promise<{
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  scaleAnalysis: string;
  followUpProbe: string;
  modelUsed: string;
  retried: boolean;
  fallbackFrom?: string;
}> {
  return postAiJson('/api/ai/review-architecture', params);
}

export async function reviewSchema(params: {
  questionTitle: string;
  businessContext: string;
  requirements: string[];
  tables: Array<{
    name: string;
    tableType: string;
    columns: Array<{ name: string; dataType: string; keyType?: string }>;
  }>;
  relationships: Array<{ fromTable: string; toTable: string; cardinality: string }>;
  ddl: string;
}): Promise<{
  score: number;
  verdict: string;
  grainCheck: string;
  strengths: string[];
  improvements: string[];
  followUpProbe: string;
  modelUsed: string;
  retried: boolean;
  fallbackFrom?: string;
}> {
  return postAiJson('/api/ai/review-schema', params);
}

export async function runMockInterviewTurn(params: {
  mockTitle: string;
  roundType: string;
  roundNumber?: number;
  interviewerName?: string;
  interviewerRole?: string;
  questionPrompt: string;
  expectedSignals: string[];
  clarifyingNotes?: string;
  targetLevel?: 'L3/L4' | 'L5';
  sev1Incident?: string;
  transcript: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  candidateCodeOrNotes?: string;
  finishInterview?: boolean;
}): Promise<{
  reply?: string;
  scorecard?: MockScorecardPayload;
  modelUsed: string;
  retried: boolean;
  fallbackFrom?: string;
}> {
  return postAiJson('/api/ai/mock-interview', params);
}

export async function transcribeAudioBlob(
  blob: Blob,
  contextHint?: string
): Promise<{
  transcript: string;
  modelUsed: string;
  retried?: boolean;
}> {
  const { base64, mimeType } = await blobToBase64(blob);
  return postAiJson('/api/ai/transcribe', {
    audioBase64: base64,
    mimeType,
    contextHint,
  });
}
