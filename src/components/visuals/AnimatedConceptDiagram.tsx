import React from 'react';
import { motion } from 'motion/react';

interface AnimatedConceptDiagramProps {
  conceptName: string;
}

type DiagramKind = 'scd2' | 'window' | 'shuffle' | 'rag' | 'streaming' | 'storage';

function detectDiagramKind(conceptName: string): DiagramKind {
  const lower = conceptName.toLowerCase();
  if (lower.includes('scd') || lower.includes('bi-temporal') || lower.includes('modeling')) return 'scd2';
  if (lower.includes('window') || lower.includes('session')) return 'window';
  if (lower.includes('skew') || lower.includes('shuffle') || lower.includes('spark')) return 'shuffle';
  if (lower.includes('rag') || lower.includes('vector') || lower.includes('feature')) return 'rag';
  if (lower.includes('kafka') || lower.includes('watermark') || lower.includes('stream')) return 'streaming';
  return 'storage';
}

export const AnimatedConceptDiagram: React.FC<AnimatedConceptDiagramProps> = ({
  conceptName,
}) => {
  const kind = detectDiagramKind(conceptName);

  return (
    <div className="rounded-xl border border-subtle bg-editor p-3.5 overflow-hidden">
      <div className="flex items-center justify-between text-[11px] font-mono text-muted mb-2">
        <span className="text-accent font-semibold">Interactive Architecture &amp; Data Flow</span>
        <span>{kind.toUpperCase()} PATTERN</span>
      </div>

      {kind === 'scd2' && (
        <svg viewBox="0 0 460 130" className="w-full h-auto font-mono">
          {/* Timeline track */}
          <line x1="24" y1="30" x2="436" y2="30" stroke="var(--border-subtle)" strokeWidth="2" />
          {/* Version 1 */}
          <rect x="24" y="42" width="180" height="36" rx="6" fill="var(--bg-card)" stroke="var(--border-subtle)" />
          <text x="34" y="57" fill="var(--text-primary)" fontSize="10" fontWeight="bold">SK: 5001 · Tier: Gold</text>
          <text x="34" y="70" fill="var(--text-muted)" fontSize="9">[2025-01-01 .. 2026-03-14] · cur=0</text>
          {/* Version 2 */}
          <rect x="216" y="42" width="220" height="36" rx="6" fill="var(--bg-elevated)" stroke="var(--accent-primary)" strokeWidth="1.5" />
          <text x="226" y="57" fill="var(--text-primary)" fontSize="10" fontWeight="bold">SK: 5002 · Tier: Platinum</text>
          <text x="226" y="70" fill="var(--accent-primary)" fontSize="9">[2026-03-15 .. 9999-12-31] · cur=1</text>
          {/* Animated Point-in-time Fact Lookup Beam */}
          <motion.g
            animate={{ x: [0, 190, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <line x1="110" y1="16" x2="110" y2="105" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
            <rect x="58" y="96" width="104" height="22" rx="5" fill="#10B981" />
            <text x="110" y="110" textAnchor="middle" fill="#04120B" fontSize="9" fontWeight="bold">
              Order.ts BETWEEN
            </text>
          </motion.g>
        </svg>
      )}

      {kind === 'window' && (
        <svg viewBox="0 0 460 130" className="w-full h-auto font-mono">
          {/* Events */}
          {[
            { x: 30, t: '10:00', f: '1', s: 'S1' },
            { x: 120, t: '10:12', f: '0', s: 'S1' },
            { x: 265, t: '11:05', f: '1', s: 'S2' },
            { x: 365, t: '11:18', f: '0', s: 'S2' },
          ].map((ev, idx) => (
            <g key={idx}>
              <rect x={ev.x} y="24" width="68" height="44" rx="6" fill="var(--bg-card)" stroke={ev.f === '1' ? 'var(--accent-primary)' : 'var(--border-subtle)'} />
              <text x={ev.x + 34} y="41" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">{ev.t}</text>
              <text x={ev.x + 34} y="57" textAnchor="middle" fill={ev.f === '1' ? 'var(--accent-primary)' : '#10B981'} fontSize="9">
                {ev.s} (flag={ev.f})
              </text>
            </g>
          ))}
          {/* Gap > 30m highlight */}
          <path d="M 190 46 L 262 46" stroke="#EF4444" strokeWidth="2" className="animate-dash-flow" />
          <text x="226" y="38" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">+53m &gt; 30m</text>
          {/* Sliding Window Frame Sweep */}
          <motion.rect
            x="24"
            y="18"
            width="172"
            height="56"
            rx="8"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            animate={{ x: [24, 258, 24] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <text x="230" y="108" textAnchor="middle" fill="var(--text-muted)" fontSize="10">
            LAG() Gap Flag + SUM() OVER (PARTITION BY user ORDER BY ts)
          </text>
        </svg>
      )}

      {kind === 'shuffle' && (
        <svg viewBox="0 0 460 130" className="w-full h-auto font-mono">
          {/* Hot Key */}
          <rect x="16" y="36" width="98" height="54" rx="8" fill="rgba(239, 68, 68, 0.14)" stroke="#EF4444" />
          <text x="65" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">Hot Key</text>
          <text x="65" y="74" textAnchor="middle" fill="#EF4444" fontSize="9">98 GB OOM!</text>

          {/* Animated Arrows to Salted Buckets */}
          {[22, 54, 86].map((y, idx) => (
            <g key={idx}>
              <path d={`M 116 63 L 178 ${y + 12}`} stroke="var(--accent-primary)" strokeWidth="1.8" className="animate-dash-flow" />
              <rect x="180" y={y} width="110" height="24" rx="5" fill="var(--bg-card)" stroke="var(--accent-primary)" />
              <text x="235" y={y + 15} textAnchor="middle" fill="var(--text-primary)" fontSize="9">
                salt={idx} · ~32 GB
              </text>
              <path d={`M 292 ${y + 12} L 348 63`} stroke="#10B981" strokeWidth="1.8" className="animate-dash-flow" />
            </g>
          ))}

          {/* Final Stage 2 Reduce */}
          <rect x="350" y="36" width="96" height="54" rx="8" fill="rgba(16, 185, 129, 0.14)" stroke="#10B981" />
          <text x="398" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">Stage 2 Agg</text>
          <text x="398" y="74" textAnchor="middle" fill="#10B981" fontSize="9">Balanced SLA</text>
        </svg>
      )}

      {kind === 'rag' && (
        <svg viewBox="0 0 460 130" className="w-full h-auto font-mono">
          <rect x="14" y="42" width="76" height="42" rx="7" fill="var(--bg-card)" stroke="var(--accent-primary)" />
          <text x="52" y="66" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">Query</text>

          <path d="M 92 56 L 132 34" stroke="var(--accent-primary)" strokeWidth="1.8" className="animate-dash-flow" />
          <path d="M 92 70 L 132 92" stroke="var(--accent-primary)" strokeWidth="1.8" className="animate-dash-flow" />

          <rect x="134" y="14" width="106" height="36" rx="6" fill="var(--bg-elevated)" stroke="var(--accent-primary)" />
          <text x="187" y="36" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">Dense ScaNN + ACL</text>

          <rect x="134" y="76" width="106" height="36" rx="6" fill="var(--bg-card)" stroke="var(--border-subtle)" />
          <text x="187" y="98" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">Sparse BM25</text>

          <path d="M 242 32 L 278 58" stroke="#10B981" strokeWidth="1.8" className="animate-dash-flow" />
          <path d="M 242 94 L 278 68" stroke="#10B981" strokeWidth="1.8" className="animate-dash-flow" />

          <rect x="280" y="42" width="76" height="42" rx="7" fill="var(--bg-card)" stroke="#10B981" />
          <text x="318" y="61" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">RRF Fusion</text>
          <text x="318" y="74" textAnchor="middle" fill="#10B981" fontSize="8">k=60 Rerank</text>

          <path d="M 358 63 L 382 63" stroke="#10B981" strokeWidth="2" className="animate-dash-flow" />
          <rect x="384" y="42" width="64" height="42" rx="7" fill="rgba(16, 185, 129, 0.14)" stroke="#10B981" />
          <text x="416" y="66" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">Gemini</text>
        </svg>
      )}

      {(kind === 'streaming' || kind === 'storage') && (
        <svg viewBox="0 0 460 130" className="w-full h-auto font-mono">
          <rect x="16" y="38" width="90" height="48" rx="7" fill="var(--bg-card)" stroke="var(--accent-primary)" />
          <text x="61" y="59" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">
            {kind === 'streaming' ? 'Pub/Sub / Kafka' : 'Query Planner'}
          </text>
          <text x="61" y="73" textAnchor="middle" fill="var(--accent-primary)" fontSize="8">
            {kind === 'streaming' ? 'Idempotent EOS' : 'Partition Prune'}
          </text>

          <path d="M 108 62 L 154 62" stroke="var(--accent-primary)" strokeWidth="2" className="animate-dash-flow" />

          <rect x="156" y="38" width="126" height="48" rx="7" fill="var(--bg-elevated)" stroke="var(--accent-primary)" />
          <text x="219" y="59" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">
            {kind === 'streaming' ? 'Flink / Dataflow' : 'Zone Maps / Delta Log'}
          </text>
          <text x="219" y="73" textAnchor="middle" fill="var(--accent-primary)" fontSize="8">
            {kind === 'streaming' ? 'Event-Time Watermark' : 'Skip 99% Cold Blocks'}
          </text>

          <path d="M 284 62 L 332 62" stroke="#10B981" strokeWidth="2" className="animate-dash-flow" />
          <path d="M 219 88 L 219 104 L 332 104" fill="none" stroke="#EF4444" strokeWidth="1.5" className="animate-dash-flow" />

          <rect x="334" y="38" width="110" height="48" rx="7" fill="rgba(16, 185, 129, 0.14)" stroke="#10B981" />
          <text x="389" y="59" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">
            {kind === 'streaming' ? 'BigQuery / Iceberg' : 'Vectorized Scan'}
          </text>
          <text x="389" y="73" textAnchor="middle" fill="#10B981" fontSize="8">
            {kind === 'streaming' ? 'Atomic MERGE' : 'Sub-Second SLA'}
          </text>

          <rect x="334" y="94" width="110" height="22" rx="4" fill="rgba(239, 68, 68, 0.14)" stroke="#EF4444" />
          <text x="389" y="108" textAnchor="middle" fill="#EF4444" fontSize="8" fontWeight="bold">
            {kind === 'streaming' ? 'Late Events -> DLQ' : 'Pruned / Skipped'}
          </text>
        </svg>
      )}
    </div>
  );
};
