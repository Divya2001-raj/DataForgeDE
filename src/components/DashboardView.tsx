import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TRACKS } from '../data/tracks';
import { ALL_QUESTIONS, QUESTIONS_BY_TRACK } from '../data/questions';
import { GOOGLE_ROUND_ORDER } from '../data/googleMocks';
import { getDailyPulseForDate } from '../data/dailyPulse';
import {
  computeQuestProgress,
  GOOGLE_CLOUD_DE_QUESTS,
  TOTAL_QUEST_LEVELS,
} from '../data/quests';
import { getDefaultTargetInterviewDate, sanitizeAiErrorMessage } from '../utils/storage';
import { generateDailyPulse } from '../services/geminiAiService';
import {
  DailyPulseItem,
  GoogleRoundId,
  Sm2ReviewItem,
  StudyNote,
  TrackId,
  UserProgressState,
} from '../types/platform';
import { RankBadges } from './visuals/CelebrationAndBadges';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Flame,
  Mic,
  Pause,
  Pin,
  Play,
  RefreshCw,
  Repeat,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  progress: UserProgressState;
  onSelectTrack: (trackId: TrackId) => void;
  onOpenQuests: () => void;
  onOpenAssessments: () => void;
  onLaunchMock: (mockNumber: number) => void;
  onOpenConcept: (conceptName: string) => void;
  onPinNote: (note: StudyNote) => void;
  onStartSm2Review: (item: Sm2ReviewItem) => void;
  onLaunchWeakSpotMock: (weakTrackIds: TrackId[]) => void;
  onUpdateTargetDate: (isoDate: string) => void;
  onClearBlindSpots: () => void;
}

const ProgressRing: React.FC<{ pct: number; color?: string }> = ({
  pct,
  color = 'var(--accent-primary)',
}) => {
  const radius = 17;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circ - (clamped / 100) * circ;

  return (
    <svg className="w-11 h-11 -rotate-90 shrink-0" viewBox="0 0 44 44">
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-subtle"
      />
      <motion.circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  progress,
  onSelectTrack,
  onOpenQuests,
  onOpenAssessments,
  onLaunchMock,
  onOpenConcept,
  onPinNote,
  onStartSm2Review,
  onLaunchWeakSpotMock,
  onUpdateTargetDate,
  onClearBlindSpots,
}) => {
  const [pulse, setPulse] = useState<DailyPulseItem>(() => getDailyPulseForDate(new Date()));
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseError, setPulseError] = useState<string | null>(null);
  const [pulseInfo, setPulseInfo] = useState<string | null>(null);
  const [pulsePinned, setPulsePinned] = useState(false);
  const [editingTargetDate, setEditingTargetDate] = useState(false);

  // 2-Minute Intro & Architecture Pitch Rehearsal Timer state
  const [pitchExpanded, setPitchExpanded] = useState(true);
  const [pitchSecLeft, setPitchSecLeft] = useState(120);
  const [pitchRunning, setPitchRunning] = useState(false);
  const [pitchChecked, setPitchChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!pitchRunning) return;
    const id = window.setInterval(() => {
      setPitchSecLeft((prev) => {
        if (prev <= 1) {
          setPitchRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pitchRunning]);

  const totalQuestions = ALL_QUESTIONS.length;
  const solvedSet = useMemo(() => new Set(progress.solvedQuestionIds), [progress.solvedQuestionIds]);
  const solvedCount = solvedSet.size;
  const solvedPctNum = totalQuestions > 0 ? (solvedCount / totalQuestions) * 100 : 0;
  const solvedPct = solvedPctNum.toFixed(1);

  const completedMocks = progress.mockHistory.length;
  const mockPctNum = (completedMocks / 50) * 100;
  const avgMockScore =
    completedMocks > 0
      ? Math.round(progress.mockHistory.reduce((sum, m) => sum + m.score, 0) / completedMocks)
      : 0;
  const bestMockScore =
    completedMocks > 0 ? Math.max(...progress.mockHistory.map((m) => m.score)) : 0;

  const avgVerdict =
    completedMocks === 0
      ? 'Not Started'
      : avgMockScore >= 85
      ? 'Strong Hire'
      : avgMockScore >= 72
      ? 'Hire'
      : avgMockScore >= 58
      ? 'Lean Hire'
      : 'Needs Prep';

  const firstTryPassCount = (progress.firstTryPassIds || []).length;
  const firstTryTotal = firstTryPassCount + (progress.firstTryFailIds || []).length;
  const firstTryPct = firstTryTotal > 0 ? Math.round((firstTryPassCount / firstTryTotal) * 100) : 0;
  const accuracyPct =
    progress.totalSubmissions > 0
      ? Math.round((progress.passedSubmissions / progress.totalSubmissions) * 100)
      : 0;

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayCount = progress.activityDates[todayIso] || 0;
  const dailyTarget = progress.dailyTarget || 5;

  const diffStats = (['Easy', 'Medium', 'Hard'] as const).map((diff) => {
    const matching = ALL_QUESTIONS.filter((q) => q.difficulty === diff);
    const solved = matching.filter((q) => solvedSet.has(q.id)).length;
    return {
      diff,
      total: matching.length,
      solved,
      pct: matching.length > 0 ? Math.round((solved / matching.length) * 100) : 0,
    };
  });

  const roundReadiness = GOOGLE_ROUND_ORDER.map((round: GoogleRoundId) => {
    const linkedTracks = TRACKS.filter((t) => t.googleRoundMapping === round).map((t) => t.id);
    const qs = ALL_QUESTIONS.filter((q) => linkedTracks.includes(q.trackId));
    const solvedQ = qs.filter((q) => solvedSet.has(q.id)).length;
    const mockMatches = progress.mockHistory.filter((m) => m.roundType === round);
    const mockAvg =
      mockMatches.length > 0
        ? Math.round(mockMatches.reduce((a, b) => a + b.score, 0) / mockMatches.length)
        : null;

    const qFactor = qs.length > 0 ? (solvedQ / qs.length) * 100 : 0;
    const readiness = mockAvg !== null ? Math.round(qFactor * 0.4 + mockAvg * 0.6) : Math.round(qFactor);
    return {
      round,
      solvedQ,
      totalQ: qs.length,
      mocksDone: mockMatches.length,
      readiness: Math.min(100, readiness),
    };
  });

  // Identify 3 weakest tracks for Weak-Spot Custom Mock
  const weakTrackIds = useMemo(() => {
    const scored = TRACKS.map((t) => {
      const qs = QUESTIONS_BY_TRACK[t.id] || [];
      const solved = qs.filter((q) => solvedSet.has(q.id)).length;
      const pct = qs.length > 0 ? solved / qs.length : 0;
      return { id: t.id, pct };
    }).sort((a, b) => a.pct - b.pct);
    return scored.slice(0, 3).map((s) => s.id);
  }, [solvedSet]);

  const sm2Items = useMemo(() => {
    return Object.values(progress.sm2Queue || {}).sort((a, b) =>
      a.nextReviewDate.localeCompare(b.nextReviewDate)
    );
  }, [progress.sm2Queue]);

  // 12-week (84 days) Medium Lavender activity heatmap
  const heatmapDays = Array.from({ length: 84 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (83 - idx));
    const iso = d.toISOString().slice(0, 10);
    const count = progress.activityDates[iso] || 0;
    return { iso, count };
  });

  const weeks: Array<Array<{ iso: string; count: number }>> = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(heatmapDays.slice(w * 7, w * 7 + 7));
  }

  const handleRefreshPulse = async () => {
    if (pulseLoading) return;
    setPulseLoading(true);
    setPulsePinned(false);
    setPulseError(null);
    setPulseInfo(null);
    try {
      const data = await generateDailyPulse();
      if (data.quote && data.topicName) {
        setPulse(data);
        if (data.fallbackFrom) {
          setPulseInfo(`Primary model busy — generated via ${data.modelUsed}.`);
        } else if (data.retried) {
          setPulseInfo(`Recovered automatically on ${data.modelUsed}.`);
        }
      } else {
        throw new Error('Received incomplete Daily Pulse response. Click Retry.');
      }
    } catch (err: unknown) {
      setPulseError(sanitizeAiErrorMessage(err, 'Unable to refresh Daily Pulse right now.'));
    } finally {
      setPulseLoading(false);
    }
  };

  const handlePinPulse = () => {
    onPinNote({
      id: `pulse-${Date.now()}`,
      title: `Daily Pulse: ${pulse.topicName}`,
      concept: pulse.topicName,
      content: `Quote: "${pulse.quote}" — ${pulse.quoteAuthor}\n\nWar Story (${pulse.warStoryTitle}): ${pulse.warStoryFact}\n\n• What it is: ${pulse.topicBullets.what}\n• Why it matters: ${pulse.topicBullets.why}\n• Common trap: ${pulse.topicBullets.trap}`,
      createdAt: new Date().toISOString(),
    });
    setPulsePinned(true);
    setTimeout(() => setPulsePinned(false), 2200);
  };

  // Sprint / Season milestone calculations across the 50 Google Mock Interviews
  const uniqueCompletedMockNums = useMemo(() => {
    const s = new Set<number>();
    for (const m of progress.mockHistory) {
      if (m.mockNumber >= 1 && m.mockNumber <= 50) s.add(m.mockNumber);
    }
    return s;
  }, [progress.mockHistory]);

  const sprintCompletedCount = uniqueCompletedMockNums.size;
  const sprintTotalTarget = 50;
  const sprintRemainingCount = Math.max(0, sprintTotalTarget - sprintCompletedCount);
  const nextLiveMockNumber = useMemo(() => {
    for (let n = 1; n <= sprintTotalTarget; n++) {
      if (!uniqueCompletedMockNums.has(n)) return n;
    }
    return sprintTotalTarget;
  }, [uniqueCompletedMockNums]);

  const sprintSegmentsTotal = 10;
  const sprintSegmentsFilled =
    sprintCompletedCount === 0
      ? 0
      : Math.min(
          sprintSegmentsTotal,
          Math.max(1, Math.round((sprintCompletedCount / sprintTotalTarget) * sprintSegmentsTotal))
        );

  const sprintTierIndex = Math.min(5, Math.floor(sprintCompletedCount / 10) + 1);
  const targetDateStr = progress.targetInterviewDate || getDefaultTargetInterviewDate();
  const daysLeft = useMemo(() => {
    const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
    const targetMs = new Date(`${targetDateStr}T00:00:00`).getTime();
    const diff = Math.ceil((targetMs - todayMs) / 86400000);
    return Number.isFinite(diff) ? Math.max(0, diff) : 30;
  }, [todayIso, targetDateStr]);

  const dailyPaceText =
    daysLeft > 0 && daysLeft <= 10 ? '3 Problems + 1 Design/Mock' : '2 Problems + 1 Design/Mock';

  const topBlindSpots = useMemo(() => {
    return Object.values(progress.blindSpotCounts || {})
      .sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt))
      .slice(0, 5);
  }, [progress.blindSpotCounts]);

  const pitchTotalSec = 120;
  const pitchPct = (pitchSecLeft / pitchTotalSec) * 100;
  const pitchRingColor =
    pitchSecLeft <= 15 ? '#EF4444' : pitchSecLeft <= 35 ? '#F59E0B' : 'var(--accent-primary)';
  const pitchRadius = 26;
  const pitchCirc = 2 * Math.PI * pitchRadius;
  const pitchDashOffset = pitchCirc - (pitchPct / 100) * pitchCirc;
  const pitchFormatted = `${String(Math.floor(pitchSecLeft / 60)).padStart(2, '0')}:${String(
    pitchSecLeft % 60
  ).padStart(2, '0')}`;

  const PITCH_STEPS = [
    { id: 'hook', label: 'Hook & Role', hint: 'Staff/Senior DE focus + cloud domain' },
    { id: 'scale', label: 'Scale & Tech Stack', hint: '10+ TB/day · BigQuery, Dataflow, Spark' },
    { id: 'bottleneck', label: 'Hardest Bottleneck Solved', hint: 'Skew salting, dual-write, or lag' },
    { id: 'impact', label: 'Business Impact', hint: 'Latency ↓, cost ↓, zero-loss SLA' },
  ];

  const sprintCalloutMessage =
    sprintCompletedCount === 0
      ? `Kick off Sprint Tier 1 with Mock #${String(nextLiveMockNumber).padStart(2, '0')}—consistent daily drills lock in Strong Hire verdicts.`
      : sprintRemainingCount > 0
      ? `Keep up your momentum in Tier ${sprintTierIndex} of 5—consistent daily drills lock in Strong Hire verdicts.`
      : 'All 50 Google Cloud loops completed—keep your Hiring Committee edge sharp with SM-2 & Weak-Spot drills.';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            📊 Progress &amp; Readiness Dashboard
          </h1>
          <p className="text-sm text-muted mt-1">
            Live local telemetry tracking {totalQuestions.toLocaleString()} Tier-1 Data Engineering problems across {TRACKS.length} tracks &amp; 50 6-round Google Cloud mock loops.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectTrack('sql')}
            className="btn-tactile px-4 py-2 text-xs font-semibold rounded-lg border border-subtle bg-card hover:border-accent whitespace-nowrap"
          >
            🗄️ Practice SQL &amp; Code
          </button>
          <button
            onClick={() => onLaunchWeakSpotMock(weakTrackIds)}
            className="btn-tactile px-4 py-2 text-xs font-semibold rounded-lg border border-accent bg-accent/15 text-accent hover:bg-accent/25 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            ⚡ Weak-Spot Custom Mock
          </button>
          <button
            onClick={onOpenAssessments}
            className="btn-tactile px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover flex items-center gap-1.5 whitespace-nowrap"
          >
            🎯 Launch Google Mock
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Season / Sprint Progress Hero Card */}
      <motion.section
        aria-label="Sprint Progress Hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[24px] border border-subtle bg-card p-6 sm:p-8 shadow-sm"
      >
        {/* Subtle Ambient Checkered-Flag & Mountain Peak Watermark */}
        <svg
          aria-hidden="true"
          viewBox="0 0 360 280"
          fill="none"
          className="pointer-events-none select-none absolute -right-4 top-0 h-full w-64 sm:w-80 text-primary opacity-[0.07] dark:opacity-[0.09]"
        >
          {/* Mountain Ridgelines */}
          <path
            d="M40 275 L155 110 L220 190 L275 95 L355 275 Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
          <path
            d="M40 275 L155 110 L220 190 L275 95 L355 275"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M155 110 L176 156 L146 168 L130 148"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            opacity="0.7"
          />
          {/* Summit Flagpole & Checkered Flag */}
          <line x1="275" y1="95" x2="275" y2="28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <g transform="translate(277, 30)">
            <rect x="0" y="0" width="60" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
            <rect x="0" y="0" width="15" height="12" fill="currentColor" />
            <rect x="30" y="0" width="15" height="12" fill="currentColor" />
            <rect x="15" y="12" width="15" height="12" fill="currentColor" />
            <rect x="45" y="12" width="15" height="12" fill="currentColor" />
            <rect x="0" y="24" width="15" height="12" fill="currentColor" />
            <rect x="30" y="24" width="15" height="12" fill="currentColor" />
          </g>
        </svg>

        <div className="relative z-10 space-y-6">
          {/* 1. Top Status Pill Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 dark:bg-[#163020] text-emerald-700 dark:text-[#4ADE80] border border-emerald-600/25 dark:border-[#4ADE80]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#4ADE80]" />
                Sprint progress
              </span>

              <button
                type="button"
                onClick={() => setEditingTargetDate((v) => !v)}
                title="Click to set target interview date"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-elevated text-primary border border-subtle hover:border-accent transition-colors tabular-nums"
              >
                <span>
                  ⏳ {String(daysLeft).padStart(2, '0')} {daysLeft === 1 ? 'Day' : 'Days'} Left • Daily Target: {dailyPaceText}
                </span>
                <Calendar className="w-3 h-3 text-accent shrink-0" />
              </button>

              {editingTargetDate && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated border border-accent/50 text-xs">
                  <label htmlFor="target-interview-date" className="text-[11px] text-muted font-medium">
                    Target:
                  </label>
                  <input
                    id="target-interview-date"
                    type="date"
                    min={todayIso}
                    value={targetDateStr}
                    onChange={(e) => {
                      if (e.target.value) {
                        onUpdateTargetDate(e.target.value);
                        setEditingTargetDate(false);
                      }
                    }}
                    className="bg-transparent text-xs font-mono text-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onLaunchMock(nextLiveMockNumber)}
              className="btn-tactile inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 dark:bg-[#163020] text-emerald-700 dark:text-[#4ADE80] border border-emerald-600/25 dark:border-[#4ADE80]/20 hover:border-emerald-500/60"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#4ADE80] animate-pulse" />
              {sprintRemainingCount > 0
                ? `Mock #${String(nextLiveMockNumber).padStart(2, '0')} is live`
                : 'All 50 Mocks mastered'}
            </button>
          </div>

          {/* 2. Bold Editorial Two-Line Headline */}
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.08] text-primary max-w-xl">
            The final stretch.
            <br />
            Make it count.
          </h2>

          {/* 3. Two Side-by-Side Elevated Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-[16px] border border-subtle bg-elevated px-5 py-4 sm:py-5">
              <div className="font-display text-[40px] font-extrabold leading-none tracking-tight text-primary tabular-nums">
                {sprintCompletedCount}
              </div>
              <div className="mt-2 text-xs font-medium text-muted">
                Mocks completed
              </div>
            </div>

            <div className="rounded-[16px] border border-subtle bg-elevated px-5 py-4 sm:py-5">
              <div className="font-display text-[40px] font-extrabold leading-none tracking-tight text-primary tabular-nums">
                {sprintRemainingCount}
              </div>
              <div className="mt-2 text-xs font-medium text-muted">
                Mocks remaining
              </div>
            </div>
          </div>

          {/* 4. 10-Segment Horizontal Pill Progress Bar */}
          <div className="space-y-2">
            <div
              className="grid grid-cols-10 gap-1.5"
              role="progressbar"
              aria-valuenow={sprintCompletedCount}
              aria-valuemin={0}
              aria-valuemax={sprintTotalTarget}
              aria-label="Google Mock Sprint Progress"
            >
              {Array.from({ length: sprintSegmentsTotal }, (_, segIdx) => {
                const filled = segIdx < sprintSegmentsFilled;
                return (
                  <div
                    key={segIdx}
                    className={`h-[6px] rounded-full transition-all duration-300 ${
                      filled ? '' : 'bg-subtle'
                    }`}
                    style={
                      filled
                        ? {
                            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                            boxShadow: '0 0 10px var(--accent-glow)',
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-muted tabular-nums">
              <span>{sprintCompletedCount} / {sprintTotalTarget} Google Cloud Loops</span>
              <span>{Math.round((sprintCompletedCount / sprintTotalTarget) * 100)}% Sprint Readiness</span>
            </div>
          </div>

          {/* 5. Motivational Sub-Section & Bottom Callout Banner */}
          <div className="space-y-3 pt-1">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-primary">
                Every point counts.
              </h3>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                Your cumulative accuracy{completedMocks > 0 ? ` (${accuracyPct}% pass rate · ${avgVerdict})` : ''} and mock verdicts determine your readiness for the Hiring Committee bar.
              </p>
            </div>

            <div className="rounded-[14px] border border-subtle bg-elevated px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-primary/90 leading-relaxed">
                {sprintCalloutMessage}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (sprintRemainingCount > 0) {
                    onLaunchMock(nextLiveMockNumber);
                  } else if (sm2Items.length > 0) {
                    onStartSm2Review(sm2Items[0]);
                  } else {
                    onOpenAssessments();
                  }
                }}
                className="btn-tactile px-3.5 py-1.5 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <span>
                  {sprintRemainingCount > 0
                    ? `Launch Mock #${String(nextLiveMockNumber).padStart(2, '0')}`
                    : sm2Items.length > 0
                    ? 'Start Daily Review'
                    : 'Open Mock Hub'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 🗺️ Google Cloud DE Quest Roadmap Quick-Launch Card */}
      {(() => {
        const questProgress = GOOGLE_CLOUD_DE_QUESTS.map((q) => computeQuestProgress(q, progress));
        const questLevelsDone = questProgress.reduce((s, q) => s + q.completedCount, 0);
        const questsCompleted = questProgress.filter((q) => q.completedCount === q.totalCount).length;
        const questPct = Math.round((questLevelsDone / TOTAL_QUEST_LEVELS) * 100);
        const activeQuest =
          questProgress.find((q) => q.completedCount < q.totalCount) || questProgress[0];
        const activeQuestMeta =
          GOOGLE_CLOUD_DE_QUESTS.find((q) => q.id === activeQuest.questId) ||
          GOOGLE_CLOUD_DE_QUESTS[0];

        return (
          <div className="rounded-xl border border-subtle bg-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-accent/60 transition-colors">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-[#10B981] border border-emerald-600/30">
                  🗺️ Google Cloud DE Quest
                </span>
                <span className="font-mono font-semibold text-accent tabular-nums">
                  {questLevelsDone}/{TOTAL_QUEST_LEVELS} Levels · {questsCompleted}/{GOOGLE_CLOUD_DE_QUESTS.length} Quests ({questPct}%)
                </span>
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold text-primary truncate">
                Interdependent Consulting &amp; Overhead Imagery Mastery Path
              </h2>
              <p className="text-xs text-muted truncate">
                Next up: Quest 0{activeQuestMeta.number} ({activeQuestMeta.shortTitle}) —{' '}
                {activeQuest.nextUnlockedLevelNumber
                  ? `Level ${activeQuest.nextUnlockedLevelNumber} Ready`
                  : 'All levels complete'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5">
                {questProgress.map((qp, qIdx) => (
                  <div
                    key={qp.questId}
                    title={`Quest ${qIdx + 1}: ${qp.completedCount}/${qp.totalCount}`}
                    className="w-8 h-2 rounded-full bg-subtle overflow-hidden"
                  >
                    <div
                      className="h-full bg-[#10B981] transition-all duration-300"
                      style={{ width: `${qp.pct}%` }}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onOpenQuests}
                className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Open Quest Roadmap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* ✨ Daily Byte & Engineering Pulse Card */}
      <div className="rounded-xl border border-accent/40 bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-primary">
              ✨ Daily Byte &amp; Engineering Pulse
            </h2>
            <span className="text-[11px] font-mono text-muted">· {pulse.dateKey}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={pulseLoading}
              onClick={handleRefreshPulse}
              className="btn-tactile px-3 py-1.5 rounded-lg border border-subtle bg-canvas text-xs font-semibold hover:border-accent flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-accent ${pulseLoading ? 'animate-spin' : ''}`} />
              {pulseLoading ? 'Generating...' : '🔄 New Insight'}
            </button>
            <button
              onClick={() => onOpenConcept(pulse.topicName)}
              className="btn-tactile px-3 py-1.5 rounded-lg bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              📖 Open Full Topic Guide
            </button>
            <button
              onClick={handlePinPulse}
              className="btn-tactile px-3 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover flex items-center gap-1.5"
            >
              <Pin className="w-3.5 h-3.5" />
              {pulsePinned ? '✅ Saved!' : '📌 Save to Study Notes'}
            </button>
          </div>
        </div>

        {pulseError && (
          <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-red-700 dark:text-[#EF4444] min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pulseError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={pulseLoading}
                onClick={handleRefreshPulse}
                className="btn-tactile px-3 py-1 rounded-md bg-accent text-accent-contrast text-[11px] font-bold hover:bg-accent-hover flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                type="button"
                onClick={() => setPulseError(null)}
                className="p-1 text-muted hover:text-primary"
                aria-label="Dismiss Daily Pulse error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {pulseInfo && !pulseError && (
          <div className="rounded-lg border border-accent/35 bg-accent/10 px-3.5 py-1.5 text-[11px] text-primary flex items-center justify-between gap-2">
            <span>⚡ {pulseInfo}</span>
            <button
              type="button"
              onClick={() => setPulseInfo(null)}
              className="text-muted hover:text-primary"
              aria-label="Dismiss Daily Pulse notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-subtle bg-canvas p-4 space-y-2">
            <div className="font-bold text-accent">Engineering Principle</div>
            <p className="text-primary/90 italic leading-relaxed">
              &ldquo;{pulse.quote}&rdquo;
            </p>
            <div className="text-[11px] text-muted">— {pulse.quoteAuthor}</div>
          </div>

          <div className="rounded-lg border border-subtle bg-canvas p-4 space-y-1.5">
            <div className="font-bold text-amber-500">🔥 Production War Story: {pulse.warStoryTitle}</div>
            <p className="text-primary/90 leading-relaxed">{pulse.warStoryFact}</p>
          </div>

          <div className="rounded-lg border border-subtle bg-canvas p-4 space-y-1.5">
            <div className="font-bold text-[#10B981]">🧩 Topic of the Day: {pulse.topicName}</div>
            <ul className="space-y-1 text-primary/90 leading-relaxed">
              <li><strong>What:</strong> {pulse.topicBullets.what}</li>
              <li><strong>Why:</strong> {pulse.topicBullets.why}</li>
              <li><strong>Trap:</strong> {pulse.topicBullets.trap}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Questions Solved',
            icon: <CheckCircle2 className="w-4 h-4 text-[#10B981]" />,
            value: solvedCount,
            suffix: `/ ${totalQuestions.toLocaleString()}`,
            rightBadge: `${solvedPct}%`,
            ringPct: solvedPctNum,
            ringColor: 'var(--accent-primary)',
            footer: `${progress.attemptedQuestionIds.length} total attempted across ${TRACKS.length} tracks`,
          },
          {
            label: 'Google Mock Interviews',
            icon: <Target className="w-4 h-4 text-accent" />,
            value: completedMocks,
            suffix: '/ 50',
            rightBadge: avgVerdict,
            ringPct: mockPctNum,
            ringColor: 'var(--accent-primary)',
            footer:
              completedMocks > 0
                ? `Avg Score: ${avgMockScore}/100 · Best: ${bestMockScore}`
                : 'Target: Google Cloud Consulting Bengaluru',
          },
          {
            label: 'First-Try Pass & Accuracy',
            icon: <TrendingUp className="w-4 h-4 text-[#10B981]" />,
            value: `${firstTryTotal > 0 ? firstTryPct : accuracyPct}%`,
            suffix: '',
            rightBadge: `Acc ${accuracyPct}%`,
            ringPct: firstTryTotal > 0 ? firstTryPct : accuracyPct,
            ringColor: '#10B981',
            footer: `${firstTryPassCount}/${firstTryTotal} first-try · ${progress.passedSubmissions}/${progress.totalSubmissions} runs`,
          },
          {
            label: 'Study Consistency & Streak',
            icon: <Flame className="w-4 h-4 text-amber-500 animate-flame-glow" />,
            value: `🔥 ${progress.streakDays}`,
            suffix: progress.streakDays === 1 ? 'Day' : 'Days',
            rightBadge: `Best ${progress.longestStreakDays || progress.streakDays}d`,
            ringPct: Math.min(100, Math.round((todayCount / dailyTarget) * 100)),
            ringColor: '#F59E0B',
            footer: `Today: ${todayCount}/${dailyTarget} target · ${progress.savedNotes.length} notes saved`,
          },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-subtle bg-card p-5 hover:border-accent/60 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>{kpi.label}</span>
              {kpi.icon}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 tabular-nums">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-primary">
                  {kpi.value}
                </span>
                {kpi.suffix && <span className="text-xs text-muted">{kpi.suffix}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-accent">{kpi.rightBadge}</span>
                <ProgressRing pct={kpi.ringPct} color={kpi.ringColor} />
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-muted tabular-nums">{kpi.footer}</p>
          </motion.div>
        ))}
      </div>

      {/* Rank Badges */}
      <RankBadges solvedCount={solvedCount} mockCount={completedMocks} bestMockScore={bestMockScore} />

      {/* Execution Coaching Row: Top 5 Blind Spots + 2-Minute Intro & Architecture Pitch Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* 🚩 My Top Recurring Blind Spots Auto-Tracker */}
        <div className="rounded-xl border border-subtle bg-card p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Flag className="w-4 h-4 text-[#EF4444] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-primary truncate">
                  🚩 Top 5 Blind Spots to Watch
                </h2>
                <p className="text-[11px] text-muted truncate">
                  Auto-tallied from failed test assertions &amp; Lean/No-Hire mock notes
                </p>
              </div>
            </div>
            {topBlindSpots.length > 0 && (
              <button
                type="button"
                onClick={onClearBlindSpots}
                className="text-[11px] font-semibold text-muted hover:text-[#EF4444] transition-colors shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          {topBlindSpots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-subtle bg-canvas/60 py-5 px-4 text-center text-xs text-muted">
              No recurring blind spots logged yet. Any failed edge-case test or <span className="text-amber-600 dark:text-amber-400 font-semibold">Lean Hire / No Hire</span> mock note will automatically populate your pre-interview watchlist here.
            </div>
          ) : (
            <div className="space-y-2">
              {topBlindSpots.map((spot, idx) => (
                <div
                  key={spot.tag}
                  className="rounded-lg border border-subtle bg-canvas px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-muted tabular-nums">
                        0{idx + 1}
                      </span>
                      <span className="font-semibold text-primary truncate">{spot.tag}</span>
                    </div>
                    {spot.sampleTitle && (
                      <div className="text-[11px] text-muted truncate mt-0.5 pl-6">
                        Last hit: {spot.sampleTitle}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#EF4444]/15 text-red-700 dark:text-[#EF4444] border border-red-600/30 dark:border-[#EF4444]/35 tabular-nums">
                      {spot.count}×
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectTrack(spot.trackId || 'sql')}
                      className="btn-tactile px-2.5 py-1 rounded-md bg-accent/15 text-accent text-[11px] font-semibold hover:bg-accent hover:text-accent-contrast"
                    >
                      Drill →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🎙️ 2-Minute Intro & Architecture Pitch Rehearsal Timer */}
        <div className="rounded-xl border border-subtle bg-card p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPitchExpanded((v) => !v)}
              className="flex items-center gap-2 text-left min-w-0 group"
            >
              <Mic className="w-4 h-4 text-accent shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                  🎙️ 2-Minute Intro &amp; Architecture Pitch
                </h2>
                <p className="text-[11px] text-muted truncate">
                  120-second rehearsal timer · Hook → Scale → Bottleneck → Impact
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {!pitchExpanded && (
                <span className="font-mono text-xs font-bold text-accent tabular-nums">
                  {pitchFormatted}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPitchExpanded((v) => !v)}
                aria-label={pitchExpanded ? 'Collapse pitch timer' : 'Expand pitch timer'}
                className="p-1.5 rounded-lg border border-subtle bg-canvas text-muted hover:text-primary hover:border-accent transition-colors"
              >
                {pitchExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {pitchExpanded && (
            <div className="space-y-3.5">
              {/* Countdown Ring + Controls */}
              <div className="rounded-lg border border-subtle bg-canvas p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r={pitchRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4.5"
                        className="text-subtle"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={pitchRadius}
                        fill="none"
                        stroke={pitchRingColor}
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeDasharray={pitchCirc}
                        strokeDashoffset={pitchDashOffset}
                        className="transition-[stroke-dashoffset,stroke] duration-300"
                      />
                    </svg>
                    <span className="absolute font-mono text-xs font-bold text-primary tabular-nums">
                      {pitchFormatted}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary">
                      {pitchSecLeft === 0
                        ? 'Time! Wrap up Business Impact.'
                        : pitchSecLeft <= 20
                        ? 'Final 20s — Land your metrics!'
                        : pitchRunning
                        ? 'Rehearsing live pitch...'
                        : 'Ready for 2-minute dry run'}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5 tabular-nums">
                      {Object.values(pitchChecked).filter(Boolean).length}/4 beats covered
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (pitchSecLeft === 0) setPitchSecLeft(120);
                      setPitchRunning((r) => !r);
                    }}
                    className="btn-tactile px-3 py-1.5 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs font-bold flex items-center gap-1.5"
                  >
                    {pitchRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> {pitchSecLeft < 120 && pitchSecLeft > 0 ? 'Resume' : 'Start'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPitchRunning(false);
                      setPitchSecLeft(120);
                      setPitchChecked({});
                    }}
                    title="Reset timer & checklist"
                    className="btn-tactile p-1.5 rounded-lg border border-subtle bg-card text-muted hover:text-primary hover:border-accent"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4-Beat Flow Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PITCH_STEPS.map((step, idx) => {
                  const checked = !!pitchChecked[step.id];
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() =>
                        setPitchChecked((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                      }
                      className={`text-left rounded-lg border px-3 py-2 transition-colors flex items-start gap-2.5 text-xs ${
                        checked
                          ? 'bg-[#10B981]/10 border-emerald-600/40 dark:border-[#10B981]/40'
                          : 'bg-canvas border-subtle hover:border-accent/50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          checked
                            ? 'bg-[#10B981] border-[#10B981] text-[#09090B]'
                            : 'border-subtle bg-card text-muted'
                        }`}
                      >
                        {checked ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-mono">{idx + 1}</span>}
                      </span>
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${checked ? 'text-emerald-700 dark:text-[#10B981]' : 'text-primary'}`}>
                          {step.label}
                        </div>
                        <div className="text-[10px] text-muted truncate">{step.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔁 SM-2 Spaced Repetition Review Queue */}
      <div className="rounded-xl border border-subtle bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-primary">
              🔁 SM-2 Spaced Repetition Review Queue ({sm2Items.length})
            </h2>
          </div>
          <span className="text-xs text-muted">
            Auto-schedules missed questions &amp; Lean/No-Hire mocks on 1d → 3d → 7d intervals
          </span>
        </div>

        {sm2Items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-subtle py-5 px-4 text-center text-xs text-muted">
            No items queued for review yet. Any failed assertion or Lean/No-Hire mock will appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sm2Items.slice(0, 6).map((item) => (
              <div
                key={item.itemId}
                className="rounded-lg border border-subtle bg-canvas p-3.5 flex flex-col justify-between gap-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-amber-500">
                      Interval: {item.intervalDays}d · Due {item.nextReviewDate}
                    </span>
                    <span className="text-muted capitalize">{item.itemType}</span>
                  </div>
                  <div className="font-bold text-primary mt-1 line-clamp-1">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">{item.reason}</div>
                </div>
                <button
                  onClick={() => onStartSm2Review(item)}
                  className="btn-tactile w-full py-1.5 rounded-lg bg-accent/15 text-accent font-semibold hover:bg-accent hover:text-accent-contrast"
                >
                  Start Review Session →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle Row: Difficulty Mastery + 12-Week Activity Heatmap + Google Round Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-xl border border-subtle bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-primary">Difficulty Mastery</h2>
          <div className="space-y-3.5">
            {diffStats.map((d) => {
              const barColor =
                d.diff === 'Easy' ? 'bg-[#10B981]' : d.diff === 'Medium' ? 'bg-amber-500' : 'bg-[#EF4444]';
              const emoji = d.diff === 'Easy' ? '🟢' : d.diff === 'Medium' ? '🟡' : '🔴';
              return (
                <div key={d.diff} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-primary">
                      {emoji} {d.diff}
                    </span>
                    <span className="text-muted">
                      {d.solved} / {d.total} ({d.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-subtle/70 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full ${barColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary">
                12-Week Activity Heatmap
              </span>
              <span className="text-[11px] text-muted">Less → More</span>
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1.5">
                  {week.map((day) => {
                    const bg =
                      day.count === 0
                        ? 'bg-subtle/70'
                        : day.count === 1
                        ? 'bg-accent/35'
                        : day.count <= 3
                        ? 'bg-accent/65'
                        : 'bg-accent';
                    return (
                      <div
                        key={day.iso}
                        title={`${day.iso}: ${day.count} submission(s)`}
                        className={`w-full aspect-square rounded-[3px] ${bg}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Google Round Readiness */}
        <div className="lg:col-span-2 rounded-xl border border-subtle bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary">
              🎯 Google Cloud Consulting (Bengaluru) Round Readiness
            </h2>
            <span className="text-xs text-muted">7-Stage Hiring Loop</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roundReadiness.map((r, idx) => (
              <motion.div
                key={r.round}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="rounded-lg border border-subtle bg-canvas p-3.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary truncate pr-2">
                    {r.round}
                  </span>
                  <span className="font-mono font-semibold text-accent tabular-nums">{r.readiness}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-subtle/70 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.readiness}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-accent"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted tabular-nums">
                  <span>{r.solvedQ}/{r.totalQ} Qs solved</span>
                  <span>{r.mocksDone} mock(s) done</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 15-Track Completion Matrix */}
      <div className="rounded-xl border border-subtle bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary">
            {TRACKS.length}-Track Completion Matrix ({totalQuestions.toLocaleString()} Qs)
          </h2>
          <span className="text-xs text-muted">Click any track to jump in</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {TRACKS.map((track) => {
            const qs = QUESTIONS_BY_TRACK[track.id] || [];
            const total = qs.length;
            const solved = qs.filter((q) => solvedSet.has(q.id)).length;
            const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

            return (
              <button
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className="btn-tactile text-left rounded-lg border border-subtle bg-canvas p-3.5 hover:border-accent group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary truncate">
                    {track.emoji} {track.shortName}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-accent tabular-nums shrink-0">
                    {solved}/{total} · {pct}%
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-subtle/70 overflow-hidden">
                  <div
                    className="h-full bg-accent group-hover:bg-[#10B981] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mock Interview Scorecard History Table */}
      <div className="rounded-xl border border-subtle bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" />
            Google Mock Interview Scorecard History
          </h2>
          <button onClick={() => onLaunchMock(1)} className="text-xs font-medium text-accent hover:underline">
            Start Next Mock →
          </button>
        </div>

        {progress.mockHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-subtle py-8 px-4 text-center">
            <p className="text-sm font-medium text-primary">
              No Google Mock Interviews completed yet
            </p>
            <p className="text-xs text-muted mt-1">
              Launch a live 6-round face-to-face AI Google interview to record official Hiring Committee scorecards here.
            </p>
            <button
              onClick={() => onLaunchMock(1)}
              className="btn-tactile mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover"
            >
              🚀 Launch Mock #01 (6-Round Loop)
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-subtle text-muted">
                  <th className="py-2.5 pr-4 font-medium">Mock</th>
                  <th className="py-2.5 pr-4 font-medium">Round</th>
                  <th className="py-2.5 pr-4 font-medium">Verdict</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Score</th>
                  <th className="py-2.5 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle tabular-nums">
                {progress.mockHistory.map((m, idx) => (
                  <tr key={`${m.mockId}-${idx}`} className="hover:bg-canvas/50">
                    <td className="py-2.5 pr-4 font-medium text-primary">
                      {m.mockNumber === 99 ? '⚡ Custom' : `Mock #${String(m.mockNumber).padStart(2, '0')}`} · {m.title}
                    </td>
                    <td className="py-2.5 pr-4 text-primary/80">{m.roundType}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`font-semibold ${
                          m.verdict === 'Strong Hire' || m.verdict === 'Hire'
                            ? 'text-[#10B981]'
                            : m.verdict === 'Lean Hire'
                            ? 'text-amber-500'
                            : 'text-[#EF4444]'
                        }`}
                      >
                        {m.verdict}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono font-semibold text-accent">
                      {m.score}/100
                    </td>
                    <td className="py-2.5 text-right text-muted">
                      {new Date(m.completedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
