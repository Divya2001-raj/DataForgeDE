import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TRACKS } from './data/tracks';
import { ALL_QUESTIONS, QUESTIONS_BY_TRACK } from './data/questions';
import { DATASETS } from './data/datasets';
import { buildWeakSpotCustomMock } from './data/googleMocks';
import {
  AiProviderSettings,
  ArchEdge,
  ArchNode,
  DsaPattern,
  FontPreset,
  MockAttemptRecord,
  MockInterviewRound,
  Question,
  SchemaRelation,
  SchemaTable,
  Sm2ReviewItem,
  StudyNote,
  ThemeId,
  TrackId,
  UserProgressState,
} from './types/platform';
import {
  addDiscussionComment,
  addGeneratedDsaQuestion,
  addStudyNote,
  clearBlindSpots,
  deleteCarlStory,
  deleteStudyNote,
  FONT_PRESETS,
  loadFontPreset,
  loadProgress,
  loadProviderSettings,
  loadTheme,
  markQuestBriefingRead,
  recordMockAttempt,
  recordQuestionSubmission,
  saveCarlStory,
  saveFontPreset,
  saveProviderSettings,
  saveTheme,
  THEME_OPTIONS,
  updateTargetInterviewDate,
} from './utils/storage';
import { findQuestContextByQuestionId, QuestLevelContext } from './data/questBriefings';
import { DashboardView } from './components/DashboardView';
import { QuestRoadmapView } from './components/QuestRoadmapView';
import { QuestStudyBriefingView } from './components/QuestStudyBriefingView';
import { QuestionBankView } from './components/QuestionBankView';
import { ConceptDrawer } from './components/ConceptDrawer';
import { PatternMasterclassDrawer } from './components/PatternMasterclassDrawer';
import { StudyCopilotDrawer, CopilotContextSnapshot } from './components/StudyCopilotDrawer';
import { AssessmentHubView } from './components/AssessmentHubView';
import { ThemeSwitcherPopover } from './components/ThemeSwitcherPopover';
import { IdeWorkspace } from './components/workspaces/IdeWorkspace';
import { ArchitectureWorkspace } from './components/workspaces/ArchitectureWorkspace';
import { ModelingWorkspace } from './components/workspaces/ModelingWorkspace';
import { ConceptualWorkspace } from './components/workspaces/ConceptualWorkspace';
import { AnimeCharacterAvatar } from './components/visuals/AnimeCharacterAvatar';
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Sparkles, Type } from 'lucide-react';

type AppTab = 'dashboard' | 'quests' | 'bank' | 'workspace' | 'assessments';

export default function App() {
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [fontPreset, setFontPreset] = useState<FontPreset>(() => loadFontPreset());
  const [showFontMenu, setShowFontMenu] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>('bank');
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>('sql');
  const [activeQuestion, setActiveQuestion] = useState<Question>(QUESTIONS_BY_TRACK.sql[0]);
  const [activeMockNumber, setActiveMockNumber] = useState<number | null>(null);
  const [customMockOverride, setCustomMockOverride] = useState<MockInterviewRound | null>(null);
  const [launchPlainTextDocMode, setLaunchPlainTextDocMode] = useState(false);
  const [activeQuestContext, setActiveQuestContext] = useState<QuestLevelContext | null>(null);
  const [workspaceSubView, setWorkspaceSubView] = useState<'challenge' | 'briefing'>('challenge');
  const [behavioralStoryBankTrigger, setBehavioralStoryBankTrigger] = useState(0);

  const [progress, setProgress] = useState<UserProgressState>(() => loadProgress());
  const [providerSettings, setProviderSettings] = useState<AiProviderSettings>(() =>
    loadProviderSettings()
  );

  const [codeBuffer, setCodeBuffer] = useState<string>(QUESTIONS_BY_TRACK.sql[0].starterCode || '');
  const [conceptualBuffer, setConceptualBuffer] = useState<string>('');
  const [archNodes, setArchNodes] = useState<ArchNode[]>([]);
  const [archEdges, setArchEdges] = useState<ArchEdge[]>([]);
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [schemaRelations, setSchemaRelations] = useState<SchemaRelation[]>([]);

  const [activeConceptDrawer, setActiveConceptDrawer] = useState<string | null>(null);
  const [activePatternDrawer, setActivePatternDrawer] = useState<DsaPattern | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [queuedCopilotPrompt, setQueuedCopilotPrompt] = useState<string | null>(null);

  const effectiveTheme = previewTheme || theme;

  useEffect(() => {
    const root = document.documentElement;
    const meta = THEME_OPTIONS.find((t) => t.id === effectiveTheme) || THEME_OPTIONS[0];
    if (meta.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const activeFontMeta = useMemo(
    () => FONT_PRESETS.find((f) => f.id === fontPreset) || FONT_PRESETS[0],
    [fontPreset]
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-font-preset', fontPreset);
    saveFontPreset(fontPreset);
  }, [fontPreset]);

  const openQuestionInWorkspace = (
    q: Question,
    options?: { plainTextDocMode?: boolean; questContext?: QuestLevelContext }
  ) => {
    setLaunchPlainTextDocMode(Boolean(options?.plainTextDocMode));
    setActiveQuestContext(options?.questContext || null);
    setWorkspaceSubView('challenge');
    setActiveQuestion(q);
    setSelectedTrackId(q.trackId);
    setCodeBuffer(q.starterCode || '');
    setConceptualBuffer('');
    setArchNodes([]);
    setArchEdges([]);
    setSchemaTables(q.modelingSpec?.starterTables || []);
    setSchemaRelations([]);
    setActiveTab('workspace');
  };

  const handleMarkBriefingRead = (levelId: string, read = true) => {
    setProgress((prev) => markQuestBriefingRead(prev, levelId, read));
  };

  const handleSelectTrack = (trackId: TrackId) => {
    setSelectedTrackId(trackId);
    setActiveTab('bank');
  };

  const handleRecordSubmission = (
    question: Question,
    passed: boolean,
    meta?: { runtimeMs?: number; language?: string; codeSnapshot?: string; failedHints?: string[] }
  ) => {
    setProgress((prev) =>
      recordQuestionSubmission(prev, question.id, passed, {
        title: question.title,
        trackId: question.trackId,
        concept: question.concept,
        tags: question.tags,
        dsaPattern: question.dsaPattern,
        failedHints: meta?.failedHints,
        runtimeMs: meta?.runtimeMs,
        language: meta?.language,
        codeSnapshot: meta?.codeSnapshot,
      })
    );
  };

  const handleRecordMock = (record: MockAttemptRecord) => {
    setProgress((prev) => recordMockAttempt(prev, record));
  };

  const handlePinNote = (note: StudyNote) => {
    setProgress((prev) => addStudyNote(prev, note));
  };

  const handleDeleteNote = (noteId: string) => {
    setProgress((prev) => deleteStudyNote(prev, noteId));
  };

  const handleAddDiscussion = (questionId: string, text: string) => {
    setProgress((prev) => addDiscussionComment(prev, questionId, text));
  };

  const handleStartSm2Review = (item: Sm2ReviewItem) => {
    if (item.itemType === 'mock') {
      const match = item.itemId.match(/google-mock-(\d+)/);
      const mockNum = match ? Number(match[1]) : 1;
      setCustomMockOverride(null);
      setActiveMockNumber(mockNum);
      setActiveTab('assessments');
      return;
    }
    const q = ALL_QUESTIONS.find((x) => x.id === item.itemId);
    if (q) {
      openQuestionInWorkspace(q);
    }
  };

  const handleLaunchWeakSpotMock = (weakTrackIds: TrackId[]) => {
    const customMock = buildWeakSpotCustomMock(weakTrackIds);
    setCustomMockOverride(customMock);
    setActiveMockNumber(null);
    setActiveTab('assessments');
  };

  const triggerCopilotPrompt = (prompt: string, conceptOverride?: string) => {
    if (conceptOverride) {
      setActiveConceptDrawer(null);
    }
    setQueuedCopilotPrompt(prompt);
    setCopilotOpen(true);
  };

  const allDsaQuestions = useMemo(
    () => [...(progress.generatedDsaQuestions || []), ...(QUESTIONS_BY_TRACK.dsa || [])],
    [progress.generatedDsaQuestions]
  );

  const trackQuestions =
    activeQuestion.trackId === 'dsa'
      ? allDsaQuestions
      : QUESTIONS_BY_TRACK[activeQuestion.trackId] || ALL_QUESTIONS;
  const activeIndex = trackQuestions.findIndex((q) => q.id === activeQuestion.id);

  const goNeighborQuestion = (delta: number) => {
    const nextIdx = activeIndex + delta;
    if (nextIdx >= 0 && nextIdx < trackQuestions.length) {
      openQuestionInWorkspace(trackQuestions[nextIdx]);
    }
  };

  const copilotContext: CopilotContextSnapshot = useMemo(() => {
    const trackMeta = TRACKS.find((t) => t.id === selectedTrackId);
    const dataset = activeQuestion.datasetId ? DATASETS[activeQuestion.datasetId] : undefined;
    const isWorkspace = activeTab === 'workspace';

    return {
      view:
        activeTab === 'dashboard'
          ? 'Progress & Readiness Dashboard'
          : activeTab === 'quests'
          ? 'Google Cloud DE Quest Roadmap'
          : activeTab === 'bank'
          ? `${TRACKS.length}-Track Question Bank`
          : activeTab === 'assessments'
          ? activeMockNumber || customMockOverride
            ? `Live Google Mock ${customMockOverride ? 'Custom Weak-Spot' : `#${activeMockNumber}`}`
            : 'Assessment Hub'
          : `${activeQuestion.workspaceType.toUpperCase()} Practice Workspace`,
      trackName: trackMeta?.name,
      questionTitle: isWorkspace ? activeQuestion.title : undefined,
      questionPrompt: isWorkspace ? activeQuestion.prompt : undefined,
      concept: activeConceptDrawer || (isWorkspace ? activeQuestion.concept : undefined),
      tableSchemas: dataset ? dataset.ddl : undefined,
      codeBuffer:
        isWorkspace && activeQuestion.workspaceType === 'ide'
          ? codeBuffer
          : isWorkspace && activeQuestion.workspaceType === 'conceptual'
          ? conceptualBuffer
          : undefined,
      diagramSummary:
        isWorkspace && activeQuestion.workspaceType === 'architecture'
          ? `Nodes: ${archNodes.map((n) => n.label).join(', ') || 'None'} | Flows: ${archEdges.length}`
          : isWorkspace && activeQuestion.workspaceType === 'modeling'
          ? `Tables: ${schemaTables.map((t) => `${t.tableType} ${t.name}`).join(', ')}`
          : undefined,
    };
  }, [
    activeTab,
    selectedTrackId,
    activeQuestion,
    activeMockNumber,
    customMockOverride,
    activeConceptDrawer,
    codeBuffer,
    conceptualBuffer,
    archNodes,
    archEdges,
    schemaTables,
  ]);

  const solvedSet = useMemo(() => new Set(progress.solvedQuestionIds), [progress.solvedQuestionIds]);

  return (
    <div className="min-h-screen bg-canvas text-primary flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-subtle bg-canvas/95 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          <button
            onClick={() => setActiveTab('bank')}
            className="text-base sm:text-lg font-display font-extrabold tracking-tight text-primary whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="text-accent">⚡</span>
            <span>DataForge DE</span>
          </button>

          <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto">
            {(
              [
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'quests', label: '🗺️ Quest Roadmap' },
                { id: 'bank', label: '📚 Question Bank' },
                { id: 'workspace', label: '⚡ Workspace' },
                { id: 'assessments', label: '🎯 Assessments' },
              ] as const
            ).map((nav) => {
              const active = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-accent text-primary font-semibold'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  {nav.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0 relative">
            {(showFontMenu || showThemeMenu) && (
              <div
                aria-hidden="true"
                onClick={() => {
                  setShowFontMenu(false);
                  setShowThemeMenu(false);
                  setPreviewTheme(null);
                }}
                className="fixed inset-0 z-40"
              />
            )}

            {/* Aa 13-Preset Typography Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowThemeMenu(false);
                  setPreviewTheme(null);
                  setShowFontMenu((v) => !v);
                }}
                aria-label="Switch Typography Preset"
                aria-expanded={showFontMenu}
                title={`Typography: ${activeFontMeta.label}`}
                className="btn-tactile px-2.5 py-2 rounded-lg border border-subtle bg-card hover:border-accent text-xs font-bold flex items-center gap-1.5 text-primary whitespace-nowrap"
              >
                <Type className="w-3.5 h-3.5 text-accent" />
                <span>Aa</span>
                <ChevronDown className="w-3 h-3 text-muted" />
              </button>
              {showFontMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[72vh] flex flex-col rounded-xl border border-subtle bg-canvas shadow-2xl z-50 overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-subtle bg-card/80 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Typography Presets ({FONT_PRESETS.length})
                    </span>
                    <span className="text-[11px] font-semibold text-accent truncate">
                      {activeFontMeta.label}
                    </span>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-1.5">
                    {FONT_PRESETS.map((fp) => {
                      const selected = fontPreset === fp.id;
                      return (
                        <button
                          key={fp.id}
                          onClick={() => {
                            setFontPreset(fp.id);
                            setShowFontMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                            selected
                              ? 'bg-accent/15 border-accent/50 text-primary'
                              : 'border-transparent hover:bg-card hover:border-subtle text-primary'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-card border border-subtle text-muted tabular-nums shrink-0">
                                {String(fp.order).padStart(2, '0')}
                              </span>
                              <span
                                className="text-sm font-bold truncate"
                                style={{ fontFamily: fp.headingFont }}
                              >
                                {fp.label}
                              </span>
                            </div>
                            {selected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                          </div>
                          <div
                            className="mt-0.5 text-[10px] text-muted truncate"
                            style={{ fontFamily: fp.bodyFont }}
                          >
                            {fp.desc}
                          </div>
                          <div className="mt-2 rounded-md border border-subtle bg-card/80 px-2.5 py-1.5 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="text-[11px] font-semibold text-primary truncate"
                                style={{ fontFamily: fp.headingFont }}
                              >
                                {fp.sampleHeadline}
                              </span>
                              <span
                                className="text-[10px] text-muted shrink-0"
                                style={{ fontFamily: fp.bodyFont }}
                              >
                                UI Prose
                              </span>
                            </div>
                            <div
                              className="text-[10px] text-accent truncate"
                              style={{ fontFamily: fp.monoFont }}
                            >
                              {fp.sampleCode}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 🎨 34-Theme Filterable Swatch Grid Popover */}
            <ThemeSwitcherPopover
              isOpen={showThemeMenu}
              onToggle={() => {
                setShowFontMenu(false);
                setShowThemeMenu((v) => !v);
              }}
              onClose={() => {
                setShowThemeMenu(false);
                setPreviewTheme(null);
              }}
              activeTheme={theme}
              previewTheme={previewTheme}
              onPreviewTheme={setPreviewTheme}
              onSelectTheme={(id) => {
                setTheme(id);
                setPreviewTheme(null);
              }}
            />

            <button
              onClick={() => setCopilotOpen(true)}
              className="btn-tactile px-3.5 py-2 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">✨ Study AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                progress={progress}
                onSelectTrack={handleSelectTrack}
                onOpenQuests={() => setActiveTab('quests')}
                onOpenAssessments={() => {
                  setCustomMockOverride(null);
                  setActiveMockNumber(null);
                  setActiveTab('assessments');
                }}
                onLaunchMock={(num) => {
                  setCustomMockOverride(null);
                  setActiveMockNumber(num);
                  setActiveTab('assessments');
                }}
                onOpenConcept={(c) => setActiveConceptDrawer(c)}
                onPinNote={handlePinNote}
                onStartSm2Review={handleStartSm2Review}
                onLaunchWeakSpotMock={handleLaunchWeakSpotMock}
                onUpdateTargetDate={(iso) =>
                  setProgress((prev) => updateTargetInterviewDate(prev, iso))
                }
                onClearBlindSpots={() =>
                  setProgress((prev) => clearBlindSpots(prev))
                }
              />
            )}

            {activeTab === 'quests' && (
              <QuestRoadmapView
                progress={progress}
                onMarkBriefingRead={handleMarkBriefingRead}
                onOpenQuestion={openQuestionInWorkspace}
                onLaunchMock={(num, questCtx) => {
                  setActiveQuestContext(questCtx || null);
                  setCustomMockOverride(null);
                  setActiveMockNumber(num);
                  setActiveTab('assessments');
                }}
                onOpenCarlBank={(questCtx) => {
                  setActiveQuestContext(questCtx || null);
                  setSelectedTrackId('behavioral');
                  setBehavioralStoryBankTrigger((n) => n + 1);
                  setActiveTab('bank');
                }}
              />
            )}

            {activeTab === 'bank' && (
              <QuestionBankView
                selectedTrackId={selectedTrackId}
                onSelectTrack={setSelectedTrackId}
                onOpenQuestion={openQuestionInWorkspace}
                onOpenConcept={(c) => setActiveConceptDrawer(c)}
                onOpenPattern={(pat) => setActivePatternDrawer(pat)}
                progress={progress}
                onSaveCarlStory={(story) => setProgress((prev) => saveCarlStory(prev, story))}
                onDeleteCarlStory={(storyId) => setProgress((prev) => deleteCarlStory(prev, storyId))}
                onAddGeneratedDsaQuestion={(q) =>
                  setProgress((prev) => addGeneratedDsaQuestion(prev, q))
                }
                behavioralStoryBankTrigger={behavioralStoryBankTrigger}
                onMarkBriefingRead={handleMarkBriefingRead}
              />
            )}

            {activeTab === 'workspace' && (() => {
              const resolvedQuestContext =
                activeQuestContext && activeQuestContext.level.questionId === activeQuestion.id
                  ? activeQuestContext
                  : findQuestContextByQuestionId(activeQuestion.id);
              const isBriefingRead = resolvedQuestContext
                ? (progress.readQuestBriefingIds || []).includes(resolvedQuestContext.level.id)
                : false;

              return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {activeQuestContext && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('quests')}
                        className="btn-tactile px-2.5 py-1 rounded-lg border border-subtle bg-card text-xs font-semibold text-primary hover:border-accent flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-accent" />
                        Quest Roadmap
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('bank')}
                      className="btn-tactile text-xs font-semibold text-muted hover:text-accent flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to {TRACKS.find((t) => t.id === activeQuestion.trackId)?.shortName}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {resolvedQuestContext && (
                      <div
                        role="tablist"
                        aria-label="Workspace View Mode"
                        className="flex items-center p-0.5 rounded-lg border border-subtle bg-card text-xs font-semibold"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={workspaceSubView === 'challenge'}
                          onClick={() => setWorkspaceSubView('challenge')}
                          className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            workspaceSubView === 'challenge'
                              ? 'bg-accent text-accent-contrast shadow-xs'
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          ⚡ Challenge Workspace
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={workspaceSubView === 'briefing'}
                          onClick={() => setWorkspaceSubView('briefing')}
                          className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                            workspaceSubView === 'briefing'
                              ? 'bg-accent text-accent-contrast shadow-xs'
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>📖 Study Briefing</span>
                          {isBriefingRead && workspaceSubView !== 'briefing' && (
                            <Check className="w-3 h-3 text-[#10B981]" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        disabled={activeIndex <= 0}
                        onClick={() => goNeighborQuestion(-1)}
                        className="btn-tactile px-2.5 py-1 rounded-lg border border-subtle disabled:opacity-40 hover:border-accent flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                      </button>
                      <span className="font-mono text-muted tabular-nums">
                        {activeIndex + 1} / {trackQuestions.length}
                      </span>
                      <button
                        disabled={activeIndex >= trackQuestions.length - 1}
                        onClick={() => goNeighborQuestion(1)}
                        className="btn-tactile px-2.5 py-1 rounded-lg border border-subtle disabled:opacity-40 hover:border-accent flex items-center gap-1"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {resolvedQuestContext && workspaceSubView === 'briefing' && (
                  <QuestStudyBriefingView
                    quest={resolvedQuestContext.quest}
                    level={resolvedQuestContext.level}
                    mode="workspace-tab"
                    isRead={isBriefingRead}
                    onToggleRead={(read) => handleMarkBriefingRead(resolvedQuestContext.level.id, read)}
                    onReturnToChallenge={() => setWorkspaceSubView('challenge')}
                  />
                )}

                <div className={resolvedQuestContext && workspaceSubView === 'briefing' ? 'hidden' : ''}>
                {activeQuestion.workspaceType === 'ide' && (
                  <IdeWorkspace
                    question={activeQuestion}
                    code={codeBuffer}
                    onChangeCode={setCodeBuffer}
                    onOpenConcept={(c) => setActiveConceptDrawer(c)}
                    onOpenPattern={(pat) => setActivePatternDrawer(pat)}
                    onAskCopilot={(p) => triggerCopilotPrompt(p)}
                    onRecordSubmission={(passed, meta) => handleRecordSubmission(activeQuestion, passed, meta)}
                    isSolved={solvedSet.has(activeQuestion.id)}
                    submissions={progress.submissionHistory?.[activeQuestion.id] || []}
                    discussions={progress.discussionNotes?.[activeQuestion.id] || []}
                    onAddDiscussion={(text) => handleAddDiscussion(activeQuestion.id, text)}
                    initialPlainTextDocMode={launchPlainTextDocMode}
                  />
                )}

                {activeQuestion.workspaceType === 'architecture' && (
                  <ArchitectureWorkspace
                    question={activeQuestion}
                    nodes={archNodes}
                    edges={archEdges}
                    onChangeNodes={setArchNodes}
                    onChangeEdges={setArchEdges}
                    onOpenConcept={(c) => setActiveConceptDrawer(c)}
                    onAskCopilot={(p) => triggerCopilotPrompt(p)}
                    onRecordSubmission={(passed) => handleRecordSubmission(activeQuestion, passed)}
                  />
                )}

                {activeQuestion.workspaceType === 'modeling' && (
                  <ModelingWorkspace
                    question={activeQuestion}
                    tables={schemaTables}
                    relations={schemaRelations}
                    onChangeTables={setSchemaTables}
                    onChangeRelations={setSchemaRelations}
                    onOpenConcept={(c) => setActiveConceptDrawer(c)}
                    onAskCopilot={(p) => triggerCopilotPrompt(p)}
                    onRecordSubmission={(passed) => handleRecordSubmission(activeQuestion, passed)}
                  />
                )}

                {activeQuestion.workspaceType === 'conceptual' && (
                  <ConceptualWorkspace
                    question={activeQuestion}
                    answerDraft={conceptualBuffer}
                    onChangeAnswer={setConceptualBuffer}
                    onOpenConcept={(c) => setActiveConceptDrawer(c)}
                    onAskCopilot={(p) => triggerCopilotPrompt(p)}
                    onRecordSubmission={(passed) => handleRecordSubmission(activeQuestion, passed)}
                    isSolved={solvedSet.has(activeQuestion.id)}
                  />
                )}
                </div>
              </div>
              );
            })()}

            {activeTab === 'assessments' && (
              <AssessmentHubView
                progress={progress}
                activeMockNumber={activeMockNumber}
                customMockOverride={customMockOverride}
                onSelectMockNumber={setActiveMockNumber}
                onClearCustomMock={() => setCustomMockOverride(null)}
                onRecordMock={handleRecordMock}
                onJumpToTrack={handleSelectTrack}
                onMarkBriefingRead={handleMarkBriefingRead}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Bottom-Right Floating Study AI Copilot Button */}
      {!copilotOpen && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setCopilotOpen(true)}
          aria-label="Open Study AI Copilot"
          className="fixed bottom-5 right-5 z-40 pl-1.5 pr-4 py-1.5 rounded-full bg-accent text-accent-contrast font-bold text-xs shadow-[0_8px_24px_var(--accent-glow)] flex items-center gap-2"
        >
          <span className="rounded-full bg-elevated p-0.5 border border-subtle">
            <AnimeCharacterAvatar variant="copilot" size="sm" />
          </span>
          <span>✨ Study AI Copilot</span>
        </motion.button>
      )}

      {/* Concept Deep-Dive Study Drawer */}
      <ConceptDrawer
        conceptName={activeConceptDrawer}
        onClose={() => setActiveConceptDrawer(null)}
        onAskCopilot={(prompt, concept) => triggerCopilotPrompt(prompt, concept)}
      />

      {/* NeetCode Pattern Masterclass Drawer */}
      <PatternMasterclassDrawer
        patternName={activePatternDrawer}
        allDsaQuestions={allDsaQuestions}
        solvedQuestionIds={progress.solvedQuestionIds}
        onClose={() => setActivePatternDrawer(null)}
        onOpenQuestion={openQuestionInWorkspace}
        onAskCopilot={(prompt) => triggerCopilotPrompt(prompt)}
      />

      {/* Slide-Over Study AI Copilot Drawer */}
      <StudyCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        context={copilotContext}
        queuedPrompt={queuedCopilotPrompt}
        onConsumeQueuedPrompt={() => setQueuedCopilotPrompt(null)}
        savedNotes={progress.savedNotes}
        onPinNote={handlePinNote}
        onDeleteNote={handleDeleteNote}
        providerSettings={providerSettings}
        onSaveProviderSettings={(settings) => {
          const safe = saveProviderSettings(settings);
          setProviderSettings(safe);
        }}
      />
    </div>
  );
}
