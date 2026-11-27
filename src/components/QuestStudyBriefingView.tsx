import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Terminal,
  X,
} from 'lucide-react';
import { QuestDefinition, QuestLevelDefinition } from '../data/quests';
import { getQuestStudyBriefing } from '../data/questBriefings';

interface QuestStudyBriefingViewProps {
  quest: QuestDefinition;
  level: QuestLevelDefinition;
  mode: 'preflight' | 'workspace-tab';
  isRead: boolean;
  onToggleRead: (read: boolean) => void;
  onStartChallenge?: () => void;
  onReturnToChallenge?: () => void;
  onClosePreflight?: () => void;
  docModeOn?: boolean;
  onToggleDocMode?: () => void;
}

export const QuestStudyBriefingView: React.FC<QuestStudyBriefingViewProps> = ({
  quest,
  level,
  mode,
  isRead,
  onToggleRead,
  onStartChallenge,
  onReturnToChallenge,
  onClosePreflight,
  docModeOn = false,
  onToggleDocMode,
}) => {
  const briefing = getQuestStudyBriefing(level);

  const primaryCtaLabel =
    level.kind === 'carl'
      ? "🚀 I've Read the Guide — Open CARL Story Bank →"
      : level.kind === 'mock'
      ? `🚀 I've Read the Guide — Enter Mock #${String(level.mockNumber).padStart(2, '0')} →`
      : "🚀 I've Read the Guide — Start Challenge →";

  return (
    <div
      className={
        mode === 'preflight'
          ? 'flex flex-col h-full bg-canvas text-primary'
          : 'rounded-2xl border border-subtle bg-card text-primary overflow-hidden shadow-sm'
      }
    >
      {/* Top Briefing Header */}
      <header className="px-5 sm:px-7 py-4 border-b border-subtle bg-card flex flex-wrap items-start justify-between gap-4 shrink-0">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted tabular-nums">
            <span className="font-semibold text-accent">
              Stage 1 · Pre-Flight Study Briefing
            </span>
            <span aria-hidden="true">·</span>
            <span>Quest {String(quest.number).padStart(2, '0')}</span>
            <span aria-hidden="true">·</span>
            <span>Level {String(level.levelNumber).padStart(2, '0')}</span>
            <span aria-hidden="true">·</span>
            <span className="text-primary font-medium">{level.topicTag}</span>
          </div>

          <h2 className="font-display text-lg sm:text-2xl font-bold text-primary tracking-tight leading-snug text-balance">
            {level.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
            {level.focusSummary}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleRead(!isRead)}
            aria-pressed={isRead}
            className={`btn-tactile px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              isRead
                ? 'bg-[#10B981]/15 border-[#10B981]/50 text-emerald-700 dark:text-[#10B981]'
                : 'bg-elevated border-subtle text-primary hover:border-accent'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isRead ? 'Briefing Read ✓' : 'Mark Briefing Read'}</span>
          </button>

          {mode === 'preflight' && onClosePreflight && (
            <button
              type="button"
              onClick={onClosePreflight}
              aria-label="Close Study Briefing"
              className="p-2 rounded-lg border border-subtle bg-elevated text-muted hover:text-primary hover:border-accent shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable 4-Section Study Guide */}
      <div
        className={
          mode === 'preflight'
            ? 'flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6'
            : 'px-5 sm:px-7 py-6 space-y-6'
        }
      >
        {/* 01. What Is This Topic? (Core Mental Model) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent shrink-0" />
            <h3 className="font-display text-sm sm:text-base font-bold text-primary">
              01. What Is This Topic? (Core Mental Model)
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <div className="rounded-xl border border-subtle bg-card p-4 space-y-1.5">
              <div className="text-xs font-semibold text-accent">
                Under-the-Hood Mechanism
              </div>
              <p className="text-xs sm:text-[13px] text-primary/90 leading-relaxed">
                {briefing.coreMentalModel}
              </p>
            </div>

            <div className="rounded-xl border border-subtle bg-elevated p-4 space-y-1.5">
              <div className="text-xs font-semibold text-primary">
                Why Google Cloud Consulting Relies On It
              </div>
              <p className="text-xs sm:text-[13px] text-muted leading-relaxed">
                {briefing.whyGoogleCloudReliesOnIt}
              </p>
            </div>
          </div>
        </section>

        {/* 02. Real-World Concrete Example */}
        <section className="space-y-3 pt-2 border-t border-subtle">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent shrink-0" />
              <h3 className="font-display text-sm sm:text-base font-bold text-primary">
                02. Real-World Concrete Example
              </h3>
            </div>
            <span className="text-xs font-medium text-muted">
              {briefing.exampleTitle}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
            <div className="rounded-xl border border-subtle bg-editor p-3.5 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-muted">
                Input Data / Schema / Scenario
              </span>
              <pre className="text-[11px] sm:text-xs font-mono text-primary whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {briefing.exampleInput}
              </pre>
            </div>

            <div className="rounded-xl border border-subtle bg-elevated p-3.5 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-accent">
                Transformation / Architecture Rule
              </span>
              <p className="text-xs text-primary/90 whitespace-pre-line leading-relaxed">
                {briefing.exampleLogic}
              </p>
            </div>

            <div className="rounded-xl border border-subtle bg-editor p-3.5 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-[#10B981]">
                Expected Output / Pipeline Effect
              </span>
              <pre className="text-[11px] sm:text-xs font-mono text-primary whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {briefing.exampleOutput}
              </pre>
            </div>
          </div>
        </section>

        {/* 03. How to Do It (Step-by-Step Implementation Blueprint) */}
        <section className="space-y-3 pt-2 border-t border-subtle">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent shrink-0" />
            <h3 className="font-display text-sm sm:text-base font-bold text-primary">
              03. How to Do It (Step-by-Step Implementation Blueprint)
            </h3>
          </div>

          <div className="space-y-2.5">
            {briefing.implementationSteps.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-subtle bg-card p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-elevated border border-subtle text-accent font-mono text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-primary">
                      {item.step}
                    </h4>
                    <p className="text-xs text-muted leading-relaxed">
                      {item.detail}
                    </p>
                    {item.codeSnippet && (
                      <pre className="mt-2 p-2.5 rounded-lg border border-subtle bg-editor font-mono text-[11px] text-primary overflow-x-auto leading-relaxed">
                        {item.codeSnippet}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 04. How to Approach the Interview Question (Google Loop Playbook) */}
        <section className="space-y-3 pt-2 border-t border-subtle">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent shrink-0" />
            <h3 className="font-display text-sm sm:text-base font-bold text-primary">
              04. How to Approach the Interview Question (Google Loop Playbook)
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Clarifying Questions */}
            <div className="lg:col-span-4 rounded-xl border border-subtle bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Clarifying Questions to Ask First</span>
              </div>
              <ul className="space-y-2 text-xs text-primary/90 leading-relaxed">
                {briefing.clarifyingQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-[11px] font-bold text-accent shrink-0 tabular-nums">
                      Q{idx + 1}.
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step-by-Step Solving Strategy */}
            <div className="lg:col-span-4 rounded-xl border border-subtle bg-elevated p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <ListChecks className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Step-by-Step Solving Strategy</span>
              </div>
              <div className="space-y-2 text-xs leading-relaxed">
                <div>
                  <span className="font-semibold text-muted">Baseline: </span>
                  <span className="text-primary/90">{briefing.solvingStrategy.baseline}</span>
                </div>
                <div>
                  <span className="font-semibold text-accent">Optimal Design: </span>
                  <span className="text-primary">{briefing.solvingStrategy.optimal}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted">Cost / Slot Trade-Offs: </span>
                  <span className="text-primary/90">{briefing.solvingStrategy.tradeOffs}</span>
                </div>
              </div>
            </div>

            {/* Common Traps & Edge Cases */}
            <div className="lg:col-span-4 rounded-xl border border-subtle bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-[#EF4444]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Common Traps &amp; Edge Cases</span>
              </div>
              <ul className="space-y-2 text-xs text-primary/90 leading-relaxed">
                {briefing.commonTraps.map((trap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-[#EF4444] font-bold shrink-0">
                      ×
                    </span>
                    <span>{trap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Stage 1 / Stage 2 Sticky Bottom Action Footer */}
      <footer className="px-5 sm:px-7 py-3.5 border-t border-subtle bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onToggleRead(!isRead)}
            className={`btn-tactile px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
              isRead
                ? 'bg-[#10B981]/15 border-[#10B981]/50 text-emerald-700 dark:text-[#10B981]'
                : 'bg-canvas border-subtle text-muted hover:text-primary hover:border-accent'
            }`}
          >
            <span
              className={`w-4 h-4 rounded flex items-center justify-center border ${
                isRead
                  ? 'bg-[#10B981] border-[#10B981] text-[#04120B]'
                  : 'border-subtle bg-card'
              }`}
            >
              {isRead && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
            <span>Mark Briefing Read</span>
          </button>

          {mode === 'preflight' && level.supportsGoogleDocMode && onToggleDocMode && (
            <button
              type="button"
              onClick={onToggleDocMode}
              className={`btn-tactile px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                docModeOn
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                  : 'bg-canvas border-subtle text-muted hover:text-primary hover:border-accent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Google Doc Mode: {docModeOn ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {mode === 'preflight' && onClosePreflight && (
            <button
              type="button"
              onClick={onClosePreflight}
              className="btn-tactile px-3.5 py-2 rounded-lg border border-subtle bg-canvas text-xs font-semibold text-muted hover:text-primary whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Pipeline</span>
            </button>
          )}

          {mode === 'preflight' && onStartChallenge && (
            <button
              type="button"
              onClick={() => {
                onToggleRead(true);
                onStartChallenge();
              }}
              className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
            >
              <span>{primaryCtaLabel}</span>
            </button>
          )}

          {mode === 'workspace-tab' && onReturnToChallenge && (
            <button
              type="button"
              onClick={onReturnToChallenge}
              className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>⚡ Return to Challenge Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
