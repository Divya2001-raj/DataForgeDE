import {
  AiProviderSettings,
  CarlStory,
  FontPreset,
  MockAttemptRecord,
  Question,
  QuestionSubmissionRecord,
  Sm2ReviewItem,
  StudyNote,
  ThemeId,
  TrackId,
  UserProgressState,
} from '../types/platform';

const PROGRESS_KEY = 'dataforge_progress_v1';
const THEME_KEY = 'dataforge_theme_v1';
const FONT_PRESET_KEY = 'dataforge_font_preset_v1';
const PROVIDER_KEY = 'dataforge_ai_provider_v1';

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_CARL_STORIES: CarlStory[] = [
  {
    id: 'carl-banking-flume',
    title: '10+ TB Banking Flume-to-Cloud Ingestion Migration',
    projectTag: 'Banking Migration (10+ TB)',
    context: 'Legacy on-prem Apache Flume agents were dropping bursts and violating 6 AM regulatory batch SLAs across 10+ TB daily banking transactions.',
    action: 'Proposed dual-write shadow validation, partitioned Pub/Sub -> Dataflow streaming ingestion with schema contracts, and automated reconciliation audits before decommissioning Flume.',
    result: 'Zero data loss cutover across 10+ TB/day, reduced end-to-end latency by 78%, and eliminated recurring P1 paging.',
    reflection: 'Should have negotiated replayable dead-letter bucket retention limits with InfoSec 3 weeks earlier instead of during UAT.',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'carl-retail-geospatial',
    title: '2M–10M Daily Retail Streaming & Geospatial Catchment Engine',
    projectTag: 'Retail Streaming & Geo (2M-10M)',
    context: 'Peak festival traffic pushed mobile telemetry to 10M events/day, causing severe hot-key skew in metro store catchments.',
    action: 'Implemented H3/S2 spatial cell salting paired with event-time watermarks and idempotent MERGE sinks to eliminate straggler tasks.',
    result: 'Maintained <4s p99 catchment SLA under 5x festival load while cutting streaming worker compute cost by 34%.',
    reflection: 'Would standardize synthetic skew load generators in CI earlier so hot-zone regressions fail pre-prod.',
    updatedAt: '2026-02-10T10:00:00.000Z',
  },
  {
    id: 'carl-healthcare-opt',
    title: '5+ TB Healthcare Pipeline Cost & Latency Rescue',
    projectTag: 'Healthcare Pipeline (5+ TB)',
    context: 'Clinical analytics queries scanning 5+ TB claims tables took 3.2 hours nightly due to non-sargable partition filters and wide unclustered joins.',
    action: 'Redesigned table layout with ingestion-date partitioning + 4-column clustering, enforced dbt incremental insert_overwrite, and added DPDP/HIPAA column masking.',
    result: 'Cut nightly runtime from 3.2h to 14 minutes and lowered monthly warehouse scan spend by 61%.',
    reflection: 'I focused initially on SQL rewrites; partnering with BI dashboard owners first would have eliminated 40% of unused legacy joins immediately.',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
  {
    id: 'carl-sql-pyodide-platform',
    title: 'In-Browser SQL AST & Pyodide Evaluation Sandbox',
    projectTag: 'In-Browser SQL/Pyodide Platform',
    context: 'Interview prep candidates needed instant deterministic validation of SQL windowing and Python algorithms without slow remote container spin-ups.',
    action: 'Architected client-side WASM execution via sql.js + AST assertions and Pyodide isolation with graceful fallback sandboxing.',
    result: 'Sub-25ms local feedback loop with zero server compute overhead per test execution.',
    reflection: 'Adding strict Google Doc plain-text mode earlier helps users avoid leaning too heavily on fast autocomplete.',
    updatedAt: '2026-03-20T10:00:00.000Z',
  },
];

function getDefaultProgress(): UserProgressState {
  return {
    solvedQuestionIds: [],
    attemptedQuestionIds: [],
    firstTryPassIds: [],
    firstTryFailIds: [],
    totalSubmissions: 0,
    passedSubmissions: 0,
    activityDates: {},
    streakDays: 0,
    longestStreakDays: 0,
    dailyTarget: 5,
    mockHistory: [],
    savedNotes: [],
    codeDrafts: {},
    submissionHistory: {},
    discussionNotes: {},
    sm2Queue: {},
    carlStories: DEFAULT_CARL_STORIES,
    generatedDsaQuestions: [],
  };
}

export function loadProgress(): UserProgressState {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgressState>;
    return {
      ...getDefaultProgress(),
      ...parsed,
      carlStories:
        parsed.carlStories && parsed.carlStories.length > 0
          ? parsed.carlStories
          : DEFAULT_CARL_STORIES,
      generatedDsaQuestions: Array.isArray(parsed.generatedDsaQuestions)
        ? parsed.generatedDsaQuestions
        : [],
    };
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(state: UserProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function computeStreak(activityDates: Record<string, number>): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if ((activityDates[key] || 0) > 0) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function recordQuestionSubmission(
  prev: UserProgressState,
  questionId: string,
  passed: boolean,
  meta?: {
    title?: string;
    trackId?: TrackId;
    runtimeMs?: number;
    language?: string;
    codeSnapshot?: string;
  }
): UserProgressState {
  const today = getTodayIso();
  const solvedSet = new Set(prev.solvedQuestionIds);
  const attemptedSet = new Set(prev.attemptedQuestionIds);
  const firstTryPassSet = new Set(prev.firstTryPassIds || []);
  const firstTryFailSet = new Set(prev.firstTryFailIds || []);

  const isFirstAttempt = !attemptedSet.has(questionId);
  attemptedSet.add(questionId);
  if (isFirstAttempt) {
    if (passed) firstTryPassSet.add(questionId);
    else firstTryFailSet.add(questionId);
  }
  if (passed) {
    solvedSet.add(questionId);
  }

  const activityDates = {
    ...prev.activityDates,
    [today]: (prev.activityDates[today] || 0) + 1,
  };
  const streak = computeStreak(activityDates);
  const longest = Math.max(prev.longestStreakDays || 0, streak);

  // SM-2 Spaced Repetition Update
  const nextSm2 = { ...(prev.sm2Queue || {}) };
  if (!passed) {
    const existing = nextSm2[questionId];
    const nextInterval: 1 | 3 | 7 = existing ? (existing.intervalDays === 1 ? 1 : 1) : 1;
    nextSm2[questionId] = {
      itemId: questionId,
      itemType: 'question',
      title: meta?.title || questionId,
      trackId: meta?.trackId,
      intervalDays: nextInterval,
      nextReviewDate: addDaysIso(nextInterval),
      reason: isFirstAttempt ? 'Failed first try' : 'Needs reinforcement',
      lastResult: 'Failed assertion',
    };
  } else if (nextSm2[questionId]) {
    const cur = nextSm2[questionId].intervalDays;
    if (cur === 1) {
      nextSm2[questionId] = {
        ...nextSm2[questionId],
        intervalDays: 3,
        nextReviewDate: addDaysIso(3),
        lastResult: 'Passed review (3-day step)',
      };
    } else if (cur === 3) {
      nextSm2[questionId] = {
        ...nextSm2[questionId],
        intervalDays: 7,
        nextReviewDate: addDaysIso(7),
        lastResult: 'Passed review (7-day step)',
      };
    } else {
      delete nextSm2[questionId];
    }
  }

  const prevSubs = prev.submissionHistory?.[questionId] || [];
  const newSub: QuestionSubmissionRecord = {
    id: `sub-${Date.now()}`,
    questionId,
    passed,
    runtimeMs: meta?.runtimeMs ?? 12,
    language: meta?.language ?? 'sql',
    codeSnapshot: meta?.codeSnapshot ?? '',
    timestamp: new Date().toISOString(),
  };

  const next: UserProgressState = {
    ...prev,
    solvedQuestionIds: Array.from(solvedSet),
    attemptedQuestionIds: Array.from(attemptedSet),
    firstTryPassIds: Array.from(firstTryPassSet),
    firstTryFailIds: Array.from(firstTryFailSet),
    totalSubmissions: prev.totalSubmissions + 1,
    passedSubmissions: prev.passedSubmissions + (passed ? 1 : 0),
    activityDates,
    streakDays: streak,
    longestStreakDays: longest,
    sm2Queue: nextSm2,
    submissionHistory: {
      ...(prev.submissionHistory || {}),
      [questionId]: [newSub, ...prevSubs].slice(0, 12),
    },
  };
  saveProgress(next);
  return next;
}

export function recordMockAttempt(
  prev: UserProgressState,
  attempt: MockAttemptRecord
): UserProgressState {
  const today = getTodayIso();
  const activityDates = {
    ...prev.activityDates,
    [today]: (prev.activityDates[today] || 0) + 1,
  };
  const streak = computeStreak(activityDates);
  const longest = Math.max(prev.longestStreakDays || 0, streak);

  const nextSm2: Record<string, Sm2ReviewItem> = { ...(prev.sm2Queue || {}) };
  if (attempt.verdict === 'Lean Hire' || attempt.verdict === 'No Hire') {
    nextSm2[attempt.mockId] = {
      itemId: attempt.mockId,
      itemType: 'mock',
      title: `Mock #${String(attempt.mockNumber).padStart(2, '0')} · ${attempt.title}`,
      intervalDays: 1,
      nextReviewDate: addDaysIso(1),
      reason: `Rated ${attempt.verdict}`,
      lastResult: `${attempt.score}/100 (${attempt.verdict})`,
    };
  } else if (nextSm2[attempt.mockId]) {
    const cur = nextSm2[attempt.mockId].intervalDays;
    if (cur === 1) {
      nextSm2[attempt.mockId] = {
        ...nextSm2[attempt.mockId],
        intervalDays: 3,
        nextReviewDate: addDaysIso(3),
        lastResult: `${attempt.score}/100 (${attempt.verdict})`,
      };
    } else if (cur === 3) {
      nextSm2[attempt.mockId] = {
        ...nextSm2[attempt.mockId],
        intervalDays: 7,
        nextReviewDate: addDaysIso(7),
        lastResult: `${attempt.score}/100 (${attempt.verdict})`,
      };
    } else {
      delete nextSm2[attempt.mockId];
    }
  }

  const next: UserProgressState = {
    ...prev,
    mockHistory: [attempt, ...prev.mockHistory],
    activityDates,
    streakDays: streak,
    longestStreakDays: longest,
    sm2Queue: nextSm2,
  };
  saveProgress(next);
  return next;
}

export function addDiscussionComment(
  prev: UserProgressState,
  questionId: string,
  text: string
): UserProgressState {
  const existing = prev.discussionNotes?.[questionId] || [];
  const next: UserProgressState = {
    ...prev,
    discussionNotes: {
      ...(prev.discussionNotes || {}),
      [questionId]: [
        {
          id: `disc-${Date.now()}`,
          author: 'You (Candidate)',
          text,
          createdAt: new Date().toISOString(),
        },
        ...existing,
      ],
    },
  };
  saveProgress(next);
  return next;
}

export function addStudyNote(prev: UserProgressState, note: StudyNote): UserProgressState {
  const next: UserProgressState = {
    ...prev,
    savedNotes: [note, ...prev.savedNotes],
  };
  saveProgress(next);
  return next;
}

export function deleteStudyNote(prev: UserProgressState, noteId: string): UserProgressState {
  const next: UserProgressState = {
    ...prev,
    savedNotes: prev.savedNotes.filter((n) => n.id !== noteId),
  };
  saveProgress(next);
  return next;
}

export function saveCarlStory(prev: UserProgressState, story: CarlStory): UserProgressState {
  const current = prev.carlStories || DEFAULT_CARL_STORIES;
  const exists = current.some((s) => s.id === story.id);
  const updated = exists
    ? current.map((s) => (s.id === story.id ? story : s))
    : [story, ...current];
  const next: UserProgressState = {
    ...prev,
    carlStories: updated,
  };
  saveProgress(next);
  return next;
}

export function deleteCarlStory(prev: UserProgressState, storyId: string): UserProgressState {
  const current = prev.carlStories || DEFAULT_CARL_STORIES;
  const next: UserProgressState = {
    ...prev,
    carlStories: current.filter((s) => s.id !== storyId),
  };
  saveProgress(next);
  return next;
}

export function addGeneratedDsaQuestion(
  prev: UserProgressState,
  question: Question
): UserProgressState {
  const existing = prev.generatedDsaQuestions || [];
  const next: UserProgressState = {
    ...prev,
    generatedDsaQuestions: [question, ...existing],
  };
  saveProgress(next);
  return next;
}

export interface ThemeOptionMeta {
  id: ThemeId;
  name: string;
  tag: string;
  isDark: boolean;
  canvas: string;
  card: string;
  border: string;
  text: string;
  accent: string;
}

export const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: 'obsidian-lavender',
    name: 'Obsidian Lavender',
    tag: 'Default',
    isDark: true,
    canvas: '#09090B',
    card: '#121216',
    border: '#27272A',
    text: '#FAFAFA',
    accent: '#9D7FEA',
  },
  {
    id: 'alabaster-lavender',
    name: 'Alabaster Lavender',
    tag: 'Crisp Daylight',
    isDark: false,
    canvas: '#FFFFFF',
    card: '#F8F7FC',
    border: '#E4E4E7',
    text: '#09090B',
    accent: '#9D7FEA',
  },
  {
    id: 'crimson-noir',
    name: 'Crimson Noir',
    tag: 'Red & Black',
    isDark: true,
    canvas: '#070709',
    card: '#120D0F',
    border: '#2E1A21',
    text: '#FAFAFA',
    accent: '#EF4444',
  },
  {
    id: 'scarlet-ivory',
    name: 'Scarlet Ivory',
    tag: 'Red & White',
    isDark: false,
    canvas: '#FFFFFF',
    card: '#FDF8F8',
    border: '#E8DCDC',
    text: '#111115',
    accent: '#DC2626',
  },
  {
    id: 'cyber-emerald',
    name: 'Cyber Emerald',
    tag: 'Matrix Slate',
    isDark: true,
    canvas: '#060B09',
    card: '#0D1613',
    border: '#1E332B',
    text: '#F4FBF8',
    accent: '#10B981',
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight',
    tag: 'Sky Slate',
    isDark: true,
    canvas: '#0B0E17',
    card: '#131826',
    border: '#232B42',
    text: '#F8FAFC',
    accent: '#38BDF8',
  },
  {
    id: 'amber-terminal',
    name: 'Amber Terminal',
    tag: 'Retro Phosphor',
    isDark: true,
    canvas: '#0A0806',
    card: '#14100C',
    border: '#2D231A',
    text: '#FAFAF9',
    accent: '#F59E0B',
  },
  {
    id: 'sakura-velvet',
    name: 'Sakura Velvet',
    tag: 'Blossom Noir',
    isDark: true,
    canvas: '#0C080B',
    card: '#171015',
    border: '#30202B',
    text: '#FDF2F8',
    accent: '#F472B6',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    tag: 'Ice Slate',
    isDark: false,
    canvas: '#F8FAFC',
    card: '#FFFFFF',
    border: '#CBD5E1',
    text: '#0F172A',
    accent: '#0284C7',
  },
  {
    id: 'matcha-cream',
    name: 'Matcha Cream',
    tag: 'Botanical Sage',
    isDark: false,
    canvas: '#FAFBF7',
    card: '#F2F5EC',
    border: '#D7E0CC',
    text: '#142317',
    accent: '#16A34A',
  },
  {
    id: 'cyberpunk-synth',
    name: 'Cyberpunk Synth',
    tag: 'Orchid Violet',
    isDark: true,
    canvas: '#090512',
    card: '#130B24',
    border: '#2C1A4D',
    text: '#FAF5FF',
    accent: '#E879F9',
  },
  {
    id: 'espresso-parchment',
    name: 'Espresso Parchment',
    tag: 'Warm Editorial',
    isDark: false,
    canvas: '#FDFBF7',
    card: '#F5EFE6',
    border: '#E2D6C5',
    text: '#1C1917',
    accent: '#B45309',
  },
];

export function loadTheme(): ThemeId {
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'light') return 'alabaster-lavender';
    if (val === 'dark') return 'obsidian-lavender';
    if (THEME_OPTIONS.some((t) => t.id === val)) return val as ThemeId;
    return 'obsidian-lavender';
  } catch {
    return 'obsidian-lavender';
  }
}

export function saveTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export interface FontPresetMeta {
  id: FontPreset;
  order: number;
  label: string;
  desc: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  sampleHeadline: string;
  sampleCode: string;
}

export const FONT_PRESETS: FontPresetMeta[] = [
  {
    id: 'modern',
    order: 1,
    label: 'Modern Tech',
    desc: 'Space Grotesk + Inter + JetBrains Mono',
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    sampleHeadline: 'Pipeline Watermark SLA',
    sampleCode: 'OVER (PARTITION BY user_id)',
  },
  {
    id: 'editorial',
    order: 2,
    label: 'Editorial Minimal',
    desc: 'Outfit + Plus Jakarta Sans + Fira Code',
    headingFont: "'Outfit', sans-serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
    monoFont: "'Fira Code', monospace",
    sampleHeadline: 'Lakehouse Star Schema',
    sampleCode: 'SELECT row_num != 1 => MERGE',
  },
  {
    id: 'classic',
    order: 3,
    label: 'Classic Clean',
    desc: 'Inter + Inter + JetBrains Mono',
    headingFont: "'Inter', sans-serif",
    bodyFont: "'Inter', sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    sampleHeadline: 'Staff Data Architecture',
    sampleCode: 'QUALIFY ROW_NUMBER() = 1',
  },
  {
    id: 'geometric-pro',
    order: 4,
    label: 'Geometric Pro',
    desc: 'Manrope + DM Sans + Source Code Pro',
    headingFont: "'Manrope', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    monoFont: "'Source Code Pro', monospace",
    sampleHeadline: 'Incremental Backfill DAG',
    sampleCode: 'WHERE dt >= CURRENT_DATE - 7',
  },
  {
    id: 'swiss-grid',
    order: 5,
    label: 'Swiss Grid',
    desc: 'Work Sans + IBM Plex Sans + IBM Plex Mono',
    headingFont: "'Work Sans', sans-serif",
    bodyFont: "'IBM Plex Sans', sans-serif",
    monoFont: "'IBM Plex Mono', monospace",
    sampleHeadline: 'Deterministic Shuffle Plan',
    sampleCode: 'df.repartition(64, "tenant")',
  },
  {
    id: 'neo-grotesque',
    order: 6,
    label: 'Neo-Grotesque',
    desc: 'Sora + Rubik + Space Mono',
    headingFont: "'Sora', sans-serif",
    bodyFont: "'Rubik', sans-serif",
    monoFont: "'Space Mono', monospace",
    sampleHeadline: 'Idempotent Kafka Sink',
    sampleCode: 'COMMIT OFFSET = 948120',
  },
  {
    id: 'sharp-tech',
    order: 7,
    label: 'Sharp Tech',
    desc: 'Syne + Inter + JetBrains Mono',
    headingFont: "'Syne', sans-serif",
    bodyFont: "'Inter', sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    sampleHeadline: 'Vector RAG Indexing',
    sampleCode: 'ANN_SEARCH(embed, k=12)',
  },
  {
    id: 'humanist-crisp',
    order: 8,
    label: 'Humanist Crisp',
    desc: 'Nunito Sans + Lato + Roboto Mono',
    headingFont: "'Nunito Sans', sans-serif",
    bodyFont: "'Lato', sans-serif",
    monoFont: "'Roboto Mono', monospace",
    sampleHeadline: 'SCD Type-2 Dimension',
    sampleCode: 'valid_to = TIMESTAMP "9999"',
  },
  {
    id: 'executive-serif',
    order: 9,
    label: 'Executive Serif-Sans',
    desc: 'Playfair Display + Plus Jakarta Sans + Fira Code',
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
    monoFont: "'Fira Code', monospace",
    sampleHeadline: 'Hiring Committee Rubric',
    sampleCode: 'SLA_P99 <= 250ms && ZERO_LOSS',
  },
  {
    id: 'compact-terminal',
    order: 10,
    label: 'Compact Terminal',
    desc: 'Chakra Petch + IBM Plex Sans + Share Tech Mono',
    headingFont: "'Chakra Petch', sans-serif",
    bodyFont: "'IBM Plex Sans', sans-serif",
    monoFont: "'Share Tech Mono', monospace",
    sampleHeadline: 'Telemetry Ingestion Bus',
    sampleCode: 'WATERMARK_DELAY = 15s;',
  },
  {
    id: 'nordic-clean',
    order: 11,
    label: 'Nordic Clean',
    desc: 'Lexend + Albert Sans + JetBrains Mono',
    headingFont: "'Lexend', sans-serif",
    bodyFont: "'Albert Sans', sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    sampleHeadline: 'H3 Spatial Catchment',
    sampleCode: 'h3.latlng_to_cell(lat, lon, 8)',
  },
  {
    id: 'high-contrast',
    order: 12,
    label: 'High-Contrast Modern',
    desc: 'Montserrat + Open Sans + Inconsolata',
    headingFont: "'Montserrat', sans-serif",
    bodyFont: "'Open Sans', sans-serif",
    monoFont: "'Inconsolata', monospace",
    sampleHeadline: 'Petabyte Scan Pruning',
    sampleCode: 'CLUSTER BY region, event_ts',
  },
  {
    id: 'mono-hacker',
    order: 13,
    label: 'Pure Monospace Hacker',
    desc: 'JetBrains Mono (All Tiers)',
    headingFont: "'JetBrains Mono', monospace",
    bodyFont: "'JetBrains Mono', monospace",
    monoFont: "'JetBrains Mono', monospace",
    sampleHeadline: 'EXPLAIN ANALYZE STAGE 01',
    sampleCode: 'SCAN orders USING idx_dt',
  },
];

export function loadFontPreset(): FontPreset {
  try {
    const val = localStorage.getItem(FONT_PRESET_KEY);
    if (FONT_PRESETS.some((p) => p.id === val)) {
      return val as FontPreset;
    }
    return 'modern';
  } catch {
    return 'modern';
  }
}

export function saveFontPreset(preset: FontPreset): void {
  try {
    localStorage.setItem(FONT_PRESET_KEY, preset);
  } catch {
    // ignore
  }
}

export function loadProviderSettings(): AiProviderSettings {
  try {
    const raw = localStorage.getItem(PROVIDER_KEY);
    if (!raw) return { provider: 'gemini', customApiKey: '', customModel: '' };
    return JSON.parse(raw) as AiProviderSettings;
  } catch {
    return { provider: 'gemini', customApiKey: '', customModel: '' };
  }
}

export function saveProviderSettings(settings: AiProviderSettings): void {
  try {
    localStorage.setItem(PROVIDER_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
