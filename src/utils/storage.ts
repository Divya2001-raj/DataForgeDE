import {
  AiProviderSettings,
  BlindSpotRecord,
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

export function getDefaultTargetInterviewDate(): string {
  return addDaysIso(30);
}

const BLIND_SPOT_RULES: Array<{ tag: string; keywords: string[] }> = [
  { tag: 'Null handling', keywords: ['null', 'coalesce', 'nullif', 'missing', 'zero', 'divide', 'division'] },
  { tag: 'Window frame bounds', keywords: ['window', 'rows between', 'range between', 'lag', 'lead', 'qualify', 'row_number', 'dense_rank', 'session', 'running'] },
  { tag: 'Skew salting', keywords: ['skew', 'salt', 'hot key', 'broadcast', 'shuffle', 'oom', 'spill', 'repartition', 'straggler'] },
  { tag: 'Late-arriving watermarks', keywords: ['watermark', 'late', 'out-of-order', 'dlq', 'dead-letter', 'allowed_lateness', 'pubsub', 'kafka', 'streaming'] },
  { tag: 'SCD2 & grain boundaries', keywords: ['scd', 'bi-temporal', 'grain', 'fan-out', 'surrogate', 'dimension', 'star schema'] },
  { tag: 'Idempotent MERGE & dedup', keywords: ['merge', 'upsert', 'dedup', 'idempoten', 'backfill', 'insert_overwrite', 'duplicate'] },
  { tag: 'Partition pruning & clustering', keywords: ['partition', 'cluster', 'sargable', 'prun', 'materialized view', 'bi engine', 'slot'] },
  { tag: 'Geospatial H3/S2 tiling', keywords: ['h3', 's2', 'geospatial', 'imagery', 'tile', 'raster', 'polygon', 'catchment'] },
  { tag: 'Dual-write & shadow cutover', keywords: ['flume', 'hadoop', 'migration', 'dual-write', 'shadow', 'rollback', 'cutover'] },
];

export function extractBlindSpotTags(sources: Array<string | undefined>): string[] {
  const combined = sources.filter(Boolean).join(' ').toLowerCase();
  const matched: string[] = [];
  for (const rule of BLIND_SPOT_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      matched.push(rule.tag);
    }
  }
  if (matched.length === 0) {
    matched.push('Edge-case bounds');
  }
  return matched.slice(0, 2);
}

function incrementBlindSpots(
  existing: Record<string, BlindSpotRecord> | undefined,
  tags: string[],
  sampleTitle?: string,
  trackId?: TrackId
): Record<string, BlindSpotRecord> {
  const next = { ...(existing || {}) };
  const nowIso = new Date().toISOString();
  for (const tag of tags) {
    const cur = next[tag];
    next[tag] = {
      tag,
      count: (cur?.count || 0) + 1,
      lastSeenAt: nowIso,
      sampleTitle: sampleTitle || cur?.sampleTitle,
      trackId: trackId || cur?.trackId,
    };
  }
  return next;
}

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
    targetInterviewDate: getDefaultTargetInterviewDate(),
    blindSpotCounts: {},
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
      targetInterviewDate: parsed.targetInterviewDate || getDefaultTargetInterviewDate(),
      blindSpotCounts: parsed.blindSpotCounts || {},
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
    concept?: string;
    tags?: string[];
    dsaPattern?: string;
    failedHints?: string[];
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

  // Auto-track recurring blind spots on failed test assertions
  let nextBlindSpots = prev.blindSpotCounts || {};
  if (!passed) {
    const detected = extractBlindSpotTags([
      ...(meta?.failedHints || []),
      meta?.concept,
      meta?.dsaPattern,
      ...(meta?.tags || []),
      meta?.title,
    ]);
    nextBlindSpots = incrementBlindSpots(
      nextBlindSpots,
      detected,
      meta?.title,
      meta?.trackId
    );
  }

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
    blindSpotCounts: nextBlindSpots,
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

  // Auto-track recurring blind spots on Lean Hire / No Hire verdicts
  let nextBlindSpots = prev.blindSpotCounts || {};
  if (attempt.verdict === 'Lean Hire' || attempt.verdict === 'No Hire') {
    const detected = extractBlindSpotTags([
      ...(attempt.growthAreas || []),
      attempt.summary,
      attempt.title,
      attempt.roundType,
    ]);
    nextBlindSpots = incrementBlindSpots(
      nextBlindSpots,
      detected,
      `Mock #${String(attempt.mockNumber).padStart(2, '0')} · ${attempt.title}`
    );
  }

  const next: UserProgressState = {
    ...prev,
    mockHistory: [attempt, ...prev.mockHistory],
    activityDates,
    streakDays: streak,
    longestStreakDays: longest,
    blindSpotCounts: nextBlindSpots,
    sm2Queue: nextSm2,
  };
  saveProgress(next);
  return next;
}

export function updateTargetInterviewDate(
  prev: UserProgressState,
  targetInterviewDate: string
): UserProgressState {
  const next: UserProgressState = {
    ...prev,
    targetInterviewDate,
  };
  saveProgress(next);
  return next;
}

export function clearBlindSpots(prev: UserProgressState): UserProgressState {
  const next: UserProgressState = {
    ...prev,
    blindSpotCounts: {},
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
  secondary: string;
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
    secondary: '#F472B6',
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
    secondary: '#6D28D9',
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
    secondary: '#FB7185',
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
    secondary: '#F97316',
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
    secondary: '#38BDF8',
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
    secondary: '#818CF8',
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
    secondary: '#FB7185',
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
    secondary: '#C084FC',
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
    secondary: '#0D9488',
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
    secondary: '#0D9488',
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
    secondary: '#22D3EE',
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
    secondary: '#0F766E',
  },
  {
    id: 'velvet-maroon',
    name: 'Velvet Maroon',
    tag: 'Maroon-Rose',
    isDark: true,
    canvas: '#0A0507',
    card: '#140A0E',
    border: '#331621',
    text: '#FDF2F5',
    accent: '#BE123C',
    secondary: '#F472B6',
  },
  {
    id: 'bordeaux-cream',
    name: 'Bordeaux Cream',
    tag: 'Burgundy Maroon',
    isDark: false,
    canvas: '#FDF9FA',
    card: '#F7EEF0',
    border: '#E3CCD2',
    text: '#1F0B11',
    accent: '#881337',
    secondary: '#BE123C',
  },
  {
    id: 'royal-gold-onyx',
    name: 'Royal Gold & Onyx',
    tag: 'Burnished Gold',
    isDark: true,
    canvas: '#08080A',
    card: '#121116',
    border: '#2B2633',
    text: '#FAF8F5',
    accent: '#D97706',
    secondary: '#FBBF24',
  },
  {
    id: 'cobalt-slate',
    name: 'Cobalt Slate',
    tag: 'Electric Cobalt',
    isDark: true,
    canvas: '#060A12',
    card: '#0E1626',
    border: '#1E2E4D',
    text: '#F8FAFC',
    accent: '#3B82F6',
    secondary: '#22D3EE',
  },
  {
    id: 'teal-graphite',
    name: 'Teal Graphite',
    tag: 'Deep Cyan-Teal',
    isDark: true,
    canvas: '#060D0E',
    card: '#0D191B',
    border: '#1B3438',
    text: '#F0FDFA',
    accent: '#14B8A6',
    secondary: '#38BDF8',
  },
  {
    id: 'rosewood-linen',
    name: 'Rosewood Linen',
    tag: 'Warm Rosewood',
    isDark: false,
    canvas: '#FAF6F5',
    card: '#F2EAE8',
    border: '#DDD0CD',
    text: '#1C1413',
    accent: '#9F1239',
    secondary: '#D97706',
  },
  {
    id: 'nord-polar',
    name: 'Nord Polar Night',
    tag: 'Arctic Frost',
    isDark: true,
    canvas: '#141821',
    card: '#1D2330',
    border: '#2E374A',
    text: '#ECEFF4',
    accent: '#88C0D0',
    secondary: '#81A1C1',
  },
  {
    id: 'gruvbox-carbon',
    name: 'Gruvbox Carbon',
    tag: 'Warm Retro',
    isDark: true,
    canvas: '#141210',
    card: '#1E1B18',
    border: '#38322B',
    text: '#FBF1C7',
    accent: '#FE8019',
    secondary: '#FABD2F',
  },
  {
    id: 'monokai-obsidian',
    name: 'Monokai Obsidian',
    tag: 'Acid Lime',
    isDark: true,
    canvas: '#121114',
    card: '#1C1B20',
    border: '#33303B',
    text: '#F8F8F2',
    accent: '#A6E22E',
    secondary: '#66D9EF',
  },
  {
    id: 'one-dark-slate',
    name: 'One Dark Slate',
    tag: 'Studio Blue',
    isDark: true,
    canvas: '#13161C',
    card: '#1C212B',
    border: '#2D3545',
    text: '#EEF1F6',
    accent: '#61AFEF',
    secondary: '#C678DD',
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    tag: 'Deep Sapphire',
    isDark: true,
    canvas: '#070914',
    card: '#0E1329',
    border: '#1E2852',
    text: '#EEF2FF',
    accent: '#6366F1',
    secondary: '#38BDF8',
  },
  {
    id: 'rose-pine-moon',
    name: 'Rosé Pine Moon',
    tag: 'Twilight Rose',
    isDark: true,
    canvas: '#161422',
    card: '#211E33',
    border: '#393552',
    text: '#E0DEF4',
    accent: '#EB6F92',
    secondary: '#9CCFD8',
  },
  {
    id: 'deep-crimson',
    name: 'Crimson Noir (Deep)',
    tag: 'Deep Crimson',
    isDark: true,
    canvas: '#070506',
    card: '#120A0D',
    border: '#2B141B',
    text: '#FFF1F3',
    accent: '#E11D48',
    secondary: '#FB7185',
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    tag: 'Rich Emerald',
    isDark: true,
    canvas: '#040B08',
    card: '#0A1711',
    border: '#163326',
    text: '#ECFDF5',
    accent: '#10B981',
    secondary: '#34D399',
  },
  {
    id: 'amethyst-velvet',
    name: 'Amethyst Velvet',
    tag: 'Royal Amethyst',
    isDark: true,
    canvas: '#0A0610',
    card: '#140D21',
    border: '#2B1D47',
    text: '#F5F3FF',
    accent: '#A855F7',
    secondary: '#E879F9',
  },
  {
    id: 'solarized-midnight',
    name: 'Solarized Midnight',
    tag: 'Solarized Cyan',
    isDark: true,
    canvas: '#002B36',
    card: '#073642',
    border: '#134E5E',
    text: '#FDF6E3',
    accent: '#2AA198',
    secondary: '#268BD2',
  },
  {
    id: 'dracula-nocturne',
    name: 'Dracula Nocturne',
    tag: 'Pink-Violet',
    isDark: true,
    canvas: '#191A21',
    card: '#282A36',
    border: '#44475A',
    text: '#F8F8F2',
    accent: '#FF79C6',
    secondary: '#BD93F9',
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    tag: 'Pastel Mauve',
    isDark: true,
    canvas: '#11111B',
    card: '#1E1E2E',
    border: '#313244',
    text: '#CDD6F4',
    accent: '#CBA6F7',
    secondary: '#89B4FA',
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    tag: 'Organic Matcha',
    isDark: false,
    canvas: '#F6F9F4',
    card: '#EBF2E6',
    border: '#D2E0C8',
    text: '#162413',
    accent: '#4D7C0F',
    secondary: '#15803D',
  },
  {
    id: 'sandstone-editorial',
    name: 'Sandstone Editorial',
    tag: 'Warm Amber Ink',
    isDark: false,
    canvas: '#FAF7F2',
    card: '#F2ECE1',
    border: '#DFD5C5',
    text: '#241E16',
    accent: '#B45309',
    secondary: '#0F766E',
  },
  {
    id: 'lavender-cloud',
    name: 'Lavender Cloud',
    tag: 'Soft Violet',
    isDark: false,
    canvas: '#F9F7FD',
    card: '#F0EBF9',
    border: '#DDD3F0',
    text: '#1E1533',
    accent: '#7C3AED',
    secondary: '#DB2777',
  },
  {
    id: 'arctic-alabaster',
    name: 'Arctic Alabaster',
    tag: 'Ocean Blue',
    isDark: false,
    canvas: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    accent: '#0284C7',
    secondary: '#2563EB',
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

export const OPENAI_API_KEY_STORAGE = 'openai_api_key';

export function loadOpenAiApiKey(): string {
  try {
    return (localStorage.getItem(OPENAI_API_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
}

export function saveOpenAiApiKey(key: string): void {
  try {
    const clean = key.trim();
    if (clean) {
      localStorage.setItem(OPENAI_API_KEY_STORAGE, clean);
    } else {
      localStorage.removeItem(OPENAI_API_KEY_STORAGE);
    }
  } catch {
    // ignore
  }
}

export function isValidOpenAiKey(key: string): boolean {
  const clean = key.trim();
  return clean.startsWith('sk-') && clean.length >= 12;
}

export function sanitizeProviderSettings(settings: Partial<AiProviderSettings> | null | undefined): AiProviderSettings {
  const storedOpenAiKey = loadOpenAiApiKey();
  const rawCustomKey = typeof settings?.customApiKey === 'string' ? settings.customApiKey.trim() : '';
  const customModel = typeof settings?.customModel === 'string' ? settings.customModel.trim() : '';
  const requested = settings?.provider;

  if (requested === 'openai') {
    const effectiveOpenAiKey = rawCustomKey || storedOpenAiKey;
    if (isValidOpenAiKey(effectiveOpenAiKey)) {
      return {
        provider: 'openai',
        customApiKey: effectiveOpenAiKey,
        customModel: customModel || 'gpt-4o',
      };
    }
    return {
      provider: 'gemini',
      customApiKey: '',
      customModel: 'gemini-2.5-flash',
    };
  }

  const isLegacyExternal = requested === 'anthropic' || requested === 'openrouter';
  if (isLegacyExternal && rawCustomKey.length >= 8) {
    return { provider: requested, customApiKey: rawCustomKey, customModel };
  }

  return {
    provider: 'gemini',
    customApiKey: rawCustomKey,
    customModel: customModel === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
  };
}

export function loadProviderSettings(): AiProviderSettings {
  try {
    const raw = localStorage.getItem(PROVIDER_KEY);
    if (!raw) {
      return { provider: 'gemini', customApiKey: '', customModel: 'gemini-2.5-flash' };
    }
    const parsed = JSON.parse(raw) as Partial<AiProviderSettings>;
    if (parsed.provider === 'openai' && !parsed.customApiKey) {
      parsed.customApiKey = loadOpenAiApiKey();
    }
    return sanitizeProviderSettings(parsed);
  } catch {
    return { provider: 'gemini', customApiKey: '', customModel: 'gemini-2.5-flash' };
  }
}

export function saveProviderSettings(settings: AiProviderSettings): AiProviderSettings {
  if (settings.provider === 'openai') {
    saveOpenAiApiKey(settings.customApiKey);
  }
  const safe = sanitizeProviderSettings(settings);
  try {
    localStorage.setItem(PROVIDER_KEY, JSON.stringify(safe));
  } catch {
    // ignore
  }
  return safe;
}

export function sanitizeAiErrorMessage(raw: unknown, fallback = 'AI service is temporarily unavailable. Please retry.'): string {
  const msg = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '';
  if (!msg.trim()) return fallback;

  const lower = msg.toLowerCase();
  if (lower.includes('openai')) {
    return msg.trim();
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('overloaded') || lower.includes('high demand')) {
    return 'Google Gemini is temporarily experiencing high demand (503). Click Retry to run again.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('rate limit') || lower.includes('quota')) {
    return 'Google Gemini rate limit reached (429). Wait a moment and click Retry.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error')) {
    return 'Unable to reach the AI server. Check your connection and click Retry.';
  }

  const jsonStart = msg.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(msg.slice(jsonStart)) as {
        error?: { message?: string };
        message?: string;
      };
      const inner = parsed.error?.message || parsed.message;
      if (inner && inner.trim()) return inner.trim();
    } catch {
      // strip raw JSON snippet if partial
    }
    const stripped = msg.slice(0, jsonStart).trim();
    return stripped || fallback;
  }

  return msg.trim();
}
