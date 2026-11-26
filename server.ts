import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter';
  apiKey?: string;
  model?: string;
}

const CANDIDATE_RESUME_ANCHOR = `Candidate Profile (Use naturally to grill deeper when relevant):
- 3 YoE Data Engineer targeting Google Cloud Consulting (Bengaluru, L3/L4).
- Experience: Built 2M–10M daily retail real-time streaming & geospatial analytics pipelines; led 10+ TB banking Flume/Hadoop migration to cloud; optimized 5+ TB healthcare pipelines (cut latency & cost); built an in-browser SQL AST & Pyodide evaluation platform.`;

async function callExternalProvider(
  providerConfig: ProviderConfig,
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const { provider, apiKey, model } = providerConfig;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    throw new Error(`Missing or invalid API key for ${provider}.`);
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 220)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'No response received.';
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-latest',
        max_tokens: 1500,
        system: systemInstruction,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 220)}`);
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text || 'No response received.';
  }

  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${errText.slice(0, 220)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'No response received.';
  }

  throw new Error('Unsupported provider.');
}

async function generateWithGemini(
  systemInstruction: string,
  prompt: string,
  preferFastDebug = false
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  const primaryModel = preferFastDebug ? 'gemini-3.8-flash' : 'gemini-4-hydrogen';

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: prompt,
      config: { systemInstruction },
    });
    return {
      text: response.text ?? 'Unable to generate response.',
      modelUsed: primaryModel,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (preferFastDebug && (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('not found'))) {
      const fallback = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: { systemInstruction },
      });
      return {
        text: fallback.text ?? 'Unable to generate response.',
        modelUsed: 'gemini-4-hydrogen',
      };
    }
    throw err;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Serve sql.js WASM file reliably from node_modules
  app.get('/sql-wasm.wasm', (_req: Request, res: Response) => {
    const wasmPath = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
    if (fs.existsSync(wasmPath)) {
      res.setHeader('Content-Type', 'application/wasm');
      res.sendFile(wasmPath);
    } else {
      res.status(404).send('sql-wasm.wasm not found');
    }
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
  });

  // Daily Byte & Engineering Pulse fresh insight generator
  app.post('/api/ai/daily-pulse', async (_req: Request, res: Response) => {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          'Generate ONE fresh, high-signal Data Engineering Daily Byte & Engineering Pulse for a senior/staff candidate preparing for Google Cloud Consulting & Tier-1 tech loops. Pick a real architectural concept from distributed SQL, Spark skew, SCD Type 2, Iceberg/Delta Lake, Beam watermarks, S2/H3 geospatial, or Hybrid RAG.',
        config: {
          systemInstruction:
            'Be crisp, factual, and practical. Return valid JSON matching the exact schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING },
              quoteAuthor: { type: Type.STRING },
              warStoryTitle: { type: Type.STRING },
              warStoryFact: { type: Type.STRING },
              topicName: { type: Type.STRING },
              topicBullets: {
                type: Type.OBJECT,
                properties: {
                  what: { type: Type.STRING },
                  why: { type: Type.STRING },
                  trap: { type: Type.STRING },
                },
              },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ dateKey: new Date().toISOString().slice(0, 10), ...parsed });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Daily Pulse generation failed.';
      res.status(500).json({ error: message });
    }
  });

  const CANONICAL_DSA_PATTERNS = [
    'Arrays & Hashing',
    'Two Pointers',
    'Sliding Window',
    'Stack & Monotonic Stack',
    'Binary Search',
    'Linked List',
    'Trees & BST',
    'Tries',
    'Heap / Priority Queue',
    'Backtracking',
    'Graphs & BFS/DFS',
    'Topological Sort (DAG)',
    'Shortest Path (Dijkstra / Bellman-Ford)',
    'Intervals',
    'Greedy',
    '1-D Dynamic Programming',
    '2-D Dynamic Programming',
    'Bit Manipulation & Math',
  ] as const;

  // On-demand LeetCode / NeetCode DSA Problem Generator (gemini-2.5-flash)
  app.post('/api/ai/generate-dsa-problem', async (req: Request, res: Response) => {
    try {
      const { targetPattern, difficulty, topicHint } = req.body as {
        targetPattern?: string;
        difficulty?: string;
        topicHint?: string;
      };

      const ai = getGeminiClient();
      const patternChoice =
        targetPattern && targetPattern !== 'AUTO' && (CANONICAL_DSA_PATTERNS as readonly string[]).includes(targetPattern)
          ? targetPattern
          : null;
      const diffChoice = difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';

      const prompt = `Generate ONE fresh, authentic LeetCode/NeetCode-style Data Engineering Python 3 DSA coding problem.
Requirements:
- Must explicitly assign "dsaPattern" to EXACTLY ONE value from this canonical list: ${CANONICAL_DSA_PATTERNS.join(' | ')}.
${patternChoice ? `- Target Pattern REQUIRED: "${patternChoice}".` : '- Pick a high-signal pattern from the canonical list above.'}
- Target Difficulty: ${diffChoice}.
${topicHint ? `- Optional Theme/Hint: ${topicHint}` : '- Frame the problem around realistic data pipelines, distributed telemetry, logs, shards, or query planning.'}
- Provide runnable Python 3 starterCode and solutionCode defining \`def solve(...):\`.
- Provide 3 deterministic testCases where \`inputExpr\` is valid Python argument(s) to \`solve(...)\` (for single arg, e.g. "[1, 2, 3]") and \`expectedJson\` is valid JSON for the exact return value of \`solve\`.`;

      const schemaConfig = {
        systemInstruction:
          'You are a Principal Google Software & Data Engineering Interview Author. Always classify dsaPattern strictly using the canonical NeetCode pattern enum.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            prompt: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
            company: { type: Type.STRING },
            dsaPattern: { type: Type.STRING, enum: [...CANONICAL_DSA_PATTERNS] },
            concept: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            starterCode: { type: Type.STRING },
            solutionCode: { type: Type.STRING },
            constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  inputText: { type: Type.STRING },
                  outputText: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
              },
            },
            approaches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  tier: { type: Type.STRING, enum: ['Brute Force', 'Optimized', 'At-Scale Production'] },
                  intuition: { type: Type.STRING },
                  walkthrough: { type: Type.ARRAY, items: { type: Type.STRING } },
                  complexity: { type: Type.STRING },
                  costProfile: { type: Type.STRING },
                  code: { type: Type.STRING },
                },
              },
            },
            testCases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  inputExpr: { type: Type.STRING },
                  expectedJson: { type: Type.STRING },
                },
              },
            },
            followUps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  staffAnswer: { type: Type.STRING },
                  tradeOffs: { type: Type.STRING },
                },
              },
            },
          },
        },
      };

      let response;
      let modelUsed = 'gemini-2.5-flash';
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: schemaConfig,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('not found')) {
          modelUsed = 'gemini-4-hydrogen';
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: schemaConfig,
          });
        } else {
          throw err;
        }
      }

      const raw = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      const rawPattern = typeof raw.dsaPattern === 'string' ? raw.dsaPattern : '';
      const validPattern = (CANONICAL_DSA_PATTERNS as readonly string[]).includes(rawPattern)
        ? rawPattern
        : patternChoice || 'Arrays & Hashing';

      const validDifficulty =
        raw.difficulty === 'Easy' || raw.difficulty === 'Medium' || raw.difficulty === 'Hard'
          ? raw.difficulty
          : diffChoice;

      const company = typeof raw.company === 'string' && raw.company.trim() ? raw.company.trim() : 'Google';
      const companyTier = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix'].includes(company)
        ? 'FAANG / Hyperscaler'
        : ['Snowflake', 'Databricks'].includes(company)
        ? 'Data Platform Leader'
        : 'High-Scale Tech';

      const generated = {
        id: `dsa-ai-${Date.now()}`,
        number: 100 + Math.floor((Date.now() % 90000) / 100),
        trackId: 'dsa',
        title: typeof raw.title === 'string' ? raw.title : 'AI-Generated Pattern Challenge',
        prompt: typeof raw.prompt === 'string' ? raw.prompt : 'Implement an optimal Python 3 solution.',
        difficulty: validDifficulty,
        company,
        companyTier,
        dsaPattern: validPattern,
        tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : [validPattern, 'Python 3', company],
        concept: typeof raw.concept === 'string' && raw.concept ? raw.concept : 'Shuffle & Skew Mitigation',
        workspaceType: 'ide',
        language: 'python',
        starterCode: typeof raw.starterCode === 'string' ? raw.starterCode : 'def solve(nums):\n    pass\n',
        solutionCode: typeof raw.solutionCode === 'string' ? raw.solutionCode : 'def solve(nums):\n    return nums\n',
        constraints: Array.isArray(raw.constraints) ? raw.constraints : ['0 <= len(nums) <= 10^5'],
        examples: Array.isArray(raw.examples) ? raw.examples : [],
        approaches: Array.isArray(raw.approaches) ? raw.approaches : [],
        testCases: Array.isArray(raw.testCases) ? raw.testCases : [],
        followUps: Array.isArray(raw.followUps) ? raw.followUps : [],
      };

      res.json({ question: generated, modelUsed });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'DSA problem generation failed.';
      res.status(500).json({ error: message });
    }
  });

  // Study AI Copilot endpoint
  app.post('/api/ai/copilot', async (req: Request, res: Response) => {
    try {
      const { messages, context, mode, providerConfig } = req.body as {
        messages?: Array<{ role: string; content: string }>;
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
        providerConfig?: ProviderConfig;
      };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const systemInstruction = `You are the Study AI Copilot inside DataForge DE, a Staff Data Engineering Mentor specializing in Tier-1 interviews (Google Cloud Consulting, Meta, Amazon, Uber, Snowflake, Databricks).
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

      const conversationText = messages
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'Candidate' : 'Copilot'}: ${m.content}`)
        .join('\n\n');

      if (providerConfig && providerConfig.provider !== 'gemini') {
        const text = await callExternalProvider(providerConfig, systemInstruction, conversationText);
        res.json({ reply: text, modelUsed: providerConfig.model || providerConfig.provider });
        return;
      }

      const preferFastDebug = mode === 'debug';
      const { text, modelUsed } = await generateWithGemini(systemInstruction, conversationText, preferFastDebug);
      res.json({ reply: text, modelUsed });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Copilot request failed.';
      res.status(500).json({ error: message });
    }
  });

  // Architecture Canvas AI Review endpoint
  app.post('/api/ai/review-architecture', async (req: Request, res: Response) => {
    try {
      const { questionTitle, scenario, task, constraints, nodes, edges, tradeOffMatrix } = req.body as {
        questionTitle: string;
        scenario: string;
        task: string;
        constraints: string[];
        nodes: Array<{ id: string; label: string; category: string; subtitle?: string }>;
        edges: Array<{ from: string; to: string; label?: string }>;
        tradeOffMatrix?: Array<{ decision: string; alternative: string; rationale: string }>;
      };

      const ai = getGeminiClient();
      const tradeOffLines = (tradeOffMatrix || [])
        .filter((r) => r.decision.trim() || r.alternative.trim() || r.rationale.trim())
        .map(
          (r, i) =>
            `${i + 1}. Chosen: ${r.decision || '(blank)'} | Rejected Alt: ${r.alternative || '(blank)'} | Why Rejected at Scale: ${r.rationale || '(blank)'}`
        )
        .join('\n');

      const prompt = `Evaluate this candidate's Data System Architecture diagram AND Decision Trade-Off Matrix for an L4/L5 Tier-1 interview.

Question: ${questionTitle}
Scenario: ${scenario}
Task: ${task}
Scale & Constraints: ${constraints.join(' | ')}

Candidate Architecture Nodes:
${nodes.map((n) => `- [${n.category}] ${n.label}${n.subtitle ? ` (${n.subtitle})` : ''}`).join('\n') || 'None placed'}

Candidate Data Flows (Edges):
${edges.map((e) => {
  const src = nodes.find((n) => n.id === e.from)?.label || e.from;
  const dst = nodes.find((n) => n.id === e.to)?.label || e.to;
  return `- ${src} --> ${dst}${e.label ? ` [${e.label}]` : ''}`;
}).join('\n') || 'No connections drawn'}

Candidate's Architectural Decision & Trade-Off Matrix:
${tradeOffLines || 'No explicit trade-offs logged yet'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a Google Cloud Staff Data Architect grading a system design whiteboard on the L4/L5 Hiring Committee rubric. Evaluate fault tolerance, backpressure, partitioning, latency SLAs, schema evolution, cost, AND specifically critique the candidate\'s logged Trade-Off Matrix (whether their rejected alternatives and scale rationales hold water).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: 'Score from 0 to 100' },
              verdict: { type: Type.STRING, description: 'Strong Hire | Hire | Lean Hire | No Hire' },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              scaleAnalysis: { type: Type.STRING },
              followUpProbe: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Architecture review failed.';
      res.status(500).json({ error: message });
    }
  });

  // Dimensional / ER Schema Designer AI Review endpoint
  app.post('/api/ai/review-schema', async (req: Request, res: Response) => {
    try {
      const { questionTitle, businessContext, requirements, tables, relationships, ddl } = req.body as {
        questionTitle: string;
        businessContext: string;
        requirements: string[];
        tables: Array<{ name: string; tableType: string; columns: Array<{ name: string; dataType: string; keyType?: string }> }>;
        relationships: Array<{ fromTable: string; toTable: string; cardinality: string }>;
        ddl: string;
      };

      const ai = getGeminiClient();
      const prompt = `Evaluate this candidate's Dimensional / ER Data Model for a Tier-1 Data Engineering interview.

Question: ${questionTitle}
Business Context: ${businessContext}
Requirements: ${requirements.join(' | ')}

Candidate Tables:
${tables.map((t) => `- ${t.tableType} ${t.name}: ${t.columns.map((c) => `${c.name} ${c.dataType}${c.keyType ? ` [${c.keyType}]` : ''}`).join(', ')}`).join('\n')}

Relationships:
${relationships.map((r) => `- ${r.fromTable} (${r.cardinality}) -> ${r.toTable}`).join('\n')}

Generated DDL:
${ddl}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a Principal Data Warehouse Architect grading a Kimball/Inmon/Data Vault schema. Check grain declaration, surrogate keys, SCD Type 2 handling, degenerate dimensions, bridge tables, partitioning/clustering keys, and query efficiency.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              verdict: { type: Type.STRING },
              grainCheck: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              followUpProbe: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Schema review failed.';
      res.status(500).json({ error: message });
    }
  });

  // Face-to-Face Google Mock Interviewer turn & 4-Pillar Google HC grading endpoint
  app.post('/api/ai/mock-interview', async (req: Request, res: Response) => {
    try {
      const {
        mockTitle,
        roundType,
        roundNumber,
        interviewerName,
        interviewerRole,
        questionPrompt,
        expectedSignals,
        clarifyingNotes,
        targetLevel,
        sev1Incident,
        transcript,
        candidateCodeOrNotes,
        finishInterview,
      } = req.body as {
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
      };

      const ai = getGeminiClient();
      const personaName = interviewerName || 'Ananya Rao';
      const personaRole = interviewerRole || 'Staff Data Engineer · Google Cloud Consulting (Bengaluru)';
      const levelBar =
        targetLevel === 'L5'
          ? 'Senior Data Engineer (L5 Bar — requires deep operational maturity, Sev-1 root-cause triage, and multi-team blast-radius containment)'
          : 'Mid-Level L3/L4 Data Engineer (Google Cloud Consulting)';

      if (finishInterview) {
        const evalPrompt = `You just completed Round ${roundNumber || 1} (${roundType}) of a Google Mock Interview calibrated at: ${levelBar}.
Interviewer: ${personaName} (${personaRole})
Mock Loop: ${mockTitle}
Question: ${questionPrompt}
Expected Signals: ${expectedSignals.join(', ')}
Candidate's Initial Clarifying Questions (GCA Gate): ${clarifyingNotes || 'Skipped / minimal clarifying questions'}
${sev1Incident ? `Live Sev-1 Incident Curveball Dropped Mid-Round: ${sev1Incident}` : ''}

${CANDIDATE_RESUME_ANCHOR}

Candidate Scratchpad / Code:
${candidateCodeOrNotes || 'None'}

Full Interview Transcript:
${transcript.map((t) => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n')}

Provide an official 4-pillar Google Hiring Committee (HC) Scorecard grading:
1. GCA (General Cognitive Ability — ambiguity navigation, clarifying questions, structured edge cases)
2. RRK (Role-Related Knowledge — BigQuery/Spark/SQL/DSA/Geospatial/GenAI precision${sev1Incident ? ' + Sev-1 incident triage & containment' : ''})
3. Leadership (consulting pushback, TCO trade-offs, operational ownership)
4. Googleyness (collaboration, clarity, humility, customer focus)`;

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: evalPrompt,
          config: {
            systemInstruction: `You are ${personaName} (${personaRole}) writing an official Google Hiring Committee packet calibrated for ${levelBar}.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                verdict: { type: Type.STRING, description: 'Strong Hire | Hire | Lean Hire | No Hire' },
                summary: { type: Type.STRING },
                technicalStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                growthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                rubricScores: {
                  type: Type.OBJECT,
                  properties: {
                    gca: { type: Type.INTEGER },
                    rrk: { type: Type.INTEGER },
                    leadership: { type: Type.INTEGER },
                    googleyness: { type: Type.INTEGER },
                  },
                },
              },
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json({ scorecard: parsed });
        return;
      }

      const turnPrompt = `You are conducting Round ${roundNumber || 1} (${roundType}) of a live Google Data Engineering interview calibrated at: ${levelBar}.
Interviewer Persona: ${personaName} (${personaRole})
Mock Loop: ${mockTitle}
Main Question: ${questionPrompt}
Key Signals to Probe: ${expectedSignals.join(', ')}
Candidate's GCA Clarifying Questions Asked Before Coding: ${clarifyingNotes || '(None asked yet)'}
${sev1Incident ? `ACTIVE LIVE SEV-1 PRODUCTION INCIDENT: ${sev1Incident}\nProbe whether the candidate isolates blast radius, checks telemetry (Dataflow watermarks, BigQuery INFORMATION_SCHEMA slots, consumer lag, DLQ), executes safe rollback/mitigation, and communicates clearly with stakeholders.` : ''}

${CANDIDATE_RESUME_ANCHOR}

Candidate's Current Editor / Whiteboard Buffer:
${candidateCodeOrNotes || '(No code or diagram written yet)'}

Conversation So Far:
${transcript.map((t) => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n')}

Respond naturally in 2-4 concise spoken sentences (read aloud via TTS). Acknowledge what the candidate explained or wrote, verify correctness or catch subtle scale/edge bugs (skew, late-arriving data, BigQuery slots, null safety, complexity${sev1Incident ? ', Sev-1 triage' : ''}), and occasionally tie a follow-up probe to their resume scale (2M-10M retail streaming, 10+ TB Flume migration, 5+ TB healthcare optimization, or SQL AST/Pyodide platform). Ask ONE sharp follow-up question.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: turnPrompt,
        config: {
          systemInstruction: `You are ${personaName}, ${personaRole}. Speak naturally, sharply, and concisely without markdown formatting, asterisks, or bullet points since your response is spoken aloud in a live video call.`,
        },
      });

      res.json({
        reply: (response.text ?? 'Thanks for walking through that. Could you clarify how you handle late-arriving partitions and data skew here?').replace(/[*#`]/g, ''),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Mock interview turn failed.';
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DataForge DE server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
