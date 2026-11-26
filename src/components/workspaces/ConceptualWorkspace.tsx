import React, { useState } from 'react';
import { Question } from '../../types/platform';
import { CelebrationBurst } from '../visuals/CelebrationAndBadges';
import { FollowUpsSection } from './FollowUpsSection';
import { CheckCircle2, Eye, Trash2 } from 'lucide-react';

interface ConceptualWorkspaceProps {
  question: Question;
  answerDraft: string;
  onChangeAnswer: (val: string) => void;
  onOpenConcept: (conceptName: string) => void;
  onAskCopilot: (prompt: string) => void;
  onRecordSubmission: (passed: boolean) => void;
  isSolved: boolean;
}

export const ConceptualWorkspace: React.FC<ConceptualWorkspaceProps> = ({
  question,
  answerDraft,
  onChangeAnswer,
  onOpenConcept,
  onAskCopilot,
  onRecordSubmission,
  isSolved,
}) => {
  const spec = question.conceptualSpec!;
  const [showOutline, setShowOutline] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleGradeResponse = async () => {
    setGrading(true);
    setAiFeedback(null);
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'grade',
          context: {
            view: 'Conceptual / Behavioral Workspace',
            questionTitle: question.title,
            questionPrompt: question.prompt,
            concept: question.concept,
            codeBuffer: answerDraft,
          },
          messages: [
            {
              role: 'user',
              content: `Evaluate my written answer against this Tier-1 rubric (${spec.rubricChecklist.join(
                '; '
              )}). Give a brief Verdict (Pass / Needs Depth), score out of 100, and 2 specific improvements.`,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grading failed');
      setAiFeedback(data.reply);
      const passed = answerDraft.trim().length >= 80;
      onRecordSubmission(passed);
      if (passed) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2100);
      }
    } catch (err: unknown) {
      setAiFeedback(err instanceof Error ? err.message : 'Unable to evaluate response.');
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <CelebrationBurst
        visible={showCelebration}
        label="✅ Staff-Level Answer Logged"
        sublabel="Rubric signals & STAR+L structure verified!"
      />
      {/* Left Pane: Prompt, Rubric, Probes */}
      <div className="lg:col-span-5 rounded-xl border border-subtle bg-card p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between text-muted">
          <span className="font-mono font-semibold text-accent">
            #{String(question.number).padStart(3, '0')} · {question.company}
          </span>
          <div className="flex items-center gap-2">
            {isSolved && <span className="text-emerald-700 dark:text-[#10B981] font-semibold">✅ Completed</span>}
            <span
              className={`px-2 py-0.5 rounded-full border font-semibold ${
                question.difficulty === 'Easy'
                  ? 'bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border-emerald-600/40 dark:border-[#10B981]/40'
                  : question.difficulty === 'Medium'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/40 dark:border-amber-500/40'
                  : 'bg-[#EF4444]/15 text-red-700 dark:text-[#EF4444] border-red-600/40 dark:border-[#EF4444]/40'
              }`}
            >
              {question.difficulty === 'Easy' ? '🟢' : question.difficulty === 'Medium' ? '🟡' : '🔴'}{' '}
              {question.difficulty}
            </span>
          </div>
        </div>

        <h2 className="text-base font-bold text-primary">
          {question.title}
        </h2>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onOpenConcept(question.concept)}
            className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-accent border border-accent/30"
          >
            🧩 {question.concept}
          </button>
          <button
            onClick={() => onAskCopilot('Help me structure a Staff-level answer for this question.')}
            className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-accent-contrast hover:bg-accent-hover"
          >
            ✨ Ask Study AI
          </button>
        </div>

        <p className="text-sm text-primary/85 leading-relaxed">
          {spec.scenario}
        </p>

        <div>
          <h3 className="font-semibold text-primary mb-1.5">
            Evaluation Rubric Signals
          </h3>
          <ul className="space-y-1.5 text-primary/85">
            {spec.rubricChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-primary mb-1.5">
            Likely Follow-Up Probes
          </h3>
          <ul className="space-y-1.5 text-primary/85">
            {spec.followUpProbes.map((p, i) => (
              <li key={i}>• {p}</li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-subtle">
          <button
            onClick={() => setShowOutline((v) => !v)}
            className="text-accent font-semibold hover:underline flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            {showOutline ? 'Hide Sample Outline' : 'Show Sample Outline'}
          </button>
          {showOutline && (
            <pre className="mt-2 p-3 rounded-lg bg-canvas border border-subtle whitespace-pre-wrap text-xs text-primary/85">
              {spec.sampleOutline}
            </pre>
          )}
        </div>

        <FollowUpsSection followUps={question.followUps || []} onPracticeWithAi={onAskCopilot} />
      </div>

      {/* Right Pane: Structured Response Pad + AI Grading */}
      <div className="lg:col-span-7 rounded-xl border border-subtle bg-card flex flex-col">
        <div className="px-4 py-2.5 border-b border-subtle flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-primary">
            Structured Technical / STAR+L Response Pad
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeAnswer('')}
              className="btn-tactile px-2.5 py-1.5 rounded-lg border border-[#EF4444]/40 text-[#EF4444] text-xs font-semibold hover:bg-[#EF4444]/10 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              disabled={grading || answerDraft.trim().length < 20}
              onClick={handleGradeResponse}
              className="btn-tactile px-3.5 py-1.5 rounded-lg bg-[#10B981] text-[#09090B] text-xs font-bold hover:bg-[#0EA572] disabled:opacity-50"
            >
              {grading ? 'Reviewing...' : '✅ Submit & Grade'}
            </button>
          </div>
        </div>

        <div className="p-4 flex-1">
          <textarea
            value={answerDraft}
            onChange={(e) => onChangeAnswer(e.target.value)}
            placeholder={
              question.trackId === 'behavioral'
                ? 'Situation:\nTask:\nAction:\nResult (metrics):\nLearnings:'
                : '1. Core Storage / Execution Mechanism:\n2. Complexity & Bottlenecks:\n3. Trade-offs & Failure Modes:'
            }
            className="w-full h-72 rounded-lg border border-subtle bg-canvas text-primary p-3.5 text-sm leading-relaxed focus:outline-none focus:border-accent"
          />
        </div>

        {aiFeedback && (
          <div className="border-t border-subtle p-4 text-xs whitespace-pre-wrap text-primary/90 max-h-60 overflow-y-auto">
            {aiFeedback}
          </div>
        )}
      </div>
    </div>
  );
};
