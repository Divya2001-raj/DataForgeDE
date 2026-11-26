import React, { useMemo, useRef, useState } from 'react';
import { Question, SchemaRelation, SchemaTable } from '../../types/platform';
import { CelebrationBurst } from '../visuals/CelebrationAndBadges';
import { FollowUpsSection } from './FollowUpsSection';
import { Code2, Copy, Link2, Plus, Rocket, Trash2 } from 'lucide-react';

interface ModelingWorkspaceProps {
  question: Question;
  tables: SchemaTable[];
  relations: SchemaRelation[];
  onChangeTables: (tables: SchemaTable[]) => void;
  onChangeRelations: (relations: SchemaRelation[]) => void;
  onOpenConcept: (conceptName: string) => void;
  onAskCopilot: (prompt: string) => void;
  onRecordSubmission: (passed: boolean) => void;
}

interface SchemaReviewResult {
  score: number;
  verdict: string;
  grainCheck: string;
  strengths: string[];
  improvements: string[];
  followUpProbe: string;
}

export const ModelingWorkspace: React.FC<ModelingWorkspaceProps> = ({
  question,
  tables,
  relations,
  onChangeTables,
  onChangeRelations,
  onOpenConcept,
  onAskCopilot,
  onRecordSubmission,
}) => {
  const spec = question.modelingSpec!;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showDdlModal, setShowDdlModal] = useState(false);
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<SchemaTable['tableType']>('DIM');
  const [relFrom, setRelFrom] = useState('');
  const [relTo, setRelTo] = useState('');
  const [relCard, setRelCard] = useState<SchemaRelation['cardinality']>('1:N');
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<SchemaReviewResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const generatedDdl = useMemo(() => {
    const tableSql = tables
      .map((t) => {
        const cols = t.columns.map((c) => {
          const pk = c.keyType === 'PK' ? ' PRIMARY KEY' : '';
          return `  ${c.name} ${c.dataType}${pk}`;
        });
        return `-- ${t.tableType} TABLE${t.grain ? ` | Grain: ${t.grain}` : ''}\nCREATE TABLE ${t.name} (\n${cols.join(',\n')}\n);`;
      })
      .join('\n\n');

    const relComments = relations
      .map((r) => `-- REL: ${r.fromTable} (${r.cardinality}) -> ${r.toTable} ON ${r.joinKey}`)
      .join('\n');

    return `${tableSql}${relComments ? `\n\n${relComments}` : ''}`;
  }, [tables, relations]);

  const addTable = () => {
    const clean = newTableName.trim() || `${newTableType.toLowerCase()}_table_${tables.length + 1}`;
    const idx = tables.length;
    const newTbl: SchemaTable = {
      id: `tbl-${Date.now()}`,
      name: clean,
      tableType: newTableType,
      grain: newTableType === 'FACT' ? 'One row per event' : 'One row per entity version',
      x: 40 + (idx % 2) * 300,
      y: 40 + Math.floor(idx / 2) * 200,
      columns: [
        {
          id: `col-${Date.now()}-1`,
          name: `${clean.replace(/^(dim_|fact_|bridge_)/, '')}_sk`,
          dataType: 'BIGINT',
          keyType: 'PK',
        },
        {
          id: `col-${Date.now()}-2`,
          name: 'created_at',
          dataType: 'TIMESTAMP',
          keyType: '',
        },
      ],
    };
    onChangeTables([...tables, newTbl]);
    setNewTableName('');
  };

  const addColumn = (tableId: string) => {
    onChangeTables(
      tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: [
                ...t.columns,
                {
                  id: `col-${Date.now()}`,
                  name: `col_${t.columns.length + 1}`,
                  dataType: 'VARCHAR(128)',
                  keyType: '',
                },
              ],
            }
          : t
      )
    );
  };

  const updateColumn = (
    tableId: string,
    colId: string,
    patch: Partial<SchemaTable['columns'][number]>
  ) => {
    onChangeTables(
      tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
            }
          : t
      )
    );
  };

  const removeColumn = (tableId: string, colId: string) => {
    onChangeTables(
      tables.map((t) =>
        t.id === tableId ? { ...t, columns: t.columns.filter((c) => c.id !== colId) } : t
      )
    );
  };

  const addRelation = () => {
    if (!relFrom || !relTo || relFrom === relTo) return;
    onChangeRelations([
      ...relations,
      {
        id: `rel-${Date.now()}`,
        fromTable: relFrom,
        toTable: relTo,
        cardinality: relCard,
        joinKey: 'entity_sk',
      },
    ]);
  };

  const handlePointerDown = (e: React.PointerEvent, tbl: SchemaTable) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingId(tbl.id);
    setDragOffset({
      x: e.clientX - rect.left - tbl.x,
      y: e.clientY - rect.top - tbl.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = Math.max(8, Math.min(rect.width - 280, e.clientX - rect.left - dragOffset.x));
    const ny = Math.max(8, Math.min(rect.height - 140, e.clientY - rect.top - dragOffset.y));
    onChangeTables(tables.map((t) => (t.id === draggingId ? { ...t, x: nx, y: ny } : t)));
  };

  const handleReview = async () => {
    setReviewing(true);
    setReviewError(null);
    try {
      const res = await fetch('/api/ai/review-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionTitle: question.title,
          businessContext: spec.businessContext,
          requirements: spec.requirements,
          tables,
          relationships: relations,
          ddl: generatedDdl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Schema grading failed');
      setReviewResult(data);
      const passed = Number(data.score) >= 65;
      onRecordSubmission(passed);
      if (passed) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2100);
      }
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Unable to grade schema.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <CelebrationBurst
        visible={showCelebration}
        label="✅ Schema Approved"
        sublabel={reviewResult ? `${reviewResult.verdict} · ${reviewResult.score}/100` : 'Dimensional grain verified!'}
      />
      {/* Left Pane: Problem, Business Context, Requirements, Constraints, 5-Step Guide */}
      <div className="lg:col-span-4 rounded-xl border border-subtle bg-card p-4 space-y-4 max-h-[780px] overflow-y-auto text-xs">
        <div>
          <div className="flex items-center justify-between text-muted">
            <span className="font-mono font-semibold text-accent">
              #{String(question.number).padStart(3, '0')} · {question.company}
            </span>
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
          <h2 className="text-base font-bold text-primary mt-1.5">
            {spec.problem}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onOpenConcept(question.concept)}
              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-accent border border-accent/30"
            >
              🧩 {question.concept}
            </button>
            <button
              onClick={() => onAskCopilot('How should I declare the grain, Fact tables, and SCD2 dimensions for this schema?')}
              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-accent-contrast hover:bg-accent-hover"
            >
              ✨ Ask Study AI
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-primary">Business Context</h3>
          <p className="text-primary/85 leading-relaxed">{spec.businessContext}</p>
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-primary">Requirements</h3>
          <ul className="space-y-1 text-primary/85">
            {spec.requirements.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-primary">Constraints</h3>
          <ul className="space-y-1 text-primary/85">
            {spec.constraints.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-subtle">
          <h3 className="font-semibold text-primary">5-Step Approach Guide</h3>
          <ul className="space-y-1.5 text-primary/85">
            {spec.approachGuide.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <FollowUpsSection followUps={question.followUps || []} onPracticeWithAi={onAskCopilot} />
      </div>

      {/* Right Pane: Interactive ER / Dimensional Builder + Export SQL + AI Grading */}
      <div className="lg:col-span-8 rounded-xl border border-subtle bg-card flex flex-col max-h-[780px]">
        {/* Controls Toolbar */}
        <div className="p-3 border-b border-subtle space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. dim_product"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-subtle bg-canvas text-primary w-36"
              />
              <select
                value={newTableType}
                onChange={(e) => setNewTableType(e.target.value as SchemaTable['tableType'])}
                aria-label="Table Type"
                className="px-2 py-1.5 text-xs rounded-lg border border-subtle bg-canvas text-primary"
              >
                <option value="FACT">FACT</option>
                <option value="DIM">DIM</option>
                <option value="BRIDGE">BRIDGE</option>
                <option value="STAGING">STAGING</option>
              </select>
              <button
                onClick={addTable}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-accent text-accent text-xs font-semibold hover:bg-accent/10 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Table
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDdlModal(true)}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-accent bg-accent/15 text-accent text-xs font-semibold hover:bg-accent/25 flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                Export SQL
              </button>
              <button
                disabled={reviewing || tables.length === 0}
                onClick={handleReview}
                className="btn-tactile px-3.5 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5"
              >
                <Rocket className="w-3.5 h-3.5" />
                {reviewing ? 'Grading...' : '🚀 Submit for AI Review'}
              </button>
            </div>
          </div>

          {/* Relationship Builder */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted font-medium flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-accent" /> Link:
            </span>
            <select
              value={relFrom}
              onChange={(e) => setRelFrom(e.target.value)}
              aria-label="From Table"
              className="px-2 py-1 rounded border border-subtle bg-canvas text-primary"
            >
              <option value="">From Table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={relCard}
              onChange={(e) => setRelCard(e.target.value as SchemaRelation['cardinality'])}
              aria-label="Cardinality"
              className="px-2 py-1 rounded border border-subtle bg-canvas text-primary"
            >
              <option value="1:N">1:N</option>
              <option value="N:1">N:1</option>
              <option value="1:1">1:1</option>
              <option value="M:N">M:N</option>
            </select>
            <select
              value={relTo}
              onChange={(e) => setRelTo(e.target.value)}
              aria-label="To Table"
              className="px-2 py-1 rounded border border-subtle bg-canvas text-primary"
            >
              <option value="">To Table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={addRelation}
              className="px-2.5 py-1 rounded border border-subtle bg-canvas text-primary hover:bg-accent hover:text-accent-contrast hover:border-accent font-medium transition-colors"
            >
              Add Relationship
            </button>
          </div>
        </div>

        {/* ER Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDraggingId(null)}
          className="relative flex-1 min-h-[380px] bg-canvas overflow-auto"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(var(--accent-rgb), 0.16) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {relations.map((r) => {
              const t1 = tables.find((t) => t.name === r.fromTable);
              const t2 = tables.find((t) => t.name === r.toTable);
              if (!t1 || !t2) return null;
              const x1 = t1.x + 138;
              const y1 = t1.y + 40;
              const x2 = t2.x + 138;
              const y2 = t2.y + 40;
              return (
                <g key={r.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent-primary)" strokeWidth={2} strokeDasharray="4 3" />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    fill="var(--accent-primary)"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {r.cardinality}
                  </text>
                </g>
              );
            })}
          </svg>

          {tables.map((tbl) => (
            <div
              key={tbl.id}
              style={{ left: tbl.x, top: tbl.y }}
              className="absolute w-[276px] rounded-xl border border-subtle bg-card shadow-md overflow-hidden"
            >
              <div
                onPointerDown={(e) => handlePointerDown(e, tbl)}
                className="px-3 py-2 bg-accent/15 border-b border-subtle flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
              >
                <div className="min-w-0 truncate">
                  <span className="text-[10px] font-bold text-accent mr-1.5">
                    {tbl.tableType}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {tbl.name}
                  </span>
                </div>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onChangeTables(tables.filter((t) => t.id !== tbl.id));
                  }}
                  className="text-muted hover:text-[#EF4444] shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 space-y-1.5 text-[11px] font-mono leading-snug">
                {tbl.columns.map((col) => (
                  <div key={col.id} className="flex items-center gap-1">
                    <select
                      value={col.keyType || ''}
                      onChange={(e) =>
                        updateColumn(tbl.id, col.id, {
                          keyType: e.target.value as SchemaTable['columns'][number]['keyType'],
                        })
                      }
                      aria-label="Key Type"
                      className="w-12 shrink-0 px-1 py-1 rounded bg-canvas border border-subtle text-[10px] text-accent font-bold"
                    >
                      <option value="">-</option>
                      <option value="PK">PK</option>
                      <option value="FK">FK</option>
                      <option value="SK">SK</option>
                      <option value="NK">NK</option>
                    </select>
                    <input
                      value={col.name}
                      onChange={(e) => updateColumn(tbl.id, col.id, { name: e.target.value })}
                      className="flex-1 min-w-0 px-1.5 py-1 rounded bg-canvas border border-subtle text-primary"
                    />
                    <input
                      value={col.dataType}
                      onChange={(e) => updateColumn(tbl.id, col.id, { dataType: e.target.value })}
                      className="w-20 shrink-0 px-1.5 py-1 rounded bg-canvas border border-subtle text-[10px] text-muted"
                    />
                    <button
                      onClick={() => removeColumn(tbl.id, col.id)}
                      className="w-5 h-5 shrink-0 flex items-center justify-center text-muted hover:text-[#EF4444]"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addColumn(tbl.id)}
                  className="w-full py-1 rounded border border-dashed border-subtle text-[10px] text-accent hover:border-accent"
                >
                  + Add Column
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* AI Schema Grade Panel */}
        {(reviewResult || reviewError) && (
          <div className="border-t border-subtle p-4 max-h-[220px] overflow-y-auto text-xs space-y-2">
            {reviewError && (
              <div className="animate-shake p-3 rounded-lg bg-[#EF4444]/15 text-[#EF4444]">❌ {reviewError}</div>
            )}
            {reviewResult && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-primary">
                    Schema Grade: {reviewResult.verdict}
                  </span>
                  <span className="font-mono font-bold text-sm text-accent tabular-nums">
                    {reviewResult.score}/100
                  </span>
                </div>
                <p className="text-primary/85">
                  <strong>Grain Check:</strong> {reviewResult.grainCheck}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="font-semibold text-[#10B981]">Strengths</div>
                    <ul className="space-y-1 text-primary/85">
                      {reviewResult.strengths?.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-500">Improvements</div>
                    <ul className="space-y-1 text-primary/85">
                      {reviewResult.improvements?.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Export SQL DDL Modal */}
      {showDdlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-subtle bg-card overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between">
              <span className="text-sm font-bold text-primary">Generated Warehouse DDL</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(generatedDdl);
                    setCopiedDdl(true);
                    setTimeout(() => setCopiedDdl(false), 1800);
                  }}
                  className="px-3 py-1 rounded-lg bg-accent text-accent-contrast text-xs font-semibold flex items-center gap-1 hover:bg-accent-hover"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedDdl ? 'Copied!' : 'Copy DDL'}
                </button>
                <button
                  onClick={() => setShowDdlModal(false)}
                  className="px-2.5 py-1 rounded-lg border border-subtle text-xs text-primary"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="p-4 bg-[#09090B] text-emerald-300 font-mono text-xs max-h-[420px] overflow-auto">
              {generatedDdl}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
