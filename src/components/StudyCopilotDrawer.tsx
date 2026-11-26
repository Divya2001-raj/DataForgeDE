import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AiProviderSettings, StudyNote } from '../types/platform';
import { AnimeCharacterAvatar } from './visuals/AnimeCharacterAvatar';
import { Bookmark, Check, Copy, Cpu, Download, Pin, Printer, Send, Settings, Trash2, X } from 'lucide-react';

export interface CopilotContextSnapshot {
  view: string;
  trackName?: string;
  questionTitle?: string;
  questionPrompt?: string;
  concept?: string;
  tableSchemas?: string;
  codeBuffer?: string;
  diagramSummary?: string;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
}

interface StudyCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: CopilotContextSnapshot;
  queuedPrompt: string | null;
  onConsumeQueuedPrompt: () => void;
  savedNotes: StudyNote[];
  onPinNote: (note: StudyNote) => void;
  onDeleteNote: (noteId: string) => void;
  providerSettings: AiProviderSettings;
  onSaveProviderSettings: (settings: AiProviderSettings) => void;
}

const PROMPT_CHIPS = [
  {
    label: '🤔 What is this? (Simple + Deep Dive)',
    prompt: 'What is this topic/problem? Give me a clear intuitive explanation first, then a Staff Data Engineer deep dive.',
    mode: 'explain',
  },
  {
    label: '📐 Show Architecture / Table Diagram',
    prompt: 'Draw a crisp ASCII architecture / table flow diagram showing how data moves for this problem.',
    mode: 'diagram',
  },
  {
    label: '🐛 Debug My Current Code',
    prompt: 'Inspect my current code/SQL buffer, identify bugs, edge cases, or performance bottlenecks, and show the fixed snippet.',
    mode: 'debug',
  },
  {
    label: '⚡ Optimal Solution & Complexity',
    prompt: 'Provide the optimal solution and break down its time, memory, shuffle, and warehouse cost complexity.',
    mode: 'optimal',
  },
  {
    label: '🎯 3-Question Rapid Quiz',
    prompt: 'Give me a 3-question rapid-fire interview quiz on this exact topic (with concise answers hidden under each question).',
    mode: 'quiz',
  },
];

export const StudyCopilotDrawer: React.FC<StudyCopilotDrawerProps> = ({
  isOpen,
  onClose,
  context,
  queuedPrompt,
  onConsumeQueuedPrompt,
  savedNotes,
  onPinNote,
  onDeleteNote,
  providerSettings,
  onSaveProviderSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [showCheatSheetModal, setShowCheatSheetModal] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I am your **Study AI Copilot** powered by `gemini-4-hydrogen` (`gemini-3.8-flash` for rapid code debugging). I automatically read your active problem, schemas, and code buffer—click any chip below or ask me anything.',
      modelUsed: 'gemini-4-hydrogen',
    },
  ]);

  const [draftProvider, setDraftProvider] = useState<AiProviderSettings>(providerSettings);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftProvider(providerSettings);
  }, [providerSettings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const cheatSheetMarkdown = useMemo(() => {
    const header = `# DataForge DE — Pre-Interview Cheat Sheet\nGenerated: ${new Date().toLocaleDateString()}\nTotal Pinned Notes: ${savedNotes.length}\n\n---\n\n`;
    if (savedNotes.length === 0) {
      return `${header}No study notes pinned yet. Pin replies from Study AI Copilot or Daily Engineering Pulse to populate your cheat sheet.`;
    }
    return (
      header +
      savedNotes
        .map(
          (n, idx) =>
            `## ${idx + 1}. ${n.title}\n**Topic:** ${n.concept} · *Saved ${new Date(n.createdAt).toLocaleDateString()}*\n\n${n.content}\n\n---\n`
        )
        .join('\n')
    );
  }, [savedNotes]);

  const handleDownloadCheatSheet = () => {
    const blob = new Blob([cheatSheetMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataforge-de-cheat-sheet-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendPrompt = async (promptText: string, mode = 'general') => {
    const clean = promptText.trim();
    if (!clean || loading) return;

    setActiveTab('chat');
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          context,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          providerConfig:
            providerSettings.provider !== 'gemini'
              ? {
                  provider: providerSettings.provider,
                  apiKey: providerSettings.customApiKey,
                  model: providerSettings.customModel,
                }
              : { provider: 'gemini' },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get AI response');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${err instanceof Error ? err.message : 'Unable to reach AI backend.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && queuedPrompt) {
      const p = queuedPrompt;
      onConsumeQueuedPrompt();
      sendPrompt(p, 'explain');
    }
  }, [isOpen, queuedPrompt]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 330, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-full bg-canvas border-l border-subtle flex flex-col shadow-2xl"
          >
            {/* Header with Animated Anime Mentor Avatar */}
            <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-xl border border-accent/60 p-0.5 bg-[#09090B] shrink-0">
                  <AnimeCharacterAvatar variant="copilot" isSpeaking={loading} size="sm" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-primary">
                    ✨ Study AI Copilot
                  </h2>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    Context: {context.questionTitle || context.concept || context.view}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  title="AI Provider Settings"
                  className="btn-tactile px-2.5 py-1.5 rounded-lg border border-subtle hover:border-accent text-xs flex items-center gap-1 text-muted hover:text-primary"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Provider</span>
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close Study AI Copilot"
                  className="btn-tactile p-1.5 rounded-lg border border-subtle hover:border-accent text-muted hover:text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="p-4 border-b border-subtle bg-card space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-primary">
                    <Cpu className="w-3.5 h-3.5 text-accent" />
                    AI Provider Settings
                  </span>
                  <span className="text-[11px] text-[#10B981]">✅ Built-in Gemini active by default</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(['gemini', 'openai', 'anthropic', 'openrouter'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setDraftProvider({ ...draftProvider, provider: p })}
                      className={`py-1.5 px-2.5 rounded-lg border font-medium capitalize ${
                        draftProvider.provider === p
                          ? 'bg-accent text-accent-contrast border-accent'
                          : 'border-subtle bg-canvas text-primary hover:border-accent'
                      }`}
                    >
                      {p === 'gemini' ? 'Gemini (Default)' : p}
                    </button>
                  ))}
                </div>

                {draftProvider.provider !== 'gemini' && (
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={draftProvider.customApiKey}
                      onChange={(e) => setDraftProvider({ ...draftProvider, customApiKey: e.target.value })}
                      placeholder={`Optional ${draftProvider.provider} API key (session only)`}
                      className="w-full px-3 py-1.5 rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={draftProvider.customModel}
                      onChange={(e) => setDraftProvider({ ...draftProvider, customModel: e.target.value })}
                      placeholder="Optional model override (e.g. gpt-4o-mini)"
                      className="w-full px-3 py-1.5 rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1 rounded border border-subtle text-primary hover:border-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onSaveProviderSettings(draftProvider);
                      setShowSettings(false);
                    }}
                    className="px-3 py-1 rounded bg-accent text-accent-contrast hover:bg-accent-hover font-semibold"
                  >
                    Save Backend
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="px-5 pt-2 border-b border-subtle flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    activeTab === 'chat'
                      ? 'border-accent text-primary'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  💬 Live Copilot
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'notes'
                      ? 'border-accent text-primary'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-accent" />
                  📌 Saved Study Notes ({savedNotes.length})
                </button>
              </div>
              {activeTab === 'notes' && (
                <button
                  onClick={() => setShowCheatSheetModal(true)}
                  className="mb-1.5 btn-tactile px-2.5 py-1 rounded-md bg-accent/15 text-accent hover:bg-accent hover:text-accent-contrast text-[11px] font-bold flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  🖨️ Export Pre-Interview Cheat Sheet
                </button>
              )}
            </div>

            {activeTab === 'chat' ? (
              <>
                <div className="px-4 py-2.5 border-b border-subtle flex flex-wrap gap-1.5 bg-card">
                  {PROMPT_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      disabled={loading}
                      onClick={() => sendPrompt(chip.prompt, chip.mode)}
                      className="btn-tactile px-2.5 py-1 rounded-full text-[11px] font-medium border border-accent/35 bg-accent/10 text-primary hover:bg-accent hover:text-accent-contrast disabled:opacity-50"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-3.5 ${
                        msg.role === 'user'
                          ? 'ml-8 bg-accent/15 border border-accent/30 text-primary'
                          : 'mr-4 bg-card border border-subtle text-primary/90'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-[10px] text-muted">
                        <span className="font-semibold">
                          {msg.role === 'user' ? 'You' : `✨ Study AI (${msg.modelUsed || 'gemini-4-hydrogen'})`}
                        </span>
                        {msg.role === 'assistant' && msg.id !== 'welcome' && (
                          <button
                            onClick={() =>
                              onPinNote({
                                id: `note-${Date.now()}`,
                                title: context.questionTitle || context.concept || 'Study Note',
                                concept: context.concept || context.trackName || 'Data Engineering',
                                content: msg.content,
                                createdAt: new Date().toISOString(),
                              })
                            }
                            className="text-accent hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Pin className="w-3 h-3" />
                            Pin to Notes
                          </button>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="mr-4 rounded-xl p-3.5 bg-card border border-accent/40 text-xs text-accent">
                      ✨ Analyzing active workspace context...
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendPrompt(input, 'general');
                  }}
                  className="p-3.5 border-t border-subtle flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about SCD2, skew, BigQuery slots, or your code..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-subtle bg-card text-primary focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="btn-tactile p-2 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                {savedNotes.length === 0 ? (
                  <div className="py-12 px-4 text-center text-muted">
                    No pinned notes yet. Click <strong>Pin to Notes</strong> on any Study AI reply or Daily Engineering Pulse to save it here.
                  </div>
                ) : (
                  savedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-subtle bg-card p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-primary">{note.title}</div>
                          <div className="text-[11px] text-accent">{note.concept}</div>
                        </div>
                        <button onClick={() => onDeleteNote(note.id)} className="text-muted hover:text-[#EF4444]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-primary/90 leading-relaxed">
                        {note.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>

          {/* Export Pre-Interview Cheat Sheet Modal */}
          {showCheatSheetModal && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowCheatSheetModal(false);
              }}
              className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-xl border border-subtle bg-canvas overflow-hidden shadow-2xl"
              >
                <div className="px-5 py-3.5 border-b border-subtle flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-primary">
                    🖨️ Pre-Interview Cheat Sheet ({savedNotes.length} Notes)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(cheatSheetMarkdown);
                        setCopiedSheet(true);
                        setTimeout(() => setCopiedSheet(false), 1800);
                      }}
                      className="btn-tactile px-3 py-1.5 rounded-lg border border-accent/40 text-accent text-xs font-semibold flex items-center gap-1"
                    >
                      {copiedSheet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSheet ? 'Copied!' : 'Copy Markdown'}
                    </button>
                    <button
                      onClick={handleDownloadCheatSheet}
                      className="btn-tactile px-3 py-1.5 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs font-bold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download .md
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn-tactile px-3 py-1.5 rounded-lg border border-subtle text-primary hover:border-accent text-xs font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                    <button
                      onClick={() => setShowCheatSheetModal(false)}
                      className="p-1.5 rounded-lg border border-subtle text-muted hover:text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <pre className="p-4 bg-[#09090B] text-zinc-200 font-mono text-xs max-h-[65vh] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {cheatSheetMarkdown}
                </pre>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
