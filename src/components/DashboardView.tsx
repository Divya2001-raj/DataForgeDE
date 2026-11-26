import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TRACKS } from '../data/tracks';
import { ALL_QUESTIONS, QUESTIONS_BY_TRACK } from '../data/questions';
import { GOOGLE_ROUND_ORDER } from '../data/googleMocks';
import { getDailyPulseForDate } from '../data/dailyPulse';
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
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  Pin,
  RefreshCw,
  Repeat,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  progress: UserProgressState;
  onSelectTrack: (trackId: TrackId) => void;
  onOpenAssessments: () => void;
  onLaunchMock: (mockNumber: number) => void;
  onOpenConcept: (conceptName: string) => void;
  onPinNote: (note: StudyNote) => void;
  onStartSm2Review: (item: Sm2ReviewItem) => void;
  onLaunchWeakSpotMock: (weakTrackIds: TrackId[]) => void;
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
  onOpenAssessments,
  onLaunchMock,
  onOpenConcept,
  onPinNote,
  onStartSm2Review,
  onLaunchWeakSpotMock,
}) => {
  const [pulse, setPulse] = useState<DailyPulseItem>(() => getDailyPulseForDate(new Date()));
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulsePinned, setPulsePinned] = useState(false);

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
    try {
      const res = await fetch('/api/ai/daily-pulse', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.quote && data.topicName) {
        setPulse(data);
      }
    } catch {
      // keep existing pulse cleanly if offline
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
