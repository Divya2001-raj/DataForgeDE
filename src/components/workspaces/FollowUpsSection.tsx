import React, { useState } from 'react';
import { FollowUpItem } from '../../types/platform';
import { ChevronDown, ChevronUp, Eye, Sparkles } from 'lucide-react';

interface FollowUpsSectionProps {
  followUps: FollowUpItem[];
  onPracticeWithAi: (questionText: string) => void;
}

export const FollowUpsSection: React.FC<FollowUpsSectionProps> = ({
  followUps,
  onPracticeWithAi,
}) => {
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({});

  if (!followUps || followUps.length === 0) return null;

  const toggleReveal = (idx: number) => {
    setRevealedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="pt-3 border-t border-subtle space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-primary">
          🎯 Tier-1 Interviewer Follow-Ups ({followUps.length} Curveballs)
        </h3>
        <span className="text-[10px] text-accent font-medium">Staff Defense Drills</span>
      </div>

      <div className="space-y-2">
        {followUps.map((fu, idx) => {
          const isOpen = Boolean(revealedMap[idx]);
          return (
            <div
              key={idx}
              className="rounded-lg border border-subtle bg-canvas p-3 space-y-2"
            >
              <div className="text-xs font-semibold text-primary leading-snug">
                Q{idx + 1}: {fu.question}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleReveal(idx)}
                  className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-subtle text-primary/85 hover:border-accent"
                >
                  <Eye className="w-3 h-3 text-accent" />
                  {isOpen ? 'Hide Staff Answer' : '👁️ Reveal Staff Answer & Trade-Offs'}
                  {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  onClick={() =>
                    onPracticeWithAi(
                      `Quiz me on this Tier-1 interviewer curveball and evaluate my explanation: "${fu.question}"`
                    )
                  }
                  className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-accent/15 text-accent hover:bg-accent hover:text-accent-contrast"
                >
                  <Sparkles className="w-3 h-3" />
                  ✨ Practice Answering with Study AI
                </button>
              </div>

              {isOpen && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-card border border-accent/30 text-[11px] space-y-1.5 leading-relaxed">
                  <div className="text-primary/90">
                    <span className="font-bold text-[#10B981]">Staff Answer: </span>
                    {fu.staffAnswer}
                  </div>
                  <div className="text-muted">
                    <span className="font-bold text-accent">Trade-Offs: </span>
                    {fu.tradeOffs}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
