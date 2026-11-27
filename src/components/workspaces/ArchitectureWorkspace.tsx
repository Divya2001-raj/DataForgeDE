import React, { useEffect, useRef, useState } from 'react';
import { ArchEdge, ArchNode, ArchTradeOffRow, Question } from '../../types/platform';
import { sanitizeAiErrorMessage } from '../../utils/storage';
import { reviewArchitecture } from '../../services/geminiAiService';
import { CelebrationBurst } from '../visuals/CelebrationAndBadges';
import { FollowUpsSection } from './FollowUpsSection';
import { ArrowRight, Calculator, ChevronDown, ChevronUp, Eye, Link2, Plus, RefreshCw, Rocket, Scale, Trash2 } from 'lucide-react';

interface ArchitectureWorkspaceProps {
  question: Question;
  nodes: ArchNode[];
  edges: ArchEdge[];
  onChangeNodes: (nodes: ArchNode[]) => void;
  onChangeEdges: (edges: ArchEdge[]) => void;
  onOpenConcept: (conceptName: string) => void;
  onAskCopilot: (prompt: string) => void;
  onRecordSubmission: (passed: boolean) => void;
}

const PALETTE: Array<{
  typeId: string;
  label: string;
  category: ArchNode['category'];
  subtitle: string;
}> = [
  { typeId: 'pubsub', label: 'Pub/Sub / Kafka', category: 'Ingestion', subtitle: 'Event Bus' },
  { typeId: 'cdc', label: 'Debezium / Datastream', category: 'Ingestion', subtitle: 'Log CDC' },
  { typeId: 'dataflow', label: 'Dataflow / Flink', category: 'Compute', subtitle: 'Stateful Stream' },
  { typeId: 'spark', label: 'PySpark / Dataproc', category: 'Compute', subtitle: 'Distributed Batch' },
  { typeId: 'bigquery', label: 'BigQuery / Snowflake', category: 'Warehouse', subtitle: 'Columnar OLAP' },
  { typeId: 'delta', label: 'Delta / Iceberg Lake', category: 'Storage', subtitle: 'ACID Parquet' },
  { typeId: 'bigtable', label: 'Bigtable / Redis', category: 'Storage', subtitle: '<10ms Serving' },
  { typeId: 'vector', label: 'Vertex Vector / HNSW', category: 'AI / Vector', subtitle: 'Hybrid RAG' },
  { typeId: 'dlq', label: 'DLQ + Schema Registry', category: 'Orchestration', subtitle: 'Contracts & Guard' },
  { typeId: 'airflow', label: 'Airflow / dbt', category: 'Orchestration', subtitle: 'DAG & Transform' },
];

interface ArchReviewResult {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  scaleAnalysis: string;
  followUpProbe: string;
}

export const ArchitectureWorkspace: React.FC<ArchitectureWorkspaceProps> = ({
  question,
  nodes,
  edges,
  onChangeNodes,
  onChangeEdges,
  onOpenConcept,
  onAskCopilot,
  onRecordSubmission,
}) => {
  const spec = question.architectureSpec!;
  const [revealedHints, setRevealedHints] = useState(0);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ArchReviewResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Capacity & Cost Estimator Scratchpad state
  const [showEstimator, setShowEstimator] = useState(false);
  const [qps, setQps] = useState(50000);
  const [payloadKb, setPayloadKb] = useState(2);
  const [retentionDays, setRetentionDays] = useState(365);

  // Architectural Decision & Trade-Off Matrix state
  const [showTradeOffs, setShowTradeOffs] = useState(true);
  const [tradeOffRows, setTradeOffRows] = useState<ArchTradeOffRow[]>([
    { id: 'to-1', decision: '', alternative: '', rationale: '' },
    { id: 'to-2', decision: '', alternative: '', rationale: '' },
    { id: 'to-3', decision: '', alternative: '', rationale: '' },
  ]);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReviewResult(null);
    setReviewError(null);
    setTradeOffRows([
      { id: 'to-1', decision: '', alternative: '', rationale: '' },
      { id: 'to-2', decision: '', alternative: '', rationale: '' },
      { id: 'to-3', decision: '', alternative: '', rationale: '' },
    ]);
  }, [question.id]);

  const mbPerSec = (qps * payloadKb) / 1024;
  const tbPerDay = (mbPerSec * 86400) / (1024 * 1024);
  const pbPerYear = (tbPerDay * 365) / 1024;
  const retainedTb = tbPerDay * retentionDays;
  const estMonthlyStorageUsd = Math.round(retainedTb * 20); // ~$0.02/GB active BQ/GCS
  const estMonthlyStreamingUsd = Math.round(tbPerDay * 30 * 50); // BQ Storage Write API rough calc

  const addNode = (item: (typeof PALETTE)[number]) => {
    const idx = nodes.length;
    const newNode: ArchNode = {
      id: `node-${Date.now()}-${idx}`,
      typeId: item.typeId,
      label: item.label,
      category: item.category,
      subtitle: item.subtitle,
      x: 40 + (idx % 3) * 210,
      y: 40 + Math.floor(idx / 3) * 110,
    };
    onChangeNodes([...nodes, newNode]);
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: ArchNode) => {
    if (connectFromId) {
      if (connectFromId !== node.id) {
        const exists = edges.some((ed) => ed.from === connectFromId && ed.to === node.id);
        if (!exists) {
          onChangeEdges([
            ...edges,
            {
              id: `edge-${Date.now()}`,
              from: connectFromId,
              to: node.id,
              label: 'stream / batch',
            },
          ]);
        }
      }
      setConnectFromId(null);
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingId(node.id);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = Math.max(8, Math.min(rect.width - 170, e.clientX - rect.left - dragOffset.x));
    const ny = Math.max(8, Math.min(rect.height - 70, e.clientY - rect.top - dragOffset.y));
    onChangeNodes(nodes.map((n) => (n.id === draggingId ? { ...n, x: nx, y: ny } : n)));
  };

  const removeNode = (id: string) => {
    onChangeNodes(nodes.filter((n) => n.id !== id));
    onChangeEdges(edges.filter((ed) => ed.from !== id && ed.to !== id));
  };

  const handleSubmitReview = async () => {
    setReviewing(true);
    setReviewError(null);
    try {
      const data = await reviewArchitecture({
        questionTitle: question.title,
        scenario: spec.scenario,
        task: spec.task,
        constraints: spec.scaleConstraints,
        nodes,
        edges,
        tradeOffMatrix: tradeOffRows,
      });
      setReviewResult(data);
      const passed = Number(data.score) >= 65;
      onRecordSubmission(passed);
      if (passed) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2100);
      }
    } catch (err: unknown) {
      setReviewError(sanitizeAiErrorMessage(err, 'Unable to grade architecture.'));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <CelebrationBurst
        visible={showCelebration}
        label="✅ Architecture Passed"
        sublabel={reviewResult ? `${reviewResult.verdict} · ${reviewResult.score}/100` : 'Staff-level flow verified!'}
      />

      {/* Left Pane: Scenario, Task, Scale, Estimator, Hints & Follow-Ups */}
      <div className="lg:col-span-4 rounded-xl border border-subtle bg-card p-4 space-y-4 max-h-[800px] overflow-y-auto text-xs">
        <div>
          <div className="flex items-center justify-between text-muted">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-semibold text-accent">#{String(question.number).padStart(3, '0')}</span>
              <span className="px-2 py-0.5 rounded bg-canvas border border-subtle text-primary">
                🏢 {question.company}
              </span>
            </div>
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
          <h2 className="text-base font-bold text-primary mt-1.5">{question.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onOpenConcept(question.concept)}
              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-accent border border-accent/30"
            >
              🧩 {question.concept}
            </button>
            <button
              onClick={() => onAskCopilot('Walk me through the architecture trade-offs and scale math for this system design.')}
              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-accent-contrast hover:bg-accent-hover"
            >
              ✨ Ask Study AI
            </button>
          </div>
        </div>

        {/* Collapsible Back-of-the-Envelope Capacity & Cost Estimator */}
        <div className="rounded-lg border border-accent/35 bg-canvas overflow-hidden">
          <button
            onClick={() => setShowEstimator((v) => !v)}
            className="w-full px-3 py-2 flex items-center justify-between font-bold text-primary hover:bg-accent/10"
          >
            <span className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-accent" />
              🧮 Capacity &amp; Cost Estimator
            </span>
            {showEstimator ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showEstimator && (
            <div className="p-3 border-t border-subtle space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] text-muted">Peak QPS</span>
                  <input
                    type="number"
                    min={1}
                    value={qps}
                    onChange={(e) => setQps(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2 py-1 rounded border border-subtle bg-card text-primary font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-muted">Payload (KB)</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={payloadKb}
                    onChange={(e) => setPayloadKb(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-2 py-1 rounded border border-subtle bg-card text-primary font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-muted">Retention (d)</span>
                  <input
                    type="number"
                    min={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2 py-1 rounded border border-subtle bg-card text-primary font-mono"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-card p-2.5 rounded-lg">
                <div>Throughput: <strong className="text-accent">{mbPerSec.toFixed(1)} MB/s</strong></div>
                <div>Daily Volume: <strong className="text-accent">{tbPerDay.toFixed(2)} TB/d</strong></div>
                <div>Annual Scale: <strong className="text-[#10B981]">{pbPerYear.toFixed(2)} PB/yr</strong></div>
                <div>Est GCP Cost: <strong className="text-amber-500">${(estMonthlyStorageUsd + estMonthlyStreamingUsd).toLocaleString()}/mo</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-primary">Scenario</h3>
          <p className="text-primary/85 leading-relaxed">{spec.scenario}</p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-primary">Your Task</h3>
          <p className="text-primary/85 leading-relaxed">{spec.task}</p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-primary">Scale &amp; Constraints</h3>
          <ul className="space-y-1 text-primary/85">
            {spec.scaleConstraints.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-primary">4-Step Approach Guide</h3>
          <ul className="space-y-1.5 text-primary/85">
            {spec.approachGuide.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary">Hints</h3>
            {revealedHints < spec.hints.length && (
              <button
                onClick={() => setRevealedHints((h) => h + 1)}
                className="text-accent font-semibold hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Reveal Hint ({revealedHints}/{spec.hints.length})
              </button>
            )}
          </div>
          {spec.hints.slice(0, revealedHints).map((hint, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-accent/10 border border-accent/30 text-primary">
              {hint}
            </div>
          ))}
        </div>

        <FollowUpsSection followUps={question.followUps || []} onPracticeWithAi={onAskCopilot} />
      </div>

      {/* Right Pane: Palette + Canvas + AI Review */}
      <div className="lg:col-span-8 rounded-xl border border-subtle bg-card flex flex-col max-h-[800px]">
        <div className="p-3 border-b border-subtle space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary">
              Click components to add · Drag to position · Connect arrows
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConnectFromId(connectFromId ? null : nodes[0]?.id || null)}
                disabled={nodes.length < 2}
                className={`btn-tactile px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 disabled:opacity-40 ${
                  connectFromId
                    ? 'bg-accent text-accent-contrast border-accent'
                    : 'border-subtle text-primary/80'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                {connectFromId ? 'Click Target Node...' : 'Draw Flow Arrow'}
              </button>
              <button
                onClick={() => {
                  onChangeNodes([]);
                  onChangeEdges([]);
                  setReviewResult(null);
                }}
                className="btn-tactile px-2.5 py-1.5 rounded-lg border border-[#EF4444]/40 text-[#EF4444] text-xs font-semibold hover:bg-[#EF4444]/10 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                disabled={reviewing || nodes.length === 0}
                onClick={handleSubmitReview}
                className="btn-tactile px-3.5 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5"
              >
                <Rocket className="w-3.5 h-3.5" />
                {reviewing ? 'Grading...' : '🚀 Submit for AI Review'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((item) => (
              <button
                key={item.typeId}
                onClick={() => addNode(item)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-subtle bg-canvas text-primary hover:border-accent transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-accent" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={canvasRef}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={() => setDraggingId(null)}
          className="relative flex-1 min-h-[360px] bg-canvas overflow-hidden select-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.18) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="arch-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent-primary)" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.from);
              const dst = nodes.find((n) => n.id === edge.to);
              if (!src || !dst) return null;
              return (
                <line
                  key={edge.id}
                  x1={src.x + 80}
                  y1={src.y + 30}
                  x2={dst.x + 80}
                  y2={dst.y + 30}
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  markerEnd="url(#arch-arrow)"
                />
              );
            })}
          </svg>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-muted">Architecture Whiteboard Ready</p>
                <p className="text-xs text-muted mt-1">
                  Click components above to place Ingestion, Compute, Storage, and AI nodes, then connect directional arrows.
                </p>
              </div>
            </div>
          )}

          {nodes.map((node) => {
            const isSource = connectFromId === node.id;
            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                style={{ left: node.x, top: node.y }}
                className={`absolute w-[164px] rounded-lg border p-2.5 cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${
                  isSource
                    ? 'border-accent ring-2 ring-accent/40 bg-accent/10'
                    : 'border-subtle bg-card hover:border-accent'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">{node.category}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setConnectFromId(node.id);
                      }}
                      title="Connect from this node"
                      className="text-muted hover:text-accent"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                      title="Remove node"
                      className="text-muted hover:text-[#EF4444]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs font-bold text-primary truncate">{node.label}</div>
                <div className="text-[10px] text-muted">{node.subtitle}</div>
              </div>
            );
          })}
        </div>

        {/* ⚖️ Key Trade-Offs Logged Widget (Evaluated by L4/L5 HC Rubric) */}
        <div className="border-t border-subtle bg-card">
          <button
            onClick={() => setShowTradeOffs((v) => !v)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-primary hover:bg-accent/10"
          >
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-accent" />
              ⚖️ Key Trade-Offs Logged ({tradeOffRows.filter((r) => r.decision.trim()).length}/{tradeOffRows.length}) — Graded in AI Review
            </span>
            {showTradeOffs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTradeOffs && (
            <div className="px-4 pb-3 space-y-2 text-[11px]">
              <div className="grid grid-cols-12 gap-2 font-semibold text-muted">
                <div className="col-span-4">Component / Option Chosen</div>
                <div className="col-span-3">Alternative Considered</div>
                <div className="col-span-5">Why Rejected at Scale</div>
              </div>
              {tradeOffRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={row.decision}
                    onChange={(e) =>
                      setTradeOffRows((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, decision: e.target.value } : r))
                      )
                    }
                    placeholder="e.g. Cloud Dataflow"
                    className="col-span-4 px-2 py-1 rounded border border-subtle bg-canvas text-primary"
                  />
                  <input
                    type="text"
                    value={row.alternative}
                    onChange={(e) =>
                      setTradeOffRows((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, alternative: e.target.value } : r))
                      )
                    }
                    placeholder="e.g. Spark Streaming"
                    className="col-span-3 px-2 py-1 rounded border border-subtle bg-canvas text-primary"
                  />
                  <div className="col-span-5 flex items-center gap-1">
                    <input
                      type="text"
                      value={row.rationale}
                      onChange={(e) =>
                        setTradeOffRows((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, rationale: e.target.value } : r))
                        )
                      }
                      placeholder="e.g. Native Pub/Sub EOS & serverless autoscaling"
                      className="flex-1 min-w-0 px-2 py-1 rounded border border-subtle bg-canvas text-primary"
                    />
                    {tradeOffRows.length > 1 && (
                      <button
                        onClick={() =>
                          setTradeOffRows((rows) => rows.filter((r) => r.id !== row.id))
                        }
                        className="text-muted hover:text-[#EF4444]"
                        title="Remove row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setTradeOffRows((rows) => [
                    ...rows,
                    { id: `to-${Date.now()}`, decision: '', alternative: '', rationale: '' },
                  ])
                }
                className="text-accent font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Decision Row
              </button>
            </div>
          )}
        </div>

        {(reviewResult || reviewError) && (
          <div className="border-t border-subtle p-4 max-h-[240px] overflow-y-auto text-xs space-y-2.5">
            {reviewError && (
              <div className="animate-shake p-3 rounded-lg bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-between gap-2">
                <span>❌ {reviewError}</span>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={handleSubmitReview}
                  className="btn-tactile px-2.5 py-1 rounded-md bg-accent text-accent-contrast text-[11px] font-bold hover:bg-accent-hover flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            )}
            {reviewResult && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-primary">
                    Staff Architecture Verdict: {reviewResult.verdict}
                  </span>
                  <span className="font-mono font-bold text-sm text-accent tabular-nums">{reviewResult.score}/100</span>
                </div>
                <p className="text-primary/85">{reviewResult.scaleAnalysis}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="font-semibold text-[#10B981] mb-1">Strengths</div>
                    <ul className="space-y-1 text-primary/85">
                      {reviewResult.strengths?.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-[#EF4444] mb-1">Gaps &amp; Risks</div>
                    <ul className="space-y-1 text-primary/85">
                      {reviewResult.gaps?.map((g, i) => (
                        <li key={i}>• {g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/30 text-primary">
                  <strong>Follow-up Probe:</strong> {reviewResult.followUpProbe}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
