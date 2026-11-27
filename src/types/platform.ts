export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ThemeId =
  | 'obsidian-lavender'
  | 'alabaster-lavender'
  | 'crimson-noir'
  | 'scarlet-ivory'
  | 'cyber-emerald'
  | 'tokyo-midnight'
  | 'amber-terminal'
  | 'sakura-velvet'
  | 'nordic-frost'
  | 'matcha-cream'
  | 'cyberpunk-synth'
  | 'espresso-parchment'
  | 'velvet-maroon'
  | 'bordeaux-cream'
  | 'royal-gold-onyx'
  | 'cobalt-slate'
  | 'teal-graphite'
  | 'rosewood-linen'
  | 'nord-polar'
  | 'gruvbox-carbon'
  | 'monokai-obsidian'
  | 'one-dark-slate'
  | 'midnight-indigo'
  | 'rose-pine-moon'
  | 'deep-crimson'
  | 'emerald-forest'
  | 'amethyst-velvet'
  | 'solarized-midnight'
  | 'dracula-nocturne'
  | 'catppuccin-mocha'
  | 'matcha-latte'
  | 'sandstone-editorial'
  | 'lavender-cloud'
  | 'arctic-alabaster';

export type FontPreset =
  | 'modern'
  | 'editorial'
  | 'classic'
  | 'geometric-pro'
  | 'swiss-grid'
  | 'neo-grotesque'
  | 'sharp-tech'
  | 'humanist-crisp'
  | 'executive-serif'
  | 'compact-terminal'
  | 'nordic-clean'
  | 'high-contrast'
  | 'mono-hacker';

export type WorkspaceType = 'ide' | 'architecture' | 'modeling' | 'conceptual';

export const CANONICAL_DSA_PATTERNS = [
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

export type DsaPattern = (typeof CANONICAL_DSA_PATTERNS)[number];

export type TrackId =
  | 'concepts'
  | 'sql'
  | 'python'
  | 'dsa'
  | 'pyspark'
  | 'snowflake'
  | 'databricks'
  | 'cloud'
  | 'geospatial'
  | 'modeling'
  | 'sysdesign'
  | 'genai'
  | 'mlfeatures'
  | 'dataops'
  | 'behavioral';

export interface TrackMeta {
  id: TrackId;
  order: number;
  emoji: string;
  name: string;
  shortName: string;
  description: string;
  defaultWorkspace: WorkspaceType;
  googleRoundMapping: GoogleRoundId;
}

export type GoogleRoundId =
  | 'OA / GHA'
  | 'Phone Screen'
  | 'Python & DSA'
  | 'SQL & Modeling'
  | 'Geospatial & System Design'
  | 'GenAI & RAG'
  | 'Googleyness';

export interface DatasetSpec {
  id: string;
  name: string;
  ddl: string;
  seedSql: string;
  tablePreviewNames: string[];
}

export interface IdeTestCase {
  name: string;
  description: string;
  inputExpr?: string;
  expectedJson?: string;
  expectedColumns?: string[];
  expectedRowCount?: number;
  checkSqlContains?: string[];
}

export interface FollowUpItem {
  question: string;
  staffAnswer: string;
  tradeOffs: string;
}

export interface QuestionExample {
  title: string;
  inputTable?: {
    tableName: string;
    columns: string[];
    rows: Array<Array<string | number | null>>;
  };
  outputTable?: {
    tableName: string;
    columns: string[];
    rows: Array<Array<string | number | null>>;
  };
  inputText?: string;
  outputText?: string;
  explanation: string;
}

export interface QuestionApproach {
  name: string;
  tier: 'Brute Force' | 'Optimized' | 'At-Scale Production';
  intuition: string;
  walkthrough: string[];
  complexity: string;
  costProfile: string;
  code: string;
}

export interface ArchitectureSpec {
  scenario: string;
  task: string;
  scaleConstraints: string[];
  approachGuide: string[];
  hints: string[];
  recommendedComponents: string[];
}

export interface ModelingSpec {
  problem: string;
  businessContext: string;
  requirements: string[];
  constraints: string[];
  approachGuide: string[];
  starterTables: SchemaTable[];
}

export interface ConceptualSpec {
  scenario: string;
  keyTopics: string[];
  rubricChecklist: string[];
  followUpProbes: string[];
  sampleOutline: string;
}

export interface Question {
  id: string;
  number: number;
  trackId: TrackId;
  title: string;
  prompt: string;
  difficulty: Difficulty;
  company: string;
  companyTier: 'FAANG / Hyperscaler' | 'Data Platform Leader' | 'High-Scale Tech';
  tags: string[];
  concept: string;
  dsaPattern?: DsaPattern;
  workspaceType: WorkspaceType;
  language?: 'sql' | 'python' | 'pyspark';
  datasetId?: string;
  starterCode?: string;
  buggyCode?: string;
  solutionCode?: string;
  constraints?: string[];
  examples?: QuestionExample[];
  approaches?: QuestionApproach[];
  followUps: FollowUpItem[];
  testCases?: IdeTestCase[];
  architectureSpec?: ArchitectureSpec;
  modelingSpec?: ModelingSpec;
  conceptualSpec?: ConceptualSpec;
}

export interface ConceptGuide {
  name: string;
  category: string;
  summary: string;
  mentalModel: string;
  internals: string[];
  tradeOffs: Array<{ optionA: string; optionB: string; whenToChoose: string }>;
  pitfalls: string[];
  codeExample: string;
  asciiDiagram: string;
}

export interface ArchNode {
  id: string;
  typeId: string;
  label: string;
  category: 'Ingestion' | 'Compute' | 'Storage' | 'Warehouse' | 'AI / Vector' | 'Orchestration';
  subtitle: string;
  x: number;
  y: number;
}

export interface ArchEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface SchemaColumn {
  id: string;
  name: string;
  dataType: string;
  keyType?: 'PK' | 'FK' | 'SK' | 'NK' | '';
  nullable?: boolean;
}

export interface SchemaTable {
  id: string;
  name: string;
  tableType: 'FACT' | 'DIM' | 'BRIDGE' | 'STAGING';
  grain?: string;
  x: number;
  y: number;
  columns: SchemaColumn[];
}

export interface SchemaRelation {
  id: string;
  fromTable: string;
  toTable: string;
  cardinality: '1:N' | 'N:1' | '1:1' | 'M:N';
  joinKey: string;
}

export interface InterviewerProfile {
  id: string;
  name: string;
  role: string;
  team: string;
  voiceGender: 'female' | 'male';
  voicePitch: number;
  voiceRate: number;
  skin: string;
  skinShadow: string;
  hair: string;
  hairHighlight: string;
  hairStyle: 'long' | 'bob' | 'short' | 'parted' | 'curly';
  outfit: string;
  glassesStyle: 'rect' | 'round' | 'none';
  glassesColor: string;
  bgTint: string;
}

export interface MockRoundStep {
  roundNumber: number; // 1..6
  roundLabel: string;
  roundType: GoogleRoundId;
  interviewer: InterviewerProfile;
  durationMinutes: number;
  workspaceMode: WorkspaceType;
  datasetId?: string;
  starterCode?: string;
  questionPrompt: string;
  clarifyingPrompts: string[];
  expectedSignals: string[];
  followUps: string[];
}

export type MockTierName =
  | 'Foundations (01-10)'
  | 'Scale & Performance (11-20)'
  | 'Geospatial & Petabyte Imagery (21-30)'
  | 'GenAI & RAG Ops (31-40)'
  | 'Bar-Raiser Consulting Loops (41-50)';

export interface MockInterviewRound {
  id: string;
  mockNumber: number;
  code: string;
  tier: MockTierName;
  title: string;
  roundType: GoogleRoundId;
  durationMinutes: number;
  difficulty: Difficulty;
  targetRole: string;
  interviewerName: string;
  interviewerRole: string;
  interviewerAvatar: string;
  interviewerProfile: InterviewerProfile;
  questionPrompt: string;
  workspaceMode: WorkspaceType;
  datasetId?: string;
  starterCode?: string;
  expectedSignals: string[];
  followUps: string[];
  sixRounds: MockRoundStep[];
}

export interface MockAttemptRecord {
  mockId: string;
  mockNumber: number;
  title: string;
  roundType: GoogleRoundId;
  score: number;
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';
  completedAt: string;
  durationSeconds: number;
  summary: string;
  growthAreas?: string[];
  rubricScores?: {
    gca: number;
    rrk: number;
    leadership: number;
    googleyness: number;
  };
}

export interface StudyNote {
  id: string;
  title: string;
  concept: string;
  content: string;
  createdAt: string;
}

export interface QuestionSubmissionRecord {
  id: string;
  questionId: string;
  passed: boolean;
  runtimeMs: number;
  language: string;
  codeSnapshot: string;
  timestamp: string;
}

export interface Sm2ReviewItem {
  itemId: string; // questionId or mock-X
  itemType: 'question' | 'mock';
  title: string;
  trackId?: TrackId;
  intervalDays: 1 | 3 | 7;
  nextReviewDate: string; // YYYY-MM-DD
  reason: string;
  lastResult: string;
}

export interface DailyPulseItem {
  dateKey: string;
  quote: string;
  quoteAuthor: string;
  warStoryTitle: string;
  warStoryFact: string;
  topicName: string;
  topicBullets: {
    what: string;
    why: string;
    trap: string;
  };
}

export interface ArchTradeOffRow {
  id: string;
  decision: string;
  alternative: string;
  rationale: string;
}

export interface CarlStory {
  id: string;
  title: string;
  projectTag: string;
  context: string;
  action: string;
  result: string;
  reflection: string;
  updatedAt: string;
}

export interface BlindSpotRecord {
  tag: string;
  count: number;
  lastSeenAt: string;
  sampleTitle?: string;
  trackId?: TrackId;
}

export interface UserProgressState {
  solvedQuestionIds: string[];
  attemptedQuestionIds: string[];
  firstTryPassIds: string[];
  firstTryFailIds: string[];
  totalSubmissions: number;
  passedSubmissions: number;
  activityDates: Record<string, number>; // YYYY-MM-DD -> count
  streakDays: number;
  longestStreakDays: number;
  dailyTarget: number;
  targetInterviewDate?: string; // YYYY-MM-DD
  blindSpotCounts?: Record<string, BlindSpotRecord>;
  mockHistory: MockAttemptRecord[];
  savedNotes: StudyNote[];
  codeDrafts: Record<string, string>;
  submissionHistory: Record<string, QuestionSubmissionRecord[]>;
  discussionNotes: Record<string, Array<{ id: string; author: string; text: string; createdAt: string }>>;
  sm2Queue: Record<string, Sm2ReviewItem>;
  carlStories?: CarlStory[];
  generatedDsaQuestions?: Question[];
}

export interface AiProviderSettings {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter';
  customApiKey: string;
  customModel: string;
}
