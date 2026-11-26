import React, { useEffect, useMemo, useState } from 'react';
import {
  DsaPattern,
  Question,
  QuestionSubmissionRecord,
} from '../../types/platform';
import { DATASETS } from '../../data/datasets';
import {
  getDatasetPreview,
  runSqlExplainPlan,
  runSqlInBrowser,
  SqlExecutionResult,
  SqlExplainStep,
} from '../../utils/sqlRunner';
import { PythonExecutionResult, runPythonInBrowser } from '../../utils/pythonRunner';
import { AnimatedConceptDiagram } from '../visuals/AnimatedConceptDiagram';
import { CelebrationBurst } from '../visuals/CelebrationAndBadges';
import { FollowUpsSection } from './FollowUpsSection';
import {
  Activity,
  BookOpen,
  Bug,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';

interface IdeWorkspaceProps {
  question: Question;
  code: string;
  onChangeCode: (val: string) => void;
  onOpenConcept: (conceptName: string) => void;
  onOpenPattern?: (patternName: DsaPattern) => void;
  onAskCopilot: (prompt: string) => void;
  onRecordSubmission: (
    passed: boolean,
    meta?: { runtimeMs?: number; language?: string; codeSnapshot?: string }
  ) => void;
  isSolved: boolean;
  submissions?: QuestionSubmissionRecord[];
  discussions?: Array<{ id: string; author: string; text: string; createdAt: string }>;
  onAddDiscussion?: (text: string) => void;
}

function parseDdlColumns(ddl: string): Array<{ tableName: string; columns: Array<{ name: string; type: string }> }> {
  const results: Array<{ tableName: string; columns: Array<{ name: string; type: string }> }> = [];
  const regex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(ddl)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const cols = body
      .split(',')
      .map((line) => line.trim())
      .filter((line) => line && !line.toUpperCase().startsWith('PRIMARY KEY'))
      .map((line) => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0] || '',
          type: parts.slice(1).join(' ').replace(/\bPRIMARY\s+KEY\b/i, 'PK').trim() || 'TEXT',
        };
      });
    results.push({ tableName, columns: cols });
  }
  return results;
}

export const IdeWorkspace: React.FC<IdeWorkspaceProps> = ({
  question,
  code,
  onChangeCode,
  onOpenConcept,
  onOpenPattern,
  onAskCopilot,
  onRecordSubmission,
  isSolved,
  submissions = [],
  discussions = [],
  onAddDiscussion,
}) => {
  const defaultLang: 'sql' | 'python' | 'pyspark' =
    question.language === 'pyspark'
      ? 'pyspark'
      : question.language === 'python'
      ? 'python'
      : question.datasetId
      ? 'sql'
      : 'python';

  const [selectedLang, setSelectedLang] = useState<'sql' | 'python' | 'pyspark'>(defaultLang);
  const isSql = selectedLang === 'sql';
  const datasetId = question.datasetId || 'ecommerce_orders';
  const dataset = DATASETS[datasetId] || DATASETS.ecommerce_orders;

  const [leftTab, setLeftTab] = useState<'question' | 'solution' | 'submissions' | 'discuss'>('question');
  const [solutionUnlocked, setSolutionUnlocked] = useState(false);
  const [selectedApproachIdx, setSelectedApproachIdx] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [plainTextDocMode, setPlainTextDocMode] = useState(false);

  const [bottomTab, setBottomTab] = useState<'testcase' | 'result' | 'plan'>('testcase');
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);

  const [tablePreviews, setTablePreviews] = useState<
    Array<{ tableName: string; columns: string[]; rows: Array<Array<string | number | null>> }>
  >([]);
  const [running, setRunning] = useState(false);
  const [sqlResult, setSqlResult] = useState<SqlExecutionResult | null>(null);
  const [pyResult, setPyResult] = useState<PythonExecutionResult | null>(null);
  const [explainSteps, setExplainSteps] = useState<SqlExplainStep[] | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [discussionInput, setDiscussionInput] = useState('');

  const ddlTables = useMemo(() => parseDdlColumns(dataset.ddl), [dataset.ddl]);

  useEffect(() => {
    const lang: 'sql' | 'python' | 'pyspark' =
      question.language === 'pyspark'
        ? 'pyspark'
        : question.language === 'python'
        ? 'python'
        : question.datasetId
        ? 'sql'
        : 'python';
    setSelectedLang(lang);
    setSqlResult(null);
    setPyResult(null);
    setExplainSteps(null);
    setExplainError(null);
    setSubmitMessage(null);
    setShowCelebration(false);
    setLeftTab('question');
    setSolutionUnlocked(false);
    setSelectedApproachIdx(0);
    setDebugMode(false);
    setBottomTab('testcase');
    setActiveCaseIdx(0);

    if (lang === 'sql') {
      getDatasetPreview(datasetId)
        .then(setTablePreviews)
        .catch(() => setTablePreviews([]));
    }
  }, [question.id, datasetId, question.language, question.datasetId]);

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1800);
  };

  const handleToggleDebugPipeline = () => {
    if (!debugMode && question.buggyCode) {
      onChangeCode(question.buggyCode);
      setDebugMode(true);
    } else {
      onChangeCode(question.starterCode || '');
      setDebugMode(false);
    }
  };

  const handleRun = async (isSubmit = false) => {
    setRunning(true);
    setSubmitMessage(null);
    setBottomTab('result');

    if (isSql) {
      const [res, plan] = await Promise.all([
        runSqlInBrowser(code, datasetId, question.testCases || []),
        runSqlExplainPlan(code, datasetId),
      ]);
      setSqlResult(res);
      setPyResult(null);
      setExplainSteps(plan.steps);
      setExplainError(plan.error || null);

      const allPassed = res.success && res.testResults.every((t) => t.passed);
      if (isSubmit) {
        onRecordSubmission(allPassed, {
          runtimeMs: res.executionMs,
          language: selectedLang,
          codeSnapshot: code,
        });
        if (allPassed) triggerCelebration();
        setSubmitMessage(
          allPassed
            ? '✅ Accepted — All SQLite assertions passed and logged to Dashboard!'
            : '❌ Wrong Answer — One or more test assertions failed. Review output below.'
        );
      }
    } else {
      const res = await runPythonInBrowser(code, question.testCases || []);
      setPyResult(res);
      setSqlResult(null);
      const allPassed = res.success && res.testResults.every((t) => t.passed);
      if (isSubmit) {
        onRecordSubmission(allPassed, {
          runtimeMs: res.executionMs,
          language: selectedLang,
          codeSnapshot: code,
        });
        if (allPassed) triggerCelebration();
        setSubmitMessage(
          allPassed
            ? '✅ Accepted — All Python/PySpark unit & edge-case tests passed!'
            : '❌ Wrong Answer — Some assertions failed. Check expected vs actual output.'
        );
      }
    }
    setRunning(false);
  };

  const approaches = question.approaches || [];
  const activeApproach = approaches[selectedApproachIdx] || approaches[0];
  const testCases = question.testCases || [];
  const activeCase = testCases[activeCaseIdx] || testCases[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch relative">
      <CelebrationBurst
        visible={showCelebration}
        label="✅ Accepted"
        sublabel="All assertions passed & recorded!"
      />

      {/* Left Pane: 📄 Question / 💡 Solution / 🕒 Submissions / 💬 Discuss */}
      <div className="lg:col-span-5 rounded-xl border border-subtle bg-card flex flex-col max-h-[820px]">
        <div className="p-4 border-b border-subtle">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono font-semibold text-accent">
                #{String(question.number).padStart(3, '0')}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-canvas border border-subtle font-medium text-primary">
                🏢 {question.company}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isSolved && <span className="text-emerald-700 dark:text-[#10B981] font-semibold">✅ Solved</span>}
              {question.dsaPattern && (
                <button
                  type="button"
                  onClick={() => onOpenPattern?.(question.dsaPattern!)}
                  title="Open Pattern Masterclass Drawer"
                  className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-accent/15 text-accent border border-accent/45 hover:bg-accent/25 whitespace-nowrap"
                >
                  🧩 {question.dsaPattern}
                </button>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full border font-semibold ${
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

          <h2 className="text-base font-bold text-primary mt-2">
            {question.title}
          </h2>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenConcept(question.concept)}
              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
            >
              <BookOpen className="w-3 h-3" />
              🧩 {question.concept}
            </button>
            <button
              onClick={() =>
                onAskCopilot(
                  `What is this question asking and what is the optimal ${isSql ? 'SQL' : 'Python/PySpark'} pattern?`
                )
              }
              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-accent-contrast hover:bg-accent-hover"
            >
              <Sparkles className="w-3 h-3" />
              ✨ Ask Study AI: What is this?
            </button>
          </div>
        </div>

        {/* Left 4-Tab Bar */}
        <div className="px-4 pt-2 border-b border-subtle flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          {(
            [
              { id: 'question', label: '📄 Question' },
              { id: 'solution', label: '💡 Solution' },
              { id: 'submissions', label: `🕒 Submissions (${submissions.length})` },
              { id: 'discuss', label: `💬 Discuss (${discussions.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setLeftTab(t.id)}
              className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
                leftTab === t.id
                  ? 'border-accent text-primary'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {leftTab === 'question' && (
            <>
              <p className="text-[13px] text-primary/85 leading-relaxed whitespace-pre-line">
                {question.prompt}
              </p>

              {/* Inline SQL Schemas + Live Rows */}
              {isSql && ddlTables.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-bold text-primary">
                    🗄️ Table Schemas ({dataset.name})
                  </h3>
                  {ddlTables.map((tbl) => (
                    <div
                      key={tbl.tableName}
                      className="rounded-lg border border-subtle bg-canvas overflow-hidden"
                    >
                      <div className="px-3 py-1.5 bg-card font-mono font-bold text-accent border-b border-subtle">
                        Table: {tbl.tableName}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[11px] leading-snug">
                          <thead>
                            <tr className="border-b border-subtle text-muted">
                              <th className="px-3 py-1.5 font-semibold whitespace-nowrap">Column Name</th>
                              <th className="px-3 py-1.5 font-semibold whitespace-nowrap">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-subtle">
                            {tbl.columns.map((col) => (
                              <tr key={col.name}>
                                <td className="px-3 py-1.5 text-primary whitespace-nowrap">{col.name}</td>
                                <td className="px-3 py-1.5 text-muted whitespace-nowrap">{col.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Examples 1 & 2 */}
              {question.examples && question.examples.length > 0 && (
                <div className="space-y-3">
                  {question.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-subtle bg-canvas p-3 space-y-2"
                    >
                      <div className="font-bold text-primary">{ex.title}</div>
                      {ex.inputTable && (
                        <div>
                          <div className="text-[10px] font-mono text-muted mb-1">
                            Input ({ex.inputTable.tableName}):
                          </div>
                          <div className="overflow-x-auto rounded border border-subtle">
                            <table className="w-full text-left font-mono text-[11px]">
                              <thead>
                                <tr className="bg-card border-b border-subtle">
                                  {ex.inputTable.columns.map((c) => (
                                    <th key={c} className="px-2 py-1 text-primary">{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-subtle">
                                {ex.inputTable.rows.map((r, ri) => (
                                  <tr key={ri}>
                                    {r.map((v, ci) => (
                                      <td key={ci} className="px-2 py-1 text-primary/90">{v === null ? 'NULL' : String(v)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {ex.outputTable && (
                        <div>
                          <div className="text-[10px] font-mono text-muted mb-1">
                            Output ({ex.outputTable.tableName}):
                          </div>
                          <div className="overflow-x-auto rounded border border-subtle">
                            <table className="w-full text-left font-mono text-[11px]">
                              <thead>
                                <tr className="bg-card border-b border-subtle">
                                  {ex.outputTable.columns.map((c) => (
                                    <th key={c} className="px-2 py-1 text-primary">{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-subtle">
                                {ex.outputTable.rows.map((r, ri) => (
                                  <tr key={ri}>
                                    {r.map((v, ci) => (
                                      <td key={ci} className="px-2 py-1 text-primary/90">{v === null ? 'NULL' : String(v)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {ex.inputText && (
                        <div className="font-mono text-[11px] bg-card p-2 rounded border border-subtle">
                          <div><span className="text-muted">Input:</span> {ex.inputText}</div>
                          <div><span className="text-[#10B981]">Output:</span> {ex.outputText}</div>
                        </div>
                      )}
                      <div className="text-[11px] text-muted">
                        <strong className="text-accent">Explanation:</strong> {ex.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {question.constraints && question.constraints.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-primary">Constraints</h3>
                  <ul className="space-y-1 font-mono text-[11px] text-primary/80">
                    {question.constraints.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-accent">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mandatory Tier-1 Interviewer Follow-Ups */}
              <FollowUpsSection
                followUps={question.followUps || []}
                onPracticeWithAi={onAskCopilot}
              />
            </>
          )}

          {leftTab === 'solution' && (
            <div className="space-y-4">
              {!solutionUnlocked ? (
                <div className="rounded-xl border border-dashed border-accent/50 bg-canvas p-6 text-center space-y-3">
                  <div className="text-sm font-bold text-primary">
                    💡 Reference Solution &amp; Multi-Approach Trade-Offs Locked
                  </div>
                  <p className="text-muted leading-relaxed">
                    Try writing your own query/algorithm from scratch first. Unlock when ready to inspect Brute Force, Optimized, and At-Scale Production approaches.
                  </p>
                  <button
                    onClick={() => setSolutionUnlocked(true)}
                    className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast font-bold hover:bg-accent-hover"
                  >
                    Reveal Solution Approaches &amp; Diagram
                  </button>
                </div>
              ) : (
                <>
                  <AnimatedConceptDiagram conceptName={question.concept} />

                  {approaches.length > 0 && (
                    <div className="space-y-3">
                      {/* Trade-Off Comparison Table */}
                      <div className="rounded-lg border border-subtle bg-canvas overflow-hidden">
                        <div className="px-3 py-2 bg-card font-bold text-primary border-b border-subtle">
                          Trade-Off Comparison
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] leading-snug">
                            <thead>
                              <tr className="border-b border-subtle text-muted">
                                <th className="px-3 py-1.5 whitespace-nowrap">Approach</th>
                                <th className="px-3 py-1.5 whitespace-nowrap">Complexity</th>
                                <th className="px-3 py-1.5 whitespace-nowrap">Warehouse Cost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-subtle">
                              {approaches.map((ap, i) => (
                                <tr
                                  key={i}
                                  onClick={() => setSelectedApproachIdx(i)}
                                  className={`cursor-pointer ${
                                    selectedApproachIdx === i
                                      ? 'bg-accent/15 font-semibold'
                                      : 'hover:bg-card/60'
                                  }`}
                                >
                                  <td className="px-3 py-1.5 text-accent whitespace-nowrap">{ap.tier}</td>
                                  <td className="px-3 py-1.5 font-mono whitespace-nowrap">{ap.complexity}</td>
                                  <td className="px-3 py-1.5">{ap.costProfile}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Approach Selector Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {approaches.map((ap, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedApproachIdx(i)}
                            className={`px-2.5 py-1 rounded-lg font-semibold border ${
                              selectedApproachIdx === i
                                ? 'bg-accent text-accent-contrast border-accent'
                                : 'border-subtle bg-canvas text-primary'
                            }`}
                          >
                            {ap.tier}
                          </button>
                        ))}
                      </div>

                      {activeApproach && (
                        <div className="space-y-2.5 rounded-lg border border-subtle bg-canvas p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-primary">
                              {activeApproach.name}
                            </span>
                            <button
                              onClick={() => onChangeCode(activeApproach.code)}
                              className="btn-tactile px-2.5 py-1 rounded bg-accent/15 text-accent font-semibold hover:bg-accent/25 shrink-0"
                            >
                              Load Into Editor
                            </button>
                          </div>
                          <p className="text-primary/85 leading-relaxed">
                            {activeApproach.intuition}
                          </p>
                          <ul className="space-y-1 text-muted">
                            {activeApproach.walkthrough.map((w, wi) => (
                              <li key={wi}>• {w}</li>
                            ))}
                          </ul>
                          <pre className="p-3 rounded-lg bg-[#09090B] text-emerald-300 border border-[#27272A] font-mono text-[11px] overflow-x-auto leading-[1.6]">
                            {activeApproach.code}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {leftTab === 'submissions' && (
            <div className="space-y-2.5">
              {submissions.length === 0 ? (
                <div className="py-10 text-center text-muted">
                  No submissions recorded for this problem yet. Click <strong>Submit</strong> after testing your code.
                </div>
              ) : (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-lg border border-subtle bg-canvas p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className={`font-bold ${sub.passed ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {sub.passed ? '✅ Accepted' : '❌ Wrong Answer'} · {sub.language.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-muted font-mono mt-0.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {sub.runtimeMs} ms ·{' '}
                        {new Date(sub.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => onChangeCode(sub.codeSnapshot)}
                      className="btn-tactile px-2.5 py-1 rounded border border-accent/40 text-accent font-semibold hover:bg-accent/10"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {leftTab === 'discuss' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-subtle bg-canvas p-3 space-y-1.5">
                <div className="font-bold text-accent">Staff Edge-Case Checklist</div>
                <p className="text-primary/85 leading-relaxed">
                  Discuss NULL tie-breaks, skew keys, partitioning cost, or late-arriving watermarks here for quick review before interviews.
                </p>
              </div>

              {onAddDiscussion && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!discussionInput.trim()) return;
                    onAddDiscussion(discussionInput.trim());
                    setDiscussionInput('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={discussionInput}
                    onChange={(e) => setDiscussionInput(e.target.value)}
                    placeholder="Add your edge-case takeaway..."
                    className="flex-1 px-3 py-2 rounded-lg border border-subtle bg-canvas text-primary"
                  />
                  <button
                    type="submit"
                    className="btn-tactile px-3 py-2 rounded-lg bg-accent text-accent-contrast font-bold hover:bg-accent-hover"
                  >
                    Post
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {discussions.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-subtle bg-canvas p-3"
                  >
                    <div className="flex items-center justify-between text-[11px] text-accent font-semibold">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {d.author}
                      </span>
                      <span className="text-muted">{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-primary/85">{d.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Code/SQL Editor + Execution Tabs (Testcase / Test Result / Execution Plan) */}
      <div className="lg:col-span-7 rounded-xl border border-subtle bg-card flex flex-col max-h-[820px]">
        <div className="px-4 py-2.5 border-b border-subtle flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-primary">
            <Terminal className="w-4 h-4 text-accent" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as 'sql' | 'python' | 'pyspark')}
              aria-label="Language Runtime"
              className="px-2 py-1 rounded-md border border-subtle bg-canvas text-primary text-xs font-mono font-semibold"
            >
              <option value="sql">🗄️ SQLite / BigQuery SQL</option>
              <option value="python">🐍 Python 3</option>
              <option value="pyspark">⚡ PySpark</option>
            </select>

            {question.buggyCode && (
              <button
                onClick={handleToggleDebugPipeline}
                className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 ${
                  debugMode
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/50'
                    : 'border-subtle text-primary/80 hover:border-accent'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                {debugMode ? 'Exit Debug Mode' : '🐛 Debug Broken Pipeline'}
              </button>
            )}

            <button
              onClick={() => setPlainTextDocMode((v) => !v)}
              title="Simulate a Google Doc coding interview (no syntax colors, no autocomplete, dry-run only before Submit)"
              className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 ${
                plainTextDocMode
                  ? 'bg-accent text-accent-contrast border-accent'
                  : 'border-subtle text-primary/80 hover:border-accent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {plainTextDocMode ? '📝 Google Doc Mode ON' : '📝 Google Doc Mode'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAskCopilot('Inspect my current code/SQL buffer and point out bugs, edge cases, or shuffle/scan optimizations.')}
              className="btn-tactile px-2.5 py-1.5 rounded-lg border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/10 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ✨ Debug AI
            </button>
            <button
              onClick={() => {
                setDebugMode(false);
                onChangeCode(question.starterCode || '');
              }}
              title="Reset to starter skeleton"
              className="btn-tactile px-2 py-1.5 rounded-lg border border-subtle text-xs text-muted hover:text-primary flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={() => onChangeCode('')}
              className="btn-tactile px-2 py-1.5 rounded-lg border border-[#EF4444]/40 text-[#EF4444] text-xs font-semibold hover:bg-[#EF4444]/10 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              disabled={running || plainTextDocMode}
              onClick={() => handleRun(false)}
              title={
                plainTextDocMode
                  ? 'Run disabled in Google Doc Plain-Text Mode — mentally dry-run before Submit!'
                  : 'Execute in-browser'
              }
              className="btn-tactile px-3 py-1.5 rounded-lg border border-accent text-accent text-xs font-semibold hover:bg-accent/10 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" />
              {plainTextDocMode ? 'Dry-Run Only' : running ? 'Running...' : 'Run'}
            </button>
            <button
              disabled={running}
              onClick={() => handleRun(true)}
              className="btn-tactile px-3.5 py-1.5 rounded-lg bg-[#10B981] text-[#09090B] text-xs font-bold hover:bg-[#0EA572]"
            >
              Submit
            </button>
          </div>
        </div>

        {plainTextDocMode && (
          <div className="px-4 py-1.5 bg-accent/15 border-b border-accent/30 text-[11px] font-medium text-primary flex items-center justify-between">
            <span>
              📝 <strong>Google Doc Plain-Text Mode Active:</strong> Syntax highlighting, bracket pairing &amp; Run crutches disabled. Mentally trace commas, nulls &amp; edge cases before Submit.
            </span>
          </div>
        )}

        <div className={`flex-1 min-h-[260px] p-3 ${plainTextDocMode ? 'bg-white dark:bg-[#18181B]' : 'bg-[#09090B]'}`}>
          <textarea
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const next = code.slice(0, start) + '  ' + code.slice(end);
                onChangeCode(next);
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                });
              }
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Code and SQL Editor"
            className={`w-full h-full min-h-[240px] text-xs leading-[1.6] tracking-normal resize-none focus:outline-none p-3 ${
              plainTextDocMode
                ? 'bg-white dark:bg-[#18181B] text-[#09090B] dark:text-zinc-200 font-sans border border-zinc-200 dark:border-zinc-700 rounded-md shadow-inner'
                : 'bg-[#09090B] text-zinc-100 font-mono'
            }`}
          />
        </div>

        {/* Bottom Drawer: ✅ Testcase | >_ Test Result | 📊 Execution Plan */}
        <div className="border-t border-subtle flex flex-col max-h-[320px]">
          <div className="px-4 pt-2 border-b border-subtle flex items-center gap-5 text-xs font-semibold">
            <button
              onClick={() => setBottomTab('testcase')}
              className={`pb-2 border-b-2 transition-colors ${
                bottomTab === 'testcase'
                  ? 'border-accent text-primary'
                  : 'border-transparent text-muted'
              }`}
            >
              ✅ Testcase ({testCases.length})
            </button>
            <button
              onClick={() => setBottomTab('result')}
              className={`pb-2 border-b-2 transition-colors ${
                bottomTab === 'result'
                  ? 'border-accent text-primary'
                  : 'border-transparent text-muted'
              }`}
            >
              &gt;_ Test Result
            </button>
            <button
              onClick={() => setBottomTab('plan')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1 ${
                bottomTab === 'plan'
                  ? 'border-accent text-primary'
                  : 'border-transparent text-muted'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-accent" />
              📊 Execution Plan
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-3 text-xs">
            {bottomTab === 'testcase' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {testCases.map((tc, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCaseIdx(i)}
                      className={`px-2.5 py-1 rounded-md font-semibold border ${
                        activeCaseIdx === i
                          ? 'bg-accent text-accent-contrast border-accent'
                          : 'bg-canvas border-subtle text-primary/80'
                      }`}
                    >
                      {i === 2 ? 'Edge Case' : `Case ${i + 1}`}
                    </button>
                  ))}
                </div>

                {activeCase && (
                  <div className="rounded-lg border border-subtle bg-canvas p-3 space-y-1.5">
                    <div className="font-bold text-primary">{activeCase.name}</div>
                    <p className="text-muted">{activeCase.description}</p>
                    {activeCase.inputExpr && (
                      <div className="font-mono text-[11px] bg-card p-2 rounded">
                        <div>Input: {activeCase.inputExpr}</div>
                        {activeCase.expectedJson && (
                          <div className="text-[#10B981]">Expected: {activeCase.expectedJson}</div>
                        )}
                      </div>
                    )}
                    {isSql && tablePreviews[0] && (
                      <div className="text-[11px] text-muted font-mono">
                        Dataset sample (`{tablePreviews[0].tableName}`): {tablePreviews[0].rows.length} rows ready in SQLite WASM.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {bottomTab === 'result' && (
              <>
                {submitMessage && (
                  <div
                    className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                      submitMessage.startsWith('✅')
                        ? 'bg-[#10B981]/15 text-[#10B981]'
                        : 'bg-[#EF4444]/15 text-[#EF4444] animate-shake'
                    }`}
                  >
                    {submitMessage}
                  </div>
                )}

                {!sqlResult && !pyResult && (
                  <p className="text-muted">
                    Click <strong>Run</strong> to execute against live in-browser {isSql ? 'SQLite WASM tables' : 'Python unit tests'}, or <strong>Submit</strong> to record completion.
                  </p>
                )}

                {sqlResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">
                        Query Output ({sqlResult.rows.length} rows)
                      </span>
                      <span className="font-mono text-muted tabular-nums">{sqlResult.executionMs} ms</span>
                    </div>

                    {sqlResult.error ? (
                      <div className="p-3 rounded-lg bg-[#EF4444]/15 text-[#EF4444] font-mono animate-shake">
                        ❌ {sqlResult.error}
                      </div>
                    ) : (
                      sqlResult.columns.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-subtle bg-canvas">
                          <table className="w-full text-left text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-subtle bg-card">
                                {sqlResult.columns.map((c) => (
                                  <th key={c} className="px-2.5 py-1.5 font-semibold text-primary">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-subtle">
                              {sqlResult.rows.slice(0, 20).map((r, ri) => (
                                <tr key={ri}>
                                  {r.map((val, ci) => (
                                    <td key={ci} className="px-2.5 py-1.5 whitespace-nowrap text-primary/90">
                                      {val === null ? 'NULL' : String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    <div className="space-y-1.5">
                      {sqlResult.testResults.map((t, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                            t.passed ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444] animate-shake'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 font-semibold">
                            {t.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {t.name}
                          </span>
                          <span className="font-mono text-[11px]">{t.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pyResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{pyResult.engineLabel}</span>
                      <span className="font-mono text-muted tabular-nums">{pyResult.executionMs} ms</span>
                    </div>

                    {pyResult.error && (
                      <div className="p-3 rounded-lg bg-[#EF4444]/15 text-[#EF4444] font-mono animate-shake">
                        ❌ {pyResult.error}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {pyResult.testResults.map((t, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-2 rounded-lg ${
                            t.passed ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444] animate-shake'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5">
                              {t.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {t.name}
                            </span>
                            <span>{t.passed ? 'Passed' : 'Wrong Answer'}</span>
                          </div>
                          {t.actual && (
                            <div className="mt-1 font-mono text-[11px] opacity-85">
                              Actual: {t.actual} {t.expected ? `| Expected: ${t.expected}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {bottomTab === 'plan' && (
              <div className="space-y-2.5">
                {isSql ? (
                  explainError ? (
                    <div className="p-3 rounded-lg bg-[#EF4444]/15 text-[#EF4444] font-mono">
                      ❌ EXPLAIN Error: {explainError}
                    </div>
                  ) : explainSteps && explainSteps.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="font-bold text-primary">
                        Physical Query Plan (`EXPLAIN QUERY PLAN`)
                      </div>
                      {explainSteps.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-subtle bg-canvas font-mono text-[11px] flex items-center gap-2"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold">
                            Stage {idx + 1}
                          </span>
                          <span className="text-primary/90">{st.detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">Click <strong>Run</strong> to inspect physical scan, sort, and window execution stages.</p>
                  )
                ) : (
                  <div className="rounded-lg border border-subtle bg-canvas p-3 font-mono text-[11px] space-y-1.5">
                    <div className="font-bold text-accent">Distributed Stage &amp; Complexity Plan ({selectedLang.toUpperCase()})</div>
                    <div>• Stage 0: Input Partition Read / Stream Deserialization</div>
                    <div>• Stage 1: {selectedLang === 'pyspark' ? 'Exchange hashpartitioning (watch for wide shuffle skew)' : 'In-Memory Heap / Deque / Hash Index State'}</div>
                    <div>• Target Complexity: {approaches[approaches.length - 1]?.complexity || 'O(N log K)'} · {approaches[approaches.length - 1]?.costProfile || 'Minimal shuffle'}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
