import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DsaPattern, Question } from '../types/platform';
import { DSA_PATTERN_GUIDES } from '../data/dsaPatterns';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Cpu,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

interface PatternMasterclassDrawerProps {
  patternName: DsaPattern | null;
  allDsaQuestions: Question[];
  solvedQuestionIds: string[];
  onClose: () => void;
  onOpenQuestion: (question: Question) => void;
  onAskCopilot: (prompt: string) => void;
}

export const PatternMasterclassDrawer: React.FC<PatternMasterclassDrawerProps> = ({
  patternName,
  allDsaQuestions,
  solvedQuestionIds,
  onClose,
  onOpenQuestion,
  onAskCopilot,
}) => {
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const guide = patternName ? DSA_PATTERN_GUIDES[patternName] : null;
  const solvedSet = new Set(solvedQuestionIds);
  const relatedProblems = patternName
    ? allDsaQuestions.filter((q) => q.dsaPattern === patternName)
    : [];
  const solvedCount = relatedProblems.filter((q) => solvedSet.has(q.id)).length;

  const handleCopy = () => {
    if (!guide) return;
    navigator.clipboard?.writeText(guide.codeTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 1600);
  };

  return (
    <AnimatePresence>
      {patternName && guide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl h-full bg-canvas border-l border-subtle flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-accent flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>NeetCode Pattern Masterclass · {guide.category}</span>
                </div>
                <h2 className="text-lg font-bold text-primary mt-1">
                  🧩 {guide.name}
                </h2>
                <div className="mt-1 text-xs text-muted tabular-nums">
                  {solvedCount} / {relatedProblems.length} practice problems solved in this pattern
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close Pattern Masterclass Drawer"
                className="btn-tactile p-2 rounded-lg border border-subtle hover:border-accent text-muted hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* Mental Model */}
              <div className="rounded-xl border border-accent/35 bg-accent/10 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-accent">
                  🧠 Core Algorithmic Intuition
                </h3>
                <p className="text-xs text-primary leading-relaxed">
                  {guide.mentalModel}
                </p>
              </div>

              {/* Recognition Signals */}
              <div>
                <h3 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  How to Recognize This Pattern in an Interview
                </h3>
                <ul className="space-y-2">
                  {guide.recognitionSignals.map((sig, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-primary/90 leading-relaxed"
                    >
                      <span className="font-mono font-bold text-accent mt-0.5">{idx + 1}.</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Time & Space Complexity Template */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-subtle bg-card p-3.5">
                  <div className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    Target Time Complexity
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-primary">
                    {guide.complexityTemplate.time}
                  </div>
                </div>
                <div className="rounded-xl border border-subtle bg-card p-3.5">
                  <div className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-accent" />
                    Target Space Complexity
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-primary">
                    {guide.complexityTemplate.space}
                  </div>
                </div>
                <div className="sm:col-span-2 text-xs text-muted px-1">
                  {guide.complexityTemplate.note}
                </div>
              </div>

              {/* Canonical Python Template */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-accent" />
                    Canonical Python 3 Template
                  </h3>
                  <button
                    onClick={handleCopy}
                    className="btn-tactile px-2.5 py-1 rounded-md border border-subtle text-[11px] font-semibold text-accent hover:border-accent flex items-center gap-1"
                  >
                    {copiedTemplate ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedTemplate ? 'Copied' : 'Copy Template'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-editor text-primary border border-subtle font-mono text-xs overflow-x-auto leading-relaxed">
                  {guide.codeTemplate}
                </pre>
              </div>

              {/* DE Tie-In & Pitfalls */}
              <div className="rounded-xl border border-subtle bg-card p-4 space-y-2.5">
                <div className="text-xs font-bold text-primary">
                  Data Engineering Scale Tie-In
                </div>
                <p className="text-xs text-primary/85 leading-relaxed">
                  {guide.dataEngTieIn}
                </p>
                <div className="pt-2 border-t border-subtle">
                  <div className="text-xs font-semibold text-[#EF4444] mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Common Interview Pitfalls
                  </div>
                  <ul className="space-y-1">
                    {guide.pitfalls.map((p, i) => (
                      <li key={i} className="text-xs text-primary/90 flex gap-2">
                        <span className="text-[#EF4444]">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* All Related Practice Problems */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-primary">
                    Related Practice Problems ({relatedProblems.length})
                  </h3>
                  <span className="text-[11px] font-mono text-accent tabular-nums">
                    {solvedCount}/{relatedProblems.length} solved
                  </span>
                </div>

                <div className="divide-y divide-subtle rounded-xl border border-subtle bg-card overflow-hidden">
                  {relatedProblems.map((q) => {
                    const solved = solvedSet.has(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          onClose();
                          onOpenQuestion(q);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-canvas/70 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-muted">
                            <span className="font-mono text-accent font-semibold">
                              #{String(q.number).padStart(3, '0')}
                            </span>
                            <span>{q.company}</span>
                            {solved && (
                              <span className="inline-flex items-center gap-1 text-[#10B981] font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Solved
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-primary truncate mt-0.5">
                            {q.title}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold shrink-0 ${
                            q.difficulty === 'Easy'
                              ? 'bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border-emerald-600/40 dark:border-[#10B981]/40'
                              : q.difficulty === 'Medium'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/40 dark:border-amber-500/40'
                              : 'bg-[#EF4444]/15 text-red-700 dark:text-[#EF4444] border-red-600/40 dark:border-[#EF4444]/40'
                          }`}
                        >
                          {q.difficulty === 'Easy' ? '🟢' : q.difficulty === 'Medium' ? '🟡' : '🔴'}{' '}
                          {q.difficulty}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-subtle flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  onClose();
                  onAskCopilot(
                    `Give me a rapid-fire recognition drill and edge-case checklist for the "${guide.name}" pattern in Python 3.`
                  );
                }}
                className="btn-tactile flex-1 py-2.5 px-4 rounded-lg bg-accent text-accent-contrast font-semibold text-xs hover:bg-accent-hover flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Ask Study AI: Drill Me on {guide.shortLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
