import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  Database,
  FileText,
  Link2,
  Lock,
  Satellite,
  ShieldCheck,
  Sparkles,
  Trophy,
  Workflow,
  X,
} from 'lucide-react';
import { ALL_QUESTIONS } from '../data/questions';
import {
  computeQuestProgress,
  GOOGLE_CLOUD_DE_QUESTS,
  QuestDefinition,
  QuestIconId,
  QuestLevelDefinition,
  TOTAL_QUEST_LEVELS,
} from '../data/quests';
import { BookOpen } from 'lucide-react';
import { Question, UserProgressState } from '../types/platform';
import { QuestLevelContext } from '../data/questBriefings';
import { QuestStudyBriefingView } from './QuestStudyBriefingView';

interface QuestRoadmapViewProps {
  progress: UserProgressState;
  onMarkBriefingRead: (levelId: string, read: boolean) => void;
  onOpenQuestion: (
    question: Question,
    options?: { plainTextDocMode?: boolean; questContext?: QuestLevelContext }
  ) => void;
  onLaunchMock: (mockNumber: number, questContext?: QuestLevelContext) => void;
  onOpenCarlBank: (questContext?: QuestLevelContext) => void;
}

const QUEST_ICONS: Record<QuestIconId, React.ComponentType<{ className?: string }>> = {
  satellite: Satellite,
  stream: Workflow,
  warehouse: Database,
  genai: Sparkles,
  dashboard: BarChart3,
  governance: ShieldCheck,
  consulting: Trophy,
};

export const QuestRoadmapView: React.FC<QuestRoadmapViewProps> = ({
  progress,
  onMarkBriefingRead,
  onOpenQuestion,
  onLaunchMock,
  onOpenCarlBank,
}) => {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [preflightTarget, setPreflightTarget] = useState<QuestLevelContext | null>(null);
  const [docModeByLevel, setDocModeByLevel] = useState<Record<string, boolean>>({});
  const [globalDocMode, setGlobalDocMode] = useState(false);

  const readBriefingSet = useMemo(
    () => new Set(progress.readQuestBriefingIds || []),
    [progress.readQuestBriefingIds]
  );

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of ALL_QUESTIONS) {
      map.set(q.id, q);
    }
    return map;
  }, []);

  const questSummaries = useMemo(
    () =>
      GOOGLE_CLOUD_DE_QUESTS.map((quest) => ({
        quest,
        summary: computeQuestProgress(quest, progress),
      })),
    [progress]
  );

  const totalCompletedLevels = useMemo(
    () => questSummaries.reduce((acc, q) => acc + q.summary.completedCount, 0),
    [questSummaries]
  );

  const completedQuestsCount = useMemo(
    () =>
      questSummaries.filter(
        (q) => q.summary.totalCount > 0 && q.summary.completedCount === q.summary.totalCount
      ).length,
    [questSummaries]
  );

  const nextActionable = useMemo(() => {
    for (const { quest, summary } of questSummaries) {
      const target = summary.levelStates.find((s) => s.unlocked && !s.completed);
      if (target) return { quest, level: target.level };
    }
    return {
      quest: GOOGLE_CLOUD_DE_QUESTS[0],
      level: GOOGLE_CLOUD_DE_QUESTS[0].levels[0],
    };
  }, [questSummaries]);

  const activeQuestBundle = useMemo(
    () => questSummaries.find((q) => q.quest.id === selectedQuestId) || null,
    [questSummaries, selectedQuestId]
  );

  const isDocModeForLevel = (levelId: string) =>
    docModeByLevel[levelId] !== undefined ? docModeByLevel[levelId] : globalDocMode;

  const toggleLevelDocMode = (levelId: string) => {
    setDocModeByLevel((prev) => {
      const current = prev[levelId] !== undefined ? prev[levelId] : globalDocMode;
      return { ...prev, [levelId]: !current };
    });
  };

  const openStage1Briefing = (quest: QuestDefinition, level: QuestLevelDefinition) => {
    setPreflightTarget({ quest, level });
  };

  const handleConfirmStartChallenge = (quest: QuestDefinition, level: QuestLevelDefinition) => {
    onMarkBriefingRead(level.id, true);
    const questContext: QuestLevelContext = { quest, level };
    setPreflightTarget(null);
    setSelectedQuestId(null);

    if (level.kind === 'carl') {
      onOpenCarlBank(questContext);
      return;
    }
    if (level.kind === 'mock' && level.mockNumber !== undefined) {
      onLaunchMock(level.mockNumber, questContext);
      return;
    }
    if (level.kind === 'question' && level.questionId) {
      const q = questionMap.get(level.questionId);
      if (q) {
        const useDocMode = Boolean(level.supportsGoogleDocMode && isDocModeForLevel(level.id));
        onOpenQuestion(q, { plainTextDocMode: useDocMode, questContext });
      }
    }
  };

  const renderQuestIcon = (quest: QuestDefinition, size: 'md' | 'lg' = 'lg') => {
    const IconComp = QUEST_ICONS[quest.icon] || Code2;
    return (
      <div
        className={`relative shrink-0 flex items-center justify-center rounded-2xl border ${
          size === 'lg' ? 'w-14 h-14' : 'w-11 h-11'
        }`}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${quest.glowColor}28, ${quest.glowColor}08 70%)`,
          borderColor: `${quest.glowColor}45`,
          boxShadow: `0 0 24px -6px ${quest.glowColor}55`,
          color: quest.glowColor,
        }}
      >
        <IconComp className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
      </div>
    );
  };

  const overallPct = Math.round((totalCompletedLevels / TOTAL_QUEST_LEVELS) * 100);
  const carlCount = progress.carlStories?.length || 0;

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner (Top Center) */}
      <section className="relative overflow-hidden rounded-[24px] border border-zinc-800/90 bg-[#0E1015] text-zinc-50 px-6 py-8 sm:px-10 sm:py-11 shadow-xl">
        {/* Subtle Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full blur-[90px] opacity-25"
          style={{ background: 'var(--accent-primary)' }}
        />

        {/* Subtle Dark Mountain-Peak Silhouette Backdrop */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 320"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-44 sm:h-56 text-zinc-800/75"
          fill="none"
        >
          <path
            d="M0 320 L0 250 L135 165 L245 225 L385 110 L510 205 L600 68 L705 198 L835 120 L970 215 L1085 148 L1200 235 L1200 320 Z"
            fill="currentColor"
            opacity="0.48"
          />
          <path
            d="M110 320 L270 190 L410 265 L600 96 L760 235 L920 160 L1100 320 Z"
            fill="#151922"
            opacity="0.72"
          />
          <path
            d="M385 110 L510 205 L600 68 L705 198 L835 120"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Summit Pole */}
          <line
            x1="600"
            y1="68"
            x2="600"
            y2="20"
            stroke="rgba(16,185,129,0.55)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center space-y-4">
          {/* Glowing Peak-Flag Badge (</>) */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
            <span className="font-mono text-xs font-extrabold text-emerald-300 tracking-tight">
              &lt;/&gt;
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
              Bengaluru Consulting · 7 Quests · {TOTAL_QUEST_LEVELS} Levels
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Google Cloud DE Quest
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              Interdependent mastery path for Google Cloud Consulting &amp; Overhead Imagery Data Engineering
            </p>
          </div>

          {/* Live Synced Mastery Bar + Quick Resume */}
          <div className="w-full max-w-xl pt-2 space-y-2.5">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs tabular-nums">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200 font-semibold">
                <span className="text-emerald-400 font-bold">{totalCompletedLevels}</span> / {TOTAL_QUEST_LEVELS} Levels Mastered
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200 font-semibold">
                <span className="text-emerald-400 font-bold">{completedQuestsCount}</span> / {GOOGLE_CLOUD_DE_QUESTS.length} Quests Complete
              </span>
              <button
                type="button"
                onClick={() => setSelectedQuestId(nextActionable.quest.id)}
                className="btn-tactile px-3.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Resume Quest {nextActionable.quest.number} · L{nextActionable.level.levelNumber}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. 7 Interdependent JD-Aligned Quests (2-Column Grid) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div>
            <h2 className="text-sm font-bold text-primary">
              7 Interdependent Mastery Quests
            </h2>
            <p className="text-xs text-muted">
              Click any Quest card to inspect its vertical dependency pipeline and launch levels in Workspace or Google Doc Mode.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalDocMode((v) => !v)}
            className={`btn-tactile px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              globalDocMode
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-300'
                : 'bg-card border-subtle text-muted hover:text-primary hover:border-accent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              📝 Default Google Doc Mode: {globalDocMode ? 'ON (No Autocomplete)' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {questSummaries.map(({ quest, summary }, idx) => {
            const hasProgress = summary.completedCount > 0;
            const isFullyDone = summary.completedCount === summary.totalCount;

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => setSelectedQuestId(quest.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedQuestId(quest.id);
                  }
                }}
                className={`group text-left rounded-[18px] border bg-card p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 hover:border-accent/70 hover:-translate-y-0.5 shadow-sm ${
                  isFullyDone ? 'border-emerald-500/50' : 'border-subtle'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-canvas border border-subtle text-muted tabular-nums">
                        Quest 0{quest.number}
                      </span>
                      <span className="text-[11px] font-medium text-accent truncate">
                        {quest.roleFocus}
                      </span>
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-bold text-primary group-hover:text-accent transition-colors leading-snug">
                      {quest.title}
                    </h3>
                  </div>

                  {renderQuestIcon(quest, 'lg')}
                </div>

                {/* Bottom Row: 👋 Start Pill OR Interactive Emerald Node Progress Track */}
                <div className="pt-2 border-t border-subtle/70 flex flex-wrap items-center justify-between gap-3">
                  {!hasProgress ? (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/35 group-hover:bg-accent group-hover:text-accent-contrast transition-colors whitespace-nowrap shrink-0">
                        <span>👋 Start</span>
                      </span>
                      <span className="text-xs text-muted font-mono tabular-nums">
                        0/{summary.totalCount} Levels
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[200px] flex items-center justify-between gap-3">
                      {/* Node track: ●───●───● */}
                      <div
                        className="flex items-center flex-1 max-w-xs"
                        aria-label={`Quest ${quest.number} node progress`}
                      >
                        {summary.levelStates.map((st, nodeIdx) => {
                          const isNextActive =
                            !st.completed && st.level.levelNumber === summary.nextUnlockedLevelNumber;
                          const prevCompleted =
                            nodeIdx > 0 && summary.levelStates[nodeIdx - 1].completed;

                          return (
                            <React.Fragment key={st.level.id}>
                              {nodeIdx > 0 && (
                                <div
                                  className={`h-[2px] flex-1 transition-colors ${
                                    st.completed || prevCompleted
                                      ? 'bg-[#10B981]'
                                      : 'bg-subtle'
                                  }`}
                                />
                              )}
                              <span
                                title={`L${st.level.levelNumber}: ${st.level.title}`}
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold transition-all ${
                                  st.completed
                                    ? 'bg-[#10B981] border-[#10B981] text-white shadow-[0_0_10px_rgba(16,185,129,0.45)]'
                                    : isNextActive
                                    ? 'bg-accent/20 border-accent text-accent ring-2 ring-accent/25'
                                    : 'bg-canvas border-subtle text-muted'
                                }`}
                              >
                                {st.completed ? (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                ) : (
                                  <span className="font-mono text-[9px]">
                                    {st.level.levelNumber}
                                  </span>
                                )}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <span className="text-xs font-mono font-bold text-[#10B981] tabular-nums whitespace-nowrap shrink-0">
                        {summary.completedCount}/{summary.totalCount} Levels
                      </span>
                    </div>
                  )}

                  <span className="text-xs font-semibold text-muted group-hover:text-accent flex items-center gap-1 whitespace-nowrap shrink-0">
                    <span>Open Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. Slide-Over Vertical Dependency Pipeline Drawer */}
      <AnimatePresence>
        {activeQuestBundle && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQuestId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              aria-label={activeQuestBundle.quest.title}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-canvas border-l border-subtle shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-subtle bg-card/90 flex items-start justify-between gap-4 shrink-0">
                <div className="flex items-start gap-3.5 min-w-0">
                  {renderQuestIcon(activeQuestBundle.quest, 'md')}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-mono font-bold text-accent uppercase tracking-wider">
                        Quest 0{activeQuestBundle.quest.number}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="font-mono font-semibold text-[#10B981] tabular-nums">
                        {activeQuestBundle.summary.completedCount}/
                        {activeQuestBundle.summary.totalCount} Mastered
                      </span>
                    </div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-primary leading-snug mt-0.5">
                      {activeQuestBundle.quest.title}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      {activeQuestBundle.quest.roleFocus}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedQuestId(null)}
                  aria-label="Close Quest Pipeline Drawer"
                  className="p-2 rounded-lg border border-subtle bg-canvas text-muted hover:text-primary hover:border-accent shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Sub-bar */}
              <div className="px-5 py-2.5 border-b border-subtle bg-canvas flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
                <span className="text-muted">
                  Completing any level automatically marks its node green (✓) and unlocks the next stage.
                </span>
                <span className="font-mono font-semibold text-primary tabular-nums">
                  {activeQuestBundle.summary.pct}% Complete
                </span>
              </div>

              {/* Vertical Dependency Pipeline */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
                {activeQuestBundle.summary.levelStates.map((st, idx) => {
                  const { level, completed, unlocked } = st;
                  const linkedQuestion = level.questionId
                    ? questionMap.get(level.questionId)
                    : undefined;
                  const docModeOn = isDocModeForLevel(level.id);
                  const isBriefingRead = readBriefingSet.has(level.id);
                  const isLast = idx === activeQuestBundle.summary.levelStates.length - 1;

                  const ctaLabel =
                    level.kind === 'carl'
                      ? completed
                        ? 'Briefing & CARL Bank'
                        : `Study Briefing -> CARL (${carlCount}/3)`
                      : level.kind === 'mock'
                      ? completed
                        ? `Briefing & Mock #${String(level.mockNumber).padStart(2, '0')}`
                        : `Briefing -> Mock #${String(level.mockNumber).padStart(2, '0')}`
                      : completed
                      ? 'Briefing & Workspace'
                      : 'Read Briefing & Start';

                  return (
                    <div key={level.id} className="flex flex-col items-stretch">
                      <div
                        className={`rounded-2xl border p-4 transition-all ${
                          completed
                            ? 'bg-emerald-500/8 border-[#10B981]/50'
                            : unlocked
                            ? 'bg-card border-accent/45 shadow-sm'
                            : 'bg-card/55 border-subtle opacity-80'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span
                              className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold font-mono tabular-nums ${
                                completed
                                  ? 'bg-[#10B981] border-[#10B981] text-white'
                                  : unlocked
                                  ? 'bg-accent text-accent-contrast border-accent'
                                  : 'bg-canvas border-subtle text-muted'
                              }`}
                            >
                              {completed ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : unlocked ? (
                                `L${level.levelNumber}`
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </span>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-canvas border border-subtle text-accent">
                                  {level.topicTag}
                                </span>
                                {linkedQuestion && (
                                  <span className="text-[10px] font-mono uppercase text-muted">
                                    {linkedQuestion.workspaceType} · {linkedQuestion.difficulty}
                                  </span>
                                )}
                                {level.kind === 'carl' && (
                                  <span className="text-[10px] font-mono text-muted tabular-nums">
                                    {Math.min(carlCount, 3)}/3 CARL Stories
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm font-bold text-primary leading-snug">
                                {level.title}
                              </h4>

                              <p className="text-xs text-muted leading-relaxed">
                                {level.focusSummary}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {completed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border border-emerald-600/35">
                                <Check className="w-3 h-3" /> Mastered
                              </span>
                            ) : unlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/35">
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-canvas text-muted border border-subtle">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            )}
                            {isBriefingRead && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-[#10B981] flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Briefing Read ✓
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action + Google Doc Coding Mode Toggle */}
                        <div className="mt-3.5 pt-3 border-t border-subtle/70 flex flex-wrap items-center justify-between gap-2.5">
                          {level.supportsGoogleDocMode ? (
                            <button
                              type="button"
                              onClick={() => toggleLevelDocMode(level.id)}
                              className={`btn-tactile px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                                docModeOn
                                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                                  : 'bg-canvas border-subtle text-muted hover:text-primary hover:border-accent'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>📝 Practice in Google Doc Mode (No Autocomplete)</span>
                              <span
                                className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                  docModeOn
                                    ? 'bg-amber-500 text-zinc-950'
                                    : 'bg-card border border-subtle text-muted'
                                }`}
                              >
                                {docModeOn ? 'ON' : 'OFF'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted">
                              {linkedQuestion
                                ? `Linked Track: ${linkedQuestion.trackId.toUpperCase()}`
                                : level.kind === 'mock'
                                ? '6-Round Consulting Interview Simulator'
                                : 'Behavioral Evidence Bank'}
                            </span>
                          )}

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => openStage1Briefing(activeQuestBundle.quest, level)}
                              className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                completed
                                  ? 'bg-canvas border border-subtle text-primary hover:border-accent'
                                  : 'bg-accent text-accent-contrast hover:bg-accent-hover'
                              }`}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{ctaLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Complete Level {level.levelNumber - 1} to unlock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Downward Arrow + Dependency Bridge Pill */}
                      {!isLast && (
                        <div className="flex flex-col items-center py-2 space-y-1">
                          <ArrowDown
                            className={`w-4 h-4 ${
                              completed ? 'text-[#10B981]' : 'text-muted/60'
                            }`}
                          />
                          {level.dependencyBridge && (
                            <div
                              className={`px-3 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1.5 text-center max-w-lg ${
                                completed
                                  ? 'bg-emerald-500/10 border-[#10B981]/35 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-card border-subtle text-muted'
                              }`}
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>🔗 Dependency Bridge: {level.dependencyBridge}</span>
                            </div>
                          )}
                          <ArrowDown
                            className={`w-4 h-4 ${
                              completed ? 'text-[#10B981]' : 'text-muted/60'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. Stage 1: Mandatory Pre-Flight Study Briefing Modal */}
      <AnimatePresence>
        {preflightTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreflightTarget(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={`Study Briefing: ${preflightTarget.level.title}`}
              className="fixed inset-3 sm:inset-6 lg:inset-x-10 lg:inset-y-6 max-w-6xl mx-auto rounded-2xl border border-subtle bg-canvas shadow-2xl z-50 overflow-hidden"
            >
              <QuestStudyBriefingView
                quest={preflightTarget.quest}
                level={preflightTarget.level}
                mode="preflight"
                isRead={readBriefingSet.has(preflightTarget.level.id)}
                onToggleRead={(read) => onMarkBriefingRead(preflightTarget.level.id, read)}
                onStartChallenge={() =>
                  handleConfirmStartChallenge(preflightTarget.quest, preflightTarget.level)
                }
                onClosePreflight={() => setPreflightTarget(null)}
                docModeOn={isDocModeForLevel(preflightTarget.level.id)}
                onToggleDocMode={() => toggleLevelDocMode(preflightTarget.level.id)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
