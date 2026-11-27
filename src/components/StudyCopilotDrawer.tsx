import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AiProviderSettings, StudyNote } from '../types/platform';
import {
  isValidOpenAiKey,
  loadOpenAiApiKey,
  sanitizeAiErrorMessage,
  saveOpenAiApiKey,
} from '../utils/storage';
import { sendCopilotChat } from '../services/geminiAiService';
import { AnimeCharacterAvatar } from './visuals/AnimeCharacterAvatar';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Pin,
  Printer,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  X,
} from 'lucide-react';

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
  const [retryState, setRetryState] = useState<{ message: string; prompt: string; mode: string } | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I am your **Study AI Copilot** powered by `gemini-2.5-flash` (`gemini-2.5-pro` for deep architecture grading). I automatically read your active problem, schemas, and code buffer—click any chip below or ask me anything.',
      modelUsed: 'gemini-2.5-flash',
    },
  ]);

  const [draftProvider, setDraftProvider] = useState<AiProviderSettings>(providerSettings);
  const [geminiModelDraft, setGeminiModelDraft] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>(
    providerSettings.provider === 'gemini' && providerSettings.customModel === 'gemini-2.5-pro'
      ? 'gemini-2.5-pro'
      : 'gemini-2.5-flash'
  );
  const [geminiKeyDraft, setGeminiKeyDraft] = useState(
    providerSettings.provider === 'gemini' ? providerSettings.customApiKey : ''
  );
  const [openAiModelDraft, setOpenAiModelDraft] = useState<'gpt-4o' | 'gpt-4o-mini' | 'o3-mini'>(
    providerSettings.provider === 'openai' &&
      (providerSettings.customModel === 'gpt-4o-mini' || providerSettings.customModel === 'o3-mini')
      ? providerSettings.customModel
      : 'gpt-4o'
  );
  const [openAiKeyDraft, setOpenAiKeyDraft] = useState<string>(() =>
    providerSettings.provider === 'openai' && providerSettings.customApiKey
      ? providerSettings.customApiKey
      : loadOpenAiApiKey()
  );
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftProvider(providerSettings);
    if (providerSettings.provider === 'openai') {
      if (
        providerSettings.customModel === 'gpt-4o' ||
        providerSettings.customModel === 'gpt-4o-mini' ||
        providerSettings.customModel === 'o3-mini'
      ) {
        setOpenAiModelDraft(providerSettings.customModel);
      }
      if (providerSettings.customApiKey) {
        setOpenAiKeyDraft(providerSettings.customApiKey);
      }
    } else if (providerSettings.provider === 'gemini') {
      setGeminiModelDraft(
        providerSettings.customModel === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'
      );
      setGeminiKeyDraft(providerSettings.customApiKey || '');
    }
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

  const sendPrompt = async (promptText: string, mode = 'general', isRetry = false) => {
    const clean = promptText.trim();
    if (!clean || loading) return;

    setActiveTab('chat');
    setRetryState(null);
    setFallbackNotice(null);

    const hasLastUserSame =
      isRetry &&
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user' &&
      messages[messages.length - 1].content === clean;

    const nextMessages = hasLastUserSame
      ? messages
      : [
          ...messages,
          {
            id: `u-${Date.now()}`,
            role: 'user' as const,
            content: clean,
          },
        ];

    if (!hasLastUserSame) {
      setMessages(nextMessages);
      setInput('');
    }
    setLoading(true);

    const activeOpenAiKey =
      providerSettings.provider === 'openai'
        ? (providerSettings.customApiKey || loadOpenAiApiKey()).trim()
        : '';
    const canUseOpenAi = providerSettings.provider === 'openai' && isValidOpenAiKey(activeOpenAiKey);

    try {
      const data = await sendCopilotChat({
        mode,
        context,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        providerConfig: canUseOpenAi
          ? {
              provider: 'openai',
              apiKey: activeOpenAiKey,
              model: providerSettings.customModel.trim() || 'gpt-4o',
            }
          : {
              provider: 'gemini',
              model: providerSettings.provider === 'gemini' ? providerSettings.customModel || 'gemini-2.5-flash' : 'gemini-2.5-flash',
              apiKey:
                providerSettings.provider === 'gemini' && providerSettings.customApiKey.trim().length >= 12
                  ? providerSettings.customApiKey.trim()
                  : undefined,
            },
      });
      if (data.fallbackFrom) {
        setFallbackNotice(`Primary model busy — answered automatically with ${data.modelUsed}.`);
      } else if (data.retried) {
        setFallbackNotice(`Recovered after transient spike on ${data.modelUsed}.`);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          modelUsed: data.modelUsed || 'gemini-2.5-flash',
        },
      ]);
    } catch (err: unknown) {
      setRetryState({
        message: sanitizeAiErrorMessage(err, 'Unable to reach Gemini Copilot right now.'),
        prompt: clean,
        mode,
      });
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
                <div className="rounded-xl border border-accent/60 p-0.5 bg-elevated shrink-0">
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
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5 text-primary">
                    <Cpu className="w-3.5 h-3.5 text-accent" />
                    ⚙️ Provider Settings
                  </span>
                  <span className="text-[11px] font-semibold text-[#10B981]">
                    {providerSettings.provider === 'openai' && isValidOpenAiKey(providerSettings.customApiKey || loadOpenAiApiKey())
                      ? `✅ OpenAI (${providerSettings.customModel || 'gpt-4o'})`
                      : `✅ Gemini (${providerSettings.customModel || 'gemini-2.5-flash'})`}
                  </span>
                </div>

                {/* Two Clear Provider Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-subtle bg-canvas">
                  <button
                    type="button"
                    onClick={() => {
                      setProviderNotice(null);
                      setDraftProvider({
                        provider: 'gemini',
                        customApiKey: geminiKeyDraft,
                        customModel: geminiModelDraft,
                      });
                    }}
                    className={`py-2 px-2.5 rounded-md font-semibold text-left transition-colors ${
                      draftProvider.provider === 'gemini'
                        ? 'bg-accent text-accent-contrast'
                        : 'text-primary hover:bg-card'
                    }`}
                  >
                    <div>Google Gemini</div>
                    <div className={`text-[10px] ${draftProvider.provider === 'gemini' ? 'opacity-85' : 'text-muted'}`}>
                      Default · Auto-Connected
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProviderNotice(null);
                      const savedKey = openAiKeyDraft || loadOpenAiApiKey();
                      setOpenAiKeyDraft(savedKey);
                      setDraftProvider({
                        provider: 'openai',
                        customApiKey: savedKey,
                        customModel: openAiModelDraft,
                      });
                    }}
                    className={`py-2 px-2.5 rounded-md font-semibold text-left transition-colors ${
                      draftProvider.provider === 'openai'
                        ? 'bg-accent text-accent-contrast'
                        : 'text-primary hover:bg-card'
                    }`}
                  >
                    <div>OpenAI / ChatGPT</div>
                    <div className={`text-[10px] ${draftProvider.provider === 'openai' ? 'opacity-85' : 'text-muted'}`}>
                      BYOK · gpt-4o / o3-mini
                    </div>
                  </button>
                </div>

                {draftProvider.provider === 'gemini' ? (
                  <div className="space-y-2.5">
                    <div className="rounded-lg border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-2 text-[11px] text-primary">
                      ✅ <strong>Zero-Config Active:</strong> Uses the built-in <code className="font-mono">GEMINI_API_KEY</code> environment variable automatically.
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-muted">Gemini Model</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['gemini-2.5-flash', 'gemini-2.5-pro'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setGeminiModelDraft(m)}
                            className={`px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-semibold transition-colors ${
                              geminiModelDraft === m
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-subtle bg-canvas text-primary hover:border-accent'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={geminiKeyDraft}
                      onChange={(e) => setGeminiKeyDraft(e.target.value)}
                      placeholder="Optional custom Gemini key (leave blank for built-in key)"
                      className="w-full px-3 py-1.5 rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-muted">OpenAI Model</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['gpt-4o', 'gpt-4o-mini', 'o3-mini'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setOpenAiModelDraft(m)}
                            className={`px-2 py-1.5 rounded-lg border font-mono text-[11px] font-semibold transition-colors ${
                              openAiModelDraft === m
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-subtle bg-canvas text-primary hover:border-accent'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-muted">OpenAI API Key (saved in localStorage)</span>
                        {openAiKeyDraft.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenAiKeyDraft('');
                              saveOpenAiApiKey('');
                              const backToGemini: AiProviderSettings = {
                                provider: 'gemini',
                                customApiKey: geminiKeyDraft,
                                customModel: geminiModelDraft,
                              };
                              onSaveProviderSettings(backToGemini);
                              setProviderNotice('OpenAI key cleared — Google Gemini remains active.');
                            }}
                            className="text-[#EF4444] hover:underline font-semibold"
                          >
                            Clear Key
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showOpenAiKey ? 'text' : 'password'}
                          value={openAiKeyDraft}
                          onChange={(e) => {
                            setProviderNotice(null);
                            setOpenAiKeyDraft(e.target.value);
                          }}
                          placeholder="sk-..."
                          autoComplete="off"
                          className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-subtle bg-canvas text-primary font-mono focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAiKey((v) => !v)}
                          aria-label={showOpenAiKey ? 'Hide OpenAI key' : 'Show OpenAI key'}
                          className="absolute right-2.5 text-muted hover:text-primary"
                        >
                          {showOpenAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {!isValidOpenAiKey(openAiKeyDraft) ? (
                      <div className="rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-[11px] text-primary leading-relaxed">
                        Paste your OpenAI API key from{' '}
                        <span className="font-mono font-semibold text-accent">platform.openai.com</span>{' '}
                        to enable GPT-4o. (Google Gemini stays active until you save an <code className="font-mono">sk-...</code> key.)
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-2 text-[11px] text-primary">
                        🔑 Ready: Direct browser-side calls to OpenAI (<code className="font-mono">{openAiModelDraft}</code>) will use your saved key.
                      </div>
                    )}
                  </div>
                )}

                {providerNotice && (
                  <p className="text-[11px] text-accent font-medium">{providerNotice}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftProvider(providerSettings);
                      setProviderNotice(null);
                      setShowSettings(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-subtle text-primary hover:border-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (draftProvider.provider === 'openai') {
                        const cleanKey = openAiKeyDraft.trim();
                        if (!isValidOpenAiKey(cleanKey)) {
                          const fallbackGemini: AiProviderSettings = {
                            provider: 'gemini',
                            customApiKey: geminiKeyDraft.trim(),
                            customModel: geminiModelDraft,
                          };
                          onSaveProviderSettings(fallbackGemini);
                          setProviderNotice(
                            'Paste your OpenAI API key from platform.openai.com to enable GPT-4o. Google Gemini remains active.'
                          );
                          return;
                        }
                        saveOpenAiApiKey(cleanKey);
                        onSaveProviderSettings({
                          provider: 'openai',
                          customApiKey: cleanKey,
                          customModel: openAiModelDraft,
                        });
                        setProviderNotice(null);
                        setShowSettings(false);
                        return;
                      }

                      onSaveProviderSettings({
                        provider: 'gemini',
                        customApiKey: geminiKeyDraft.trim(),
                        customModel: geminiModelDraft,
                      });
                      setProviderNotice(null);
                      setShowSettings(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover font-semibold"
                  >
                    {draftProvider.provider === 'openai' ? 'Save OpenAI Key & Activate' : 'Use Google Gemini'}
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
                          {msg.role === 'user' ? 'You' : `✨ Study AI (${msg.modelUsed || 'gemini-2.5-flash'})`}
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

                {fallbackNotice && !retryState && (
                  <div className="mx-3.5 mb-2 px-3 py-1.5 rounded-lg border border-accent/35 bg-accent/10 text-[11px] text-primary flex items-center justify-between gap-2">
                    <span>⚡ {fallbackNotice}</span>
                    <button
                      type="button"
                      onClick={() => setFallbackNotice(null)}
                      className="text-muted hover:text-primary"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {retryState && (
                  <div className="mx-3.5 mb-2 px-3 py-2 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 text-xs flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-red-700 dark:text-[#EF4444] min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{retryState.message}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => sendPrompt(retryState.prompt, retryState.mode, true)}
                        className="btn-tactile px-2.5 py-1 rounded-md bg-accent text-accent-contrast text-[11px] font-bold hover:bg-accent-hover flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => setRetryState(null)}
                        className="p-1 text-muted hover:text-primary"
                        aria-label="Dismiss error"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

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
                <pre className="p-4 bg-editor text-primary font-mono text-xs max-h-[65vh] overflow-y-auto whitespace-pre-wrap leading-relaxed">
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
