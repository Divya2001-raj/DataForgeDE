import React, { useState } from 'react';
import { CarlStory } from '../types/platform';
import { Dices, Edit3, Plus, Save, Send, Sparkles, Trash2, X } from 'lucide-react';

interface CarlStoryBankProps {
  stories: CarlStory[];
  onSaveStory: (story: CarlStory) => void;
  onDeleteStory: (storyId: string) => void;
}

export const CarlStoryBank: React.FC<CarlStoryBankProps> = ({
  stories,
  onSaveStory,
  onDeleteStory,
}) => {
  const [editingStory, setEditingStory] = useState<CarlStory | null>(null);
  const [grillingStory, setGrillingStory] = useState<CarlStory | null>(null);
  const [grillMessages, setGrillMessages] = useState<Array<{ role: 'interviewer' | 'candidate'; text: string }>>([]);
  const [grillInput, setGrillInput] = useState('');
  const [grillLoading, setGrillLoading] = useState(false);

  const startNewStory = () => {
    setEditingStory({
      id: `carl-${Date.now()}`,
      title: '',
      projectTag: '',
      context: '',
      action: '',
      result: '',
      reflection: '',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory || !editingStory.title.trim()) return;
    onSaveStory({
      ...editingStory,
      updatedAt: new Date().toISOString(),
    });
    setEditingStory(null);
  };

  const startRandomGrill = async () => {
    if (stories.length === 0 || grillLoading) return;
    const picked = stories[Math.floor(Math.random() * stories.length)];
    setGrillingStory(picked);
    setGrillMessages([]);
    setGrillInput('');
    setGrillLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'quiz',
          context: {
            view: 'CARL Behavioral Story Bank Grill',
            trackName: 'Behavioral & Googleyness',
            concept: 'Googleyness & Ambiguity Navigation',
            questionTitle: picked.title,
            questionPrompt: `Project: ${picked.projectTag}\nContext: ${picked.context}\nAction: ${picked.action}\nResult: ${picked.result}\nReflection: ${picked.reflection}`,
          },
          messages: [
            {
              role: 'user',
              content:
                'Act as a Google L4/L5 Bar-Raiser Interviewer grilling me on this CARL story. Ask ONE sharp, skeptical curveball follow-up probing either my technical ownership, cross-team conflict, or my Reflection ("what I would do differently"). Keep it crisp (2-3 sentences).',
            },
          ],
        }),
      });
      const data = await res.json();
      const firstProbe = res.ok
        ? data.reply
        : `Looking at "${picked.title}", suppose a senior stakeholder pushed back on your approach right before cutover—how did you defend your decision with metrics, and what would you change today beyond "${picked.reflection}"?`;
      setGrillMessages([{ role: 'interviewer', text: firstProbe }]);
    } catch {
      setGrillMessages([
        {
          role: 'interviewer',
          text: `Walk me through the hardest technical trade-off in "${picked.title}"—what was your personal ownership vs your team's, and how did your Reflection change your engineering process afterward?`,
        },
      ]);
    } finally {
      setGrillLoading(false);
    }
  };

  const sendGrillReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grillingStory || !grillInput.trim() || grillLoading) return;
    const nextMsgs: Array<{ role: 'interviewer' | 'candidate'; text: string }> = [
      ...grillMessages,
      { role: 'candidate', text: grillInput.trim() },
    ];
    setGrillMessages(nextMsgs);
    setGrillInput('');
    setGrillLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'grade',
          context: {
            view: 'CARL Behavioral Story Bank Grill',
            questionTitle: grillingStory.title,
            questionPrompt: `Context: ${grillingStory.context}\nAction: ${grillingStory.action}\nResult: ${grillingStory.result}\nReflection: ${grillingStory.reflection}`,
          },
          messages: [
            ...nextMsgs.map((m) => ({
              role: m.role === 'interviewer' ? 'assistant' : 'user',
              content: m.text,
            })),
            {
              role: 'user',
              content:
                'Grade my answer on Googleyness & Leadership (Strong Hire / Hire / Lean Hire) in 2 concise sentences, then drop ONE final curveball follow-up.',
            },
          ],
        }),
      });
      const data = await res.json();
      const reply = res.ok
        ? data.reply
        : 'Good clarity and metric ownership. Final curveball: how would this design hold up if compliance audits required 7-year immutable replay?';
      setGrillMessages((prev) => [...prev, { role: 'interviewer', text: reply }]);
    } catch {
      setGrillMessages((prev) => [
        ...prev,
        {
          role: 'interviewer',
          text: 'Solid ownership framing. Follow-up: what concrete guardrail did you institutionalize so this issue never recurred?',
        },
      ]);
    } finally {
      setGrillLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-subtle bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary">
            🧭 My CARL Behavioral Story Bank ({stories.length} Stories)
          </h2>
          <p className="text-xs text-muted mt-1">
            Structure 6–8 core project stories using <strong>Context → Action → Result → Reflection</strong> for Google L4/L5 Googleyness &amp; Leadership rounds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={startRandomGrill}
            disabled={stories.length === 0 || grillLoading}
            className="btn-tactile px-3.5 py-2 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5"
          >
            <Dices className="w-4 h-4" />
            🎲 Grill Me on a Random Story
          </button>
          <button
            onClick={startNewStory}
            className="btn-tactile px-3.5 py-2 rounded-lg border border-accent text-accent text-xs font-semibold hover:bg-accent/10 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add CARL Story
          </button>
        </div>
      </div>

      {/* Interactive AI Grill Drawer/Panel */}
      {grillingStory && (
        <div className="rounded-xl border border-accent/50 bg-canvas p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-bold text-primary">
                AI Bar-Raiser Curveball Grill: {grillingStory.title}
              </span>
            </div>
            <button onClick={() => setGrillingStory(null)} className="text-muted hover:text-[#EF4444]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {grillMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  m.role === 'interviewer'
                    ? 'bg-card border border-subtle'
                    : 'ml-6 bg-accent/15 border border-accent/30'
                }`}
              >
                <div className="font-bold text-accent mb-1">
                  {m.role === 'interviewer' ? 'Google Bar-Raiser AI' : 'You'}
                </div>
                <div className="whitespace-pre-wrap text-primary/90 leading-relaxed">{m.text}</div>
              </div>
            ))}
            {grillLoading && <div className="text-accent">✨ Preparing Bar-Raiser curveball...</div>}
          </div>

          <form onSubmit={sendGrillReply} className="flex items-center gap-2">
            <input
              type="text"
              value={grillInput}
              onChange={(e) => setGrillInput(e.target.value)}
              placeholder="Respond using Context → Action → Result → Reflection..."
              className="flex-1 px-3 py-2 rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={grillLoading || !grillInput.trim()}
              className="btn-tactile p-2 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Editor Modal / Inline Form */}
      {editingStory && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-accent/50 bg-canvas p-5 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-primary">
              {stories.some((s) => s.id === editingStory.id) ? 'Edit CARL Story' : 'New CARL Story'}
            </span>
            <button type="button" onClick={() => setEditingStory(null)} className="text-muted hover:text-[#EF4444]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              value={editingStory.title}
              onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
              placeholder="Story Title (e.g. Healthcare 5TB Cost Optimization)"
              className="px-3 py-2 rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
            />
            <input
              value={editingStory.projectTag}
              onChange={(e) => setEditingStory({ ...editingStory, projectTag: e.target.value })}
              placeholder="Project Tag (e.g. Banking Migration · Geospatial)"
              className="px-3 py-2 rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea
              required
              value={editingStory.context}
              onChange={(e) => setEditingStory({ ...editingStory, context: e.target.value })}
              placeholder="Context (Stakes, SLA bottleneck, team dynamics)..."
              className="h-20 p-2.5 rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
            />
            <textarea
              required
              value={editingStory.action}
              onChange={(e) => setEditingStory({ ...editingStory, action: e.target.value })}
              placeholder="Action (What YOU personally led and engineered)..."
              className="h-20 p-2.5 rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
            />
            <textarea
              required
              value={editingStory.result}
              onChange={(e) => setEditingStory({ ...editingStory, result: e.target.value })}
              placeholder="Result (Quantified %, TB/day, $ saved, latency)..."
              className="h-20 p-2.5 rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
            />
            <textarea
              required
              value={editingStory.reflection}
              onChange={(e) => setEditingStory({ ...editingStory, reflection: e.target.value })}
              placeholder="Reflection (What you learned & what you'd do differently)..."
              className="h-20 p-2.5 rounded-lg border border-accent/40 bg-card text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingStory(null)}
              className="px-3 py-1.5 rounded-lg border border-subtle text-primary hover:border-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-tactile px-4 py-1.5 rounded-lg bg-[#10B981] text-[#09090B] font-bold flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save Story
            </button>
          </div>
        </form>
      )}

      {/* CARL Story Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stories.map((story) => (
          <div
            key={story.id}
            className="rounded-xl border border-subtle bg-card p-4 space-y-2.5 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {story.projectTag && (
                  <span className="inline-block px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold text-[10px] mb-1">
                    {story.projectTag}
                  </span>
                )}
                <h3 className="text-sm font-bold text-primary">{story.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEditingStory(story)}
                  className="p-1.5 rounded border border-subtle text-muted hover:border-accent hover:text-accent"
                  title="Edit story"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteStory(story.id)}
                  className="p-1.5 rounded border border-subtle text-muted hover:border-[#EF4444] hover:text-[#EF4444]"
                  title="Delete story"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-primary/90 leading-relaxed">
              <div><strong className="text-accent">Context:</strong> {story.context}</div>
              <div><strong className="text-accent">Action:</strong> {story.action}</div>
              <div><strong className="text-[#10B981]">Result:</strong> {story.result}</div>
              <div className="p-2 rounded-lg bg-canvas border border-accent/30">
                <strong className="text-amber-500">Reflection:</strong> {story.reflection}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
