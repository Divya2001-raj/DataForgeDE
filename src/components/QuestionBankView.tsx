import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TRACKS } from '../data/tracks';
import { ALL_COMPANIES, ALL_CONCEPT_NAMES, ALL_QUESTIONS, QUESTIONS_BY_TRACK } from '../data/questions';
import {
  CANONICAL_DSA_PATTERNS,
  CarlStory,
  Difficulty,
  DsaPattern,
  Question,
  TrackId,
  UserProgressState,
} from '../types/platform';
import { DSA_PATTERN_GUIDES } from '../data/dsaPatterns';
import { sanitizeAiErrorMessage } from '../utils/storage';
import { generateDsaProblem } from '../services/geminiAiService';
import { CarlStoryBank } from './CarlStoryBank';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

interface QuestionBankViewProps {
  selectedTrackId: TrackId;
  onSelectTrack: (trackId: TrackId) => void;
  onOpenQuestion: (question: Question) => void;
  onOpenConcept: (conceptName: string) => void;
  onOpenPattern: (pattern: DsaPattern) => void;
  progress: UserProgressState;
  onSaveCarlStory: (story: CarlStory) => void;
  onDeleteCarlStory: (storyId: string) => void;
  onAddGeneratedDsaQuestion: (question: Question) => void;
  behavioralStoryBankTrigger?: number;
}

const PAGE_SIZE = 25;

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  selectedTrackId,
  onSelectTrack,
  onOpenQuestion,
  onOpenConcept,
  onOpenPattern,
  progress,
  onSaveCarlStory,
  onDeleteCarlStory,
  onAddGeneratedDsaQuestion,
  behavioralStoryBankTrigger = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiffs, setSelectedDiffs] = useState<Difficulty[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string>('ALL');
  const [selectedPattern, setSelectedPattern] = useState<'ALL' | DsaPattern>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [page, setPage] = useState(1);
  const [showCompanyFilters, setShowCompanyFilters] = useState(false);
  const [behavioralSubTab, setBehavioralSubTab] = useState<'questions' | 'storybank'>('questions');

  useEffect(() => {
    if (behavioralStoryBankTrigger > 0) {
      setBehavioralSubTab('storybank');
    }
  }, [behavioralStoryBankTrigger]);

  // On-demand gemini-2.5-flash DSA generator state
  const [genPattern, setGenPattern] = useState<'AUTO' | DsaPattern>('AUTO');
  const [genDifficulty, setGenDifficulty] = useState<Difficulty>('Medium');
  const [generatingDsa, setGeneratingDsa] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const solvedSet = useMemo(() => new Set(progress.solvedQuestionIds), [progress.solvedQuestionIds]);
  const activeTrack = TRACKS.find((t) => t.id === selectedTrackId) || TRACKS[0];

  const trackQuestions = useMemo(() => {
    const base = QUESTIONS_BY_TRACK[selectedTrackId] || [];
    if (selectedTrackId === 'dsa') {
      const generated = progress.generatedDsaQuestions || [];
      return [...generated, ...base];
    }
    return base;
  }, [selectedTrackId, progress.generatedDsaQuestions]);

  const dsaPatternStats = useMemo(() => {
    if (selectedTrackId !== 'dsa') return [];
    return CANONICAL_DSA_PATTERNS.map((pattern) => {
      const matching = trackQuestions.filter((q) => q.dsaPattern === pattern);
      const solved = matching.filter((q) => solvedSet.has(q.id)).length;
      return {
        pattern,
        shortLabel: DSA_PATTERN_GUIDES[pattern]?.shortLabel || pattern,
        total: matching.length,
        solved,
      };
    });
  }, [selectedTrackId, trackQuestions, solvedSet]);

  const handleGenerateDsaProblem = async () => {
    if (generatingDsa) return;
    setGeneratingDsa(true);
    setGenError(null);
    try {
      const data = await generateDsaProblem({
        targetPattern: genPattern,
        difficulty: genDifficulty,
      });
      if (data.question) {
        onAddGeneratedDsaQuestion(data.question);
        setSelectedPattern(data.question.dsaPattern || 'ALL');
        setPage(1);
      }
    } catch (err: unknown) {
      setGenError(sanitizeAiErrorMessage(err, 'Unable to generate DSA problem.'));
    } finally {
      setGeneratingDsa(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return trackQuestions.filter((q) => {
      if (selectedTrackId === 'dsa' && selectedPattern !== 'ALL' && q.dsaPattern !== selectedPattern) {
        return false;
      }
      if (selectedDiffs.length > 0 && !selectedDiffs.includes(q.difficulty)) return false;
      if (selectedCompanies.length > 0 && !selectedCompanies.includes(q.company)) return false;
      if (selectedConcept !== 'ALL' && q.concept !== selectedConcept) return false;
      if (statusFilter === 'solved' && !solvedSet.has(q.id)) return false;
      if (statusFilter === 'unsolved' && solvedSet.has(q.id)) return false;
      if (qLower) {
        const hay = `${q.title} ${q.company} ${q.concept} ${q.dsaPattern || ''} ${q.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [
    trackQuestions,
    selectedTrackId,
    selectedPattern,
    selectedDiffs,
    selectedCompanies,
    selectedConcept,
    statusFilter,
    searchQuery,
    solvedSet,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedQuestions = filteredQuestions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleDiff = (d: Difficulty) => {
    setPage(1);
    setSelectedDiffs((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const toggleCompany = (c: string) => {
    setPage(1);
    setSelectedCompanies((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const trackSolvedCount = trackQuestions.filter((q) => solvedSet.has(q.id)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Rail: 15 Tracks */}
      <aside className="lg:col-span-3 rounded-xl border border-subtle bg-card p-3 space-y-1">
        <div className="px-2.5 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted">
            📚 {TRACKS.length} Tier-1 Tracks ({ALL_QUESTIONS.length.toLocaleString()} Qs)
          </span>
        </div>
        <div className="space-y-0.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {TRACKS.map((t) => {
            const qs = QUESTIONS_BY_TRACK[t.id];
            const solved = qs.filter((q) => solvedSet.has(q.id)).length;
            const active = t.id === selectedTrackId;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTrack(t.id);
                  setSelectedPattern('ALL');
                  setPage(1);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-accent/15 text-primary border border-accent/50 font-semibold shadow-sm'
                    : 'text-muted hover:bg-subtle/40 border border-transparent'
                }`}
              >
                <span className="truncate">
                  {t.emoji} {t.order}. {t.shortName}
                </span>
                <span className="font-mono text-[11px] text-accent tabular-nums shrink-0">
                  {t.id === 'dsa'
                    ? `${trackQuestions.filter((q) => solvedSet.has(q.id)).length}/${
                        (QUESTIONS_BY_TRACK.dsa.length) + (progress.generatedDsaQuestions?.length || 0)
                      }`
                    : `${solved}/${qs.length}`}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Column */}
      <div className="lg:col-span-9 space-y-4">
        <div className="rounded-xl border border-subtle bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-accent">
                Track {activeTrack.order} of {TRACKS.length} · 🎯 Google Loop: {activeTrack.googleRoundMapping}
              </div>
              <h1 className="text-xl font-bold text-primary mt-1">
                {activeTrack.emoji} {activeTrack.name}
              </h1>
              <p className="text-xs text-muted mt-1">
                {activeTrack.description}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <div className="text-2xl font-bold font-mono text-accent">
                {trackSolvedCount}/{trackQuestions.length}
              </div>
              <div className="text-[11px] text-muted">Solved in Track</div>
            </div>
          </div>

          {selectedTrackId === 'behavioral' && (
            <div className="mt-4 pt-3 border-t border-subtle flex flex-wrap items-center gap-2">
              <button
                onClick={() => setBehavioralSubTab('questions')}
                className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  behavioralSubTab === 'questions'
                    ? 'bg-accent text-accent-contrast'
                    : 'border border-subtle bg-canvas text-muted hover:border-accent hover:text-primary'
                }`}
              >
                📚 Behavioral Questions ({trackQuestions.length})
              </button>
              <button
                onClick={() => setBehavioralSubTab('storybank')}
                className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  behavioralSubTab === 'storybank'
                    ? 'bg-accent text-accent-contrast'
                    : 'border border-subtle bg-canvas text-muted hover:border-accent hover:text-primary'
                }`}
              >
                🧭 My CARL Story Bank ({(progress.carlStories || []).length})
              </button>
            </div>
          )}

          {!(selectedTrackId === 'behavioral' && behavioralSubTab === 'storybank') && (
          <div className="mt-4 pt-4 border-t border-subtle space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search questions, tags, companies..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg border border-subtle bg-canvas">
                {(['Easy', 'Medium', 'Hard'] as const).map((d) => {
                  const active = selectedDiffs.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDiff(d)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? d === 'Easy'
                            ? 'bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981] border border-emerald-600/40 dark:border-[#10B981]/40'
                            : d === 'Medium'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-600/40 dark:border-amber-500/40'
                            : 'bg-[#EF4444]/20 text-red-700 dark:text-[#EF4444] border border-red-600/40 dark:border-[#EF4444]/40'
                          : 'text-muted hover:text-primary border border-transparent'
                      }`}
                    >
                      {d === 'Easy' ? '🟢' : d === 'Medium' ? '🟡' : '🔴'} {d}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg border border-subtle bg-canvas">
                {(['all', 'unsolved', 'solved'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-accent text-accent-contrast'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                value={selectedConcept}
                onChange={(e) => {
                  setSelectedConcept(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Concept"
                className="px-2.5 py-2 text-xs rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent max-w-[200px]"
              >
                <option value="ALL">🧩 All Concepts</option>
                {ALL_CONCEPT_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowCompanyFilters((v) => !v)}
                className={`btn-tactile px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCompanies.length > 0 || showCompanyFilters
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-subtle bg-canvas text-muted hover:text-primary'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Companies {selectedCompanies.length > 0 ? `(${selectedCompanies.length})` : ''}
              </button>
            </div>

            {showCompanyFilters && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ALL_COMPANIES.map((comp) => {
                  const active = selectedCompanies.includes(comp);
                  return (
                    <button
                      key={comp}
                      onClick={() => toggleCompany(comp)}
                      className={`btn-tactile px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        active
                          ? 'bg-accent text-accent-contrast border-accent font-semibold'
                          : 'border-subtle bg-canvas text-muted hover:border-accent hover:text-primary'
                      }`}
                    >
                      {comp}
                    </button>
                  );
                })}
                {selectedCompanies.length > 0 && (
                  <button
                    onClick={() => setSelectedCompanies([])}
                    className="px-2.5 py-1 text-xs text-[#EF4444] hover:underline"
                  >
                    Clear companies
                  </button>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        {/* NeetCode-Style Pattern Filter Pills & Progress Tracker (DSA Track Only) */}
        {selectedTrackId === 'dsa' && (
          <div className="rounded-xl border border-subtle bg-card p-4 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-primary flex items-center gap-2">
                  <span>🧩 NeetCode Pattern Curriculum &amp; Progress</span>
                  <span className="font-mono text-[11px] text-accent tabular-nums">
                    ({trackSolvedCount}/{trackQuestions.length} solved)
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  Click any pattern pill to filter problems, or click a problem&apos;s Pattern badge for its Masterclass template.
                </p>
              </div>

              {/* On-Demand gemini-2.5-flash DSA Problem Generator */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={genPattern}
                  onChange={(e) => setGenPattern(e.target.value as 'AUTO' | DsaPattern)}
                  aria-label="Target DSA Pattern for AI Generator"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent max-w-[190px]"
                >
                  <option value="AUTO">✨ Auto Pattern</option>
                  {CANONICAL_DSA_PATTERNS.map((pat) => (
                    <option key={pat} value={pat}>
                      {pat}
                    </option>
                  ))}
                </select>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value as Difficulty)}
                  aria-label="Difficulty for AI Generator"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <button
                  type="button"
                  disabled={generatingDsa}
                  onClick={handleGenerateDsaProblem}
                  className="btn-tactile px-3 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {generatingDsa ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {generatingDsa ? 'Generating...' : 'Generate DSA Problem'}
                </button>
              </div>
            </div>

            {genError && (
              <div className="text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span>{genError}</span>
                <button
                  type="button"
                  disabled={generatingDsa}
                  onClick={handleGenerateDsaProblem}
                  className="btn-tactile px-2.5 py-1 rounded-md bg-accent text-accent-contrast text-[11px] font-bold hover:bg-accent-hover flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            )}

            {/* 18 Pattern Pills + Progress Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPattern('ALL');
                  setPage(1);
                }}
                className={`btn-tactile text-left px-3 py-2 rounded-lg border transition-colors ${
                  selectedPattern === 'ALL'
                    ? 'bg-accent text-accent-contrast border-accent font-bold'
                    : 'bg-canvas border-subtle text-primary hover:border-accent'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="truncate font-semibold">All Patterns</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {trackSolvedCount}/{trackQuestions.length}
                  </span>
                </div>
                <div
                  className={`mt-1.5 h-1 rounded-full overflow-hidden ${
                    selectedPattern === 'ALL' ? 'bg-accent-contrast/25' : 'bg-subtle/60'
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${
                      selectedPattern === 'ALL' ? 'bg-accent-contrast' : 'bg-accent'
                    }`}
                    style={{
                      width: `${trackQuestions.length > 0 ? Math.round((trackSolvedCount / trackQuestions.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </button>

              {dsaPatternStats.map((st) => {
                const active = selectedPattern === st.pattern;
                const pct = st.total > 0 ? Math.round((st.solved / st.total) * 100) : 0;
                return (
                  <button
                    key={st.pattern}
                    type="button"
                    onClick={() => {
                      setSelectedPattern(st.pattern);
                      setPage(1);
                    }}
                    title={`${st.pattern} (${st.solved}/${st.total} solved)`}
                    className={`btn-tactile text-left px-3 py-2 rounded-lg border transition-colors ${
                      active
                        ? 'bg-accent text-accent-contrast border-accent font-bold'
                        : 'bg-canvas border-subtle text-primary hover:border-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="truncate font-semibold">{st.shortLabel}</span>
                      <span className="font-mono tabular-nums shrink-0">
                        {st.solved}/{st.total}
                      </span>
                    </div>
                    <div
                      className={`mt-1.5 h-1 rounded-full overflow-hidden ${
                        active ? 'bg-accent-contrast/25' : 'bg-subtle/60'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${active ? 'bg-accent-contrast' : 'bg-accent'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPattern !== 'ALL' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="text-muted">
                  Filtered by Pattern: <strong className="text-accent">🧩 {selectedPattern}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPattern(selectedPattern)}
                    className="btn-tactile px-3 py-1 rounded-lg bg-accent/15 text-accent border border-accent/40 font-semibold hover:bg-accent/25 flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open {selectedPattern} Masterclass
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPattern('ALL');
                      setPage(1);
                    }}
                    className="text-muted hover:text-primary"
                  >
                    Clear Pattern
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTrackId === 'behavioral' && behavioralSubTab === 'storybank' ? (
          <CarlStoryBank
            stories={progress.carlStories || []}
            onSaveStory={onSaveCarlStory}
            onDeleteStory={onDeleteCarlStory}
          />
        ) : (
        <div className="rounded-xl border border-subtle bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-subtle flex items-center justify-between text-xs text-muted tabular-nums">
            <span>
              Showing {pagedQuestions.length} of {filteredQuestions.length} matching questions
            </span>
            <span>
              Page {safePage} / {totalPages}
            </span>
          </div>

          {pagedQuestions.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-medium text-primary">
                No questions match the current filter combination
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDiffs([]);
                  setSelectedCompanies([]);
                  setSelectedConcept('ALL');
                  setSelectedPattern('ALL');
                  setStatusFilter('all');
                }}
                className="btn-tactile mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover"
              >
                Reset All Filters
              </button>
            </div>
          ) : selectedTrackId === 'dsa' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-subtle text-[11px] font-semibold text-muted bg-canvas/60">
                    <th className="px-4 py-2.5 w-16">#</th>
                    <th className="px-4 py-2.5">Problem &amp; Company</th>
                    <th className="px-4 py-2.5">Pattern</th>
                    <th className="px-4 py-2.5">Difficulty</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {pagedQuestions.map((q) => {
                    const isSolved = solvedSet.has(q.id);
                    const pattern = q.dsaPattern || 'Arrays & Hashing';
                    return (
                      <tr
                        key={q.id}
                        className="hover:bg-canvas/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-accent tabular-nums align-middle">
                          #{String(q.number).padStart(3, '0')}
                        </td>
                        <td className="px-4 py-3 align-middle min-w-[260px]">
                          <button
                            onClick={() => onOpenQuestion(q)}
                            className="text-left text-sm font-semibold text-primary hover:text-accent transition-colors block"
                          >
                            {isSolved && <span className="mr-1.5">✅</span>}
                            {q.title}
                          </button>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                            <span>🏢 {q.company}</span>
                            <span aria-hidden="true">·</span>
                            <span>{q.companyTier}</span>
                            {q.id.startsWith('dsa-ai-') && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-accent font-semibold">AI Generated</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenPattern(pattern)}
                            title={`Open ${pattern} Masterclass`}
                            className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-accent/15 text-accent border border-accent/45 hover:bg-accent/25 whitespace-nowrap"
                          >
                            🧩 {pattern}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${
                              q.difficulty === 'Easy'
                                ? 'bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border-emerald-600/40 dark:border-[#10B981]/40'
                                : q.difficulty === 'Medium'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/40 dark:border-amber-500/40'
                                : 'bg-[#EF4444]/15 text-red-700 dark:text-[#EF4444] border-red-600/40 dark:border-[#EF4444]/40'
                            }`}
                          >
                            {q.difficulty === 'Easy' ? '🟢' : q.difficulty === 'Medium' ? '🟡' : '🔴'}{' '}
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                          <button
                            onClick={() => onOpenQuestion(q)}
                            className={`btn-tactile inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                              isSolved
                                ? 'border border-emerald-600/40 dark:border-[#10B981]/40 text-emerald-700 dark:text-[#10B981] hover:bg-[#10B981]/10'
                                : 'bg-accent text-accent-contrast hover:bg-accent-hover'
                            }`}
                          >
                            {isSolved ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Review
                              </>
                            ) : (
                              '🚀 Solve'
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-subtle">
              {pagedQuestions.map((q, idx) => {
                const isSolved = solvedSet.has(q.id);
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(0.25, idx * 0.015) }}
                    className="px-4 py-3.5 hover:bg-canvas/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted tabular-nums">
                        <span className="font-mono font-semibold text-accent">
                          #{String(q.number).padStart(3, '0')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-canvas border border-subtle text-[11px] font-medium text-primary">
                          🏢 {q.company}
                        </span>
                        <span className="text-[11px]">{q.companyTier}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize text-[11px]">{q.workspaceType}</span>
                      </div>

                      <button
                        onClick={() => onOpenQuestion(q)}
                        className="mt-1.5 text-left text-sm font-semibold text-primary hover:text-accent transition-colors block w-full"
                      >
                        {isSolved && <span className="mr-1.5">✅</span>}
                        {q.title}
                      </button>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onOpenConcept(q.concept)}
                          title="Open Concept Deep-Dive Guide"
                          className="btn-tactile inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-accent/15 text-accent hover:bg-accent/25 border border-accent/35"
                        >
                          <BookOpen className="w-3 h-3" />
                          🧩 {q.concept}
                        </button>
                        <span className="text-[11px] text-muted">
                          {q.tags.join(' · ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${
                          q.difficulty === 'Easy'
                            ? 'bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border-emerald-600/40 dark:border-[#10B981]/40'
                            : q.difficulty === 'Medium'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/40 dark:border-amber-500/40'
                            : 'bg-[#EF4444]/15 text-red-700 dark:text-[#EF4444] border-red-600/40 dark:border-[#EF4444]/40'
                        }`}
                      >
                        {q.difficulty === 'Easy' ? '🟢' : q.difficulty === 'Medium' ? '🟡' : '🔴'}{' '}
                        {q.difficulty}
                      </span>

                      <button
                        onClick={() => onOpenQuestion(q)}
                        className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                          isSolved
                            ? 'border border-emerald-600/40 dark:border-[#10B981]/40 text-emerald-700 dark:text-[#10B981] hover:bg-[#10B981]/10'
                            : 'bg-accent text-accent-contrast hover:bg-accent-hover'
                        }`}
                      >
                        {isSolved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Review
                          </>
                        ) : (
                          '🚀 Solve'
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-subtle flex items-center justify-between text-xs">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-subtle disabled:opacity-40 flex items-center gap-1 hover:border-accent"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <div className="flex items-center gap-1 tabular-nums">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-md font-mono text-xs ${
                      n === safePage
                        ? 'bg-accent text-accent-contrast font-bold'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-subtle disabled:opacity-40 flex items-center gap-1 hover:border-accent"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};
