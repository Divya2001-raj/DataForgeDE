import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface CelebrationBurstProps {
  visible: boolean;
  label?: string;
  sublabel?: string;
}

const PARTICLES = [
  { x: -110, y: -70, color: 'var(--accent-primary)', size: 8 },
  { x: -75, y: -95, color: '#10B981', size: 7 },
  { x: -30, y: -110, color: 'var(--accent-primary)', size: 9 },
  { x: 25, y: -105, color: '#10B981', size: 7 },
  { x: 75, y: -90, color: 'var(--accent-primary)', size: 8 },
  { x: 115, y: -65, color: '#10B981', size: 8 },
  { x: -95, y: 35, color: '#10B981', size: 6 },
  { x: 95, y: 40, color: 'var(--accent-primary)', size: 6 },
  { x: -55, y: 65, color: 'var(--accent-primary)', size: 7 },
  { x: 55, y: 65, color: '#10B981', size: 7 },
];

export const CelebrationBurst: React.FC<CelebrationBurstProps> = ({
  visible,
  label = '✅ Accepted',
  sublabel = 'All assertions passed!',
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
        >
          {/* Particle Confetti */}
          <div className="relative flex items-center justify-center">
            {PARTICLES.map((p, idx) => (
              <motion.span
                key={idx}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                animate={{ x: p.x * 1.4, y: p.y * 1.4, scale: 1.1, opacity: 0, rotate: 180 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
                className="absolute rounded-sm"
              />
            ))}

            {/* Animated Badge */}
            <motion.div
              initial={{ scale: 0.7, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: -10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              className="px-5 py-3 rounded-2xl border border-[#10B981]/60 bg-elevated text-primary shadow-[0_0_32px_var(--accent-glow)] flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <div className="text-sm font-bold text-primary">{label}</div>
                <div className="text-[11px] text-accent">{sublabel}</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface RankBadgesProps {
  solvedCount: number;
  mockCount: number;
  bestMockScore: number;
}

export const RankBadges: React.FC<RankBadgesProps> = ({
  solvedCount,
  mockCount,
  bestMockScore,
}) => {
  const badges = [
    {
      id: 'apprentice',
      title: 'Bronze Pipeline Apprentice',
      requirement: 'Solve 1+ question',
      unlocked: solvedCount >= 1,
      accent: '#D97706',
      emoji: '🥉',
      glyph: (
        <svg viewBox="0 0 48 48" className="w-10 h-10">
          <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="#1A1412" stroke="#D97706" strokeWidth="2" />
          <path d="M 16 26 L 24 18 L 32 26" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="30" r="3" fill="#F59E0B" />
        </svg>
      ),
    },
    {
      id: 'weaver',
      title: 'Silver Stream Weaver',
      requirement: 'Solve 10+ questions or 1+ Mock',
      unlocked: solvedCount >= 10 || mockCount >= 1,
      accent: '#94A3B8',
      emoji: '⚡',
      glyph: (
        <svg viewBox="0 0 48 48" className="w-10 h-10">
          <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="#14161D" stroke="#94A3B8" strokeWidth="2" />
          <path d="M 26 12 L 17 25 L 24 25 L 22 36 L 31 23 L 24 23 Z" fill="#E2E8F0" />
        </svg>
      ),
    },
    {
      id: 'architect',
      title: 'Lavender Lakehouse Architect',
      requirement: 'Solve 25+ questions & 3+ Mocks',
      unlocked: solvedCount >= 25 && mockCount >= 3,
      accent: 'var(--accent-primary)',
      emoji: '🧱',
      glyph: (
        <svg viewBox="0 0 48 48" className="w-10 h-10">
          <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="#18122B" stroke="var(--accent-primary)" strokeWidth="2.2" />
          <rect x="15" y="16" width="18" height="6" rx="2" fill="var(--accent-primary)" />
          <rect x="15" y="25" width="18" height="6" rx="2" fill="var(--accent-primary)" fillOpacity="0.65" />
        </svg>
      ),
    },
    {
      id: 'google_staff',
      title: 'Google L4 Staff-Ready',
      requirement: 'Score 80+ on Google Mock',
      unlocked: bestMockScore >= 80,
      accent: '#10B981',
      emoji: '🚀',
      glyph: (
        <svg viewBox="0 0 48 48" className="w-10 h-10">
          <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="#0D221B" stroke="#10B981" strokeWidth="2.2" />
          <path d="M 24 12 L 28 21 L 37 22 L 30 28 L 32 37 L 24 32 L 16 37 L 18 28 L 11 22 L 20 21 Z" fill="#10B981" />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-subtle bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary">
          🏆 Engineering Rank Badges &amp; Milestones
        </h2>
        <span className="text-xs font-mono text-accent tabular-nums">
          {badges.filter((b) => b.unlocked).length}/{badges.length} Unlocked
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-lg border p-3.5 flex items-center gap-3 transition-all ${
              b.unlocked
                ? 'border-accent/60 bg-canvas shadow-[0_0_20px_-6px_rgba(var(--accent-rgb),0.35)]'
                : 'border-subtle bg-canvas/50 opacity-55 grayscale'
            }`}
          >
            <div className="shrink-0">{b.glyph}</div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-primary truncate">
                {b.emoji} {b.title}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {b.unlocked ? 'Unlocked' : b.requirement}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
