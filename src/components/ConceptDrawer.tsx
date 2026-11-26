import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getConceptGuide } from '../data/concepts';
import { AnimatedConceptDiagram } from './visuals/AnimatedConceptDiagram';
import { BookOpen, Sparkles, X, AlertTriangle, Layers, Code2 } from 'lucide-react';

interface ConceptDrawerProps {
  conceptName: string | null;
  onClose: () => void;
  onAskCopilot: (prompt: string, conceptName: string) => void;
}

export const ConceptDrawer: React.FC<ConceptDrawerProps> = ({
  conceptName,
  onClose,
  onAskCopilot,
}) => {
  const guide = conceptName ? getConceptGuide(conceptName) : null;

  return (
    <AnimatePresence>
      {conceptName && guide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full bg-canvas border-l border-subtle flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-accent flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>🧩 Topic Masterclass · {guide.category}</span>
                </div>
                <h2 className="text-lg font-bold text-primary mt-1">
                  {guide.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close Concept Drawer"
                className="btn-tactile p-2 rounded-lg border border-subtle hover:border-accent text-muted hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              <p className="text-primary/90 leading-relaxed">{guide.summary}</p>

              <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                <h3 className="text-xs font-semibold text-accent mb-1.5">
                  🧠 Core Mental Model
                </h3>
                <p className="text-xs text-primary leading-relaxed">
                  {guide.mentalModel}
                </p>
              </div>

              {/* Animated Visual SVG Mermaid-Style Flow Diagram */}
              <div>
                <h3 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  📐 Visual Data-Flow Architecture
                </h3>
                <AnimatedConceptDiagram conceptName={guide.name} />
              </div>

              {/* Internals */}
              <div>
                <h3 className="text-xs font-semibold text-muted mb-2">
                  ⚡ Under-the-Hood Internals
                </h3>
                <ul className="space-y-2">
                  {guide.internals.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-primary/90 leading-relaxed"
                    >
                      <span className="text-accent font-mono font-bold mt-0.5">{i + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trade-offs */}
              <div>
                <h3 className="text-xs font-semibold text-muted mb-2">
                  🏗️ Production Trade-offs
                </h3>
                <div className="space-y-2.5">
                  {guide.tradeOffs.map((t, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-subtle bg-card p-3 text-xs"
                    >
                      <div className="font-semibold text-primary">
                        {t.optionA} vs. {t.optionB}
                      </div>
                      <p className="text-muted mt-1">{t.whenToChoose}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pitfalls */}
              <div>
                <h3 className="text-xs font-semibold text-[#EF4444] mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Common Interview &amp; Production Pitfalls
                </h3>
                <ul className="space-y-1.5">
                  {guide.pitfalls.map((p, i) => (
                    <li key={i} className="text-xs text-primary/90 flex gap-2">
                      <span className="text-[#EF4444]">❌</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Code Reference */}
              <div>
                <h3 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-accent" />
                  Canonical Pattern
                </h3>
                <pre className="p-3.5 rounded-lg bg-[#09090B] text-emerald-300 border border-[#27272A] font-mono text-xs overflow-x-auto leading-relaxed">
                  {guide.codeExample}
                </pre>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-subtle flex items-center justify-between gap-3">
              <button
                onClick={() =>
                  onAskCopilot(
                    `Explain "${guide.name}" simply first, then give me a Staff-level deep dive and a quick interview example.`,
                    guide.name
                  )
                }
                className="btn-tactile flex-1 py-2.5 px-4 rounded-lg bg-accent text-accent-contrast font-semibold text-xs hover:bg-accent-hover flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                ✨ Ask Study AI: Deep-Dive &amp; Quiz Me
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
