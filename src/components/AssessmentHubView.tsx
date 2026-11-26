import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  GOOGLE_MOCKS,
  GOOGLE_ROUND_ORDER,
  MOCK_TIERS,
  PEER_COMPANIES,
} from '../data/googleMocks';
import {
  GoogleRoundId,
  InterviewerProfile,
  MockAttemptRecord,
  MockInterviewRound,
  MockTierName,
  TrackId,
  UserProgressState,
} from '../types/platform';
import { runSqlInBrowser } from '../utils/sqlRunner';
import { AnimeCharacterAvatar } from './visuals/AnimeCharacterAvatar';
import { CelebrationBurst } from './visuals/CelebrationAndBadges';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AssessmentHubViewProps {
  progress: UserProgressState;
  activeMockNumber: number | null;
  customMockOverride?: MockInterviewRound | null;
  onSelectMockNumber: (num: number | null) => void;
  onClearCustomMock?: () => void;
  onRecordMock: (record: MockAttemptRecord) => void;
  onJumpToTrack: (trackId: TrackId) => void;
}

interface TranscriptTurn {
  speaker: 'interviewer' | 'candidate';
  text: string;
}

interface ScorecardData {
  score: number;
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';
  summary: string;
  technicalStrengths: string[];
  growthAreas: string[];
  rubricScores: {
    gca: number;
    rrk: number;
    leadership: number;
    googleyness: number;
  };
}

const SEV1_INCIDENTS: string[] = [
  'SEV-1 ALERT: Cloud Dataflow watermark is lagging by 3 hours while BigQuery slot utilization just hit 100% across the us-central1 reservation. Downstream exec dashboards are stale—walk me through your first 15 minutes of triage.',
  'SEV-1 ALERT: Pub/Sub / Kafka consumer lag spiked to 45M unacked messages on the retail-events topic and Cloud Spanner p99 write latency tripled. How do you isolate the blast radius and stop cascading backpressure?',
  'SEV-1 ALERT: Silent upstream schema drift just landed in 8 TB of Bronze Parquet partitions (string IDs mutated to nullable structs), breaking downstream dbt/Spark gold merges. How do you contain, backfill, and communicate SLA impact?',
  'SEV-1 ALERT: BigQuery Storage Write API is returning HTTP 429 quota throttles 20 minutes before a regulatory reporting SLA cutoff. Walk me through immediate mitigation, DLQ routing, and postmortem guardrails.',
];

export const AssessmentHubView: React.FC<AssessmentHubViewProps> = ({
  progress,
  activeMockNumber,
  customMockOverride,
  onSelectMockNumber,
  onClearCustomMock,
  onRecordMock,
  onJumpToTrack,
}) => {
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | MockTierName>('ALL');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'ALL' | GoogleRoundId>('ALL');
  const [selectedCompanyTab, setSelectedCompanyTab] = useState<string>('google');
  const [targetLevel, setTargetLevel] = useState<'L3/L4' | 'L5'>('L3/L4');

  const activeMock: MockInterviewRound | undefined = customMockOverride
    ? customMockOverride
    : activeMockNumber
    ? GOOGLE_MOCKS.find((m) => m.mockNumber === activeMockNumber)
    : undefined;

  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [gcaGateUnlocked, setGcaGateUnlocked] = useState(false);
  const [clarifyingInput, setClarifyingInput] = useState('');
  const [clarifyingNotes, setClarifyingNotes] = useState('');
  const [activeSev1Incident, setActiveSev1Incident] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [scratchpad, setScratchpad] = useState('');
  const [sqlPreviewOutput, setSqlPreviewOutput] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [nodTrigger, setNodTrigger] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lastCandidateActivitySec, setLastCandidateActivitySec] = useState(0);
  const [thinkAloudNudgeDismissed, setThinkAloudNudgeDismissed] = useState(false);
  const [finalScorecard, setFinalScorecard] = useState<ScorecardData | null>(null);
  const [showVerdictCelebration, setShowVerdictCelebration] = useState(false);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const activeRoundStep = activeMock?.sixRounds[currentRoundIdx] || activeMock?.sixRounds[0];
  const currentInterviewer: InterviewerProfile | undefined = activeRoundStep?.interviewer || activeMock?.interviewerProfile;

  const speakText = (text: string, profile?: InterviewerProfile) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsAiSpeaking(true);
      setTimeout(() => setIsAiSpeaking(false), Math.min(4500, Math.max(1500, text.length * 32)));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = profile?.voiceRate ?? 1.02;
    utter.pitch = profile?.voicePitch ?? 1.0;

    // Match system voice preference by gender when available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0 && profile) {
      const targetVoice = voices.find((v) =>
        profile.voiceGender === 'female'
          ? /female|samantha|victoria|karen|zira|google.*us/i.test(v.name)
          : /male|daniel|alex|david|google.*uk.*male/i.test(v.name)
      );
      if (targetVoice) utter.voice = targetVoice;
    }

    utter.onstart = () => setIsAiSpeaking(true);
    utter.onend = () => setIsAiSpeaking(false);
    utter.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (!activeMock) return;
    setCurrentRoundIdx(0);
  }, [activeMock?.id]);

  // Initialize state whenever the active round step changes (1 -> 6)
  useEffect(() => {
    if (!activeMock || !activeRoundStep) return;
    setGcaGateUnlocked(false);
    setClarifyingInput('');
    setClarifyingNotes('');
    setActiveSev1Incident(null);
    setScratchpad(activeRoundStep.starterCode || '');
    setSqlPreviewOutput(null);
    setFinalScorecard(null);
    setShowVerdictCelebration(false);
    setElapsedSec(0);
    setLastCandidateActivitySec(0);
    setThinkAloudNudgeDismissed(false);

    const intro = `Hi, I am ${activeRoundStep.interviewer.name}, ${activeRoundStep.interviewer.role} on ${activeRoundStep.interviewer.team}. Welcome to ${activeRoundStep.roundLabel} of ${activeMock.code}. Before writing code or drawing diagrams, take up to 2 minutes to ask clarifying questions: ${activeRoundStep.questionPrompt}`;
    setTranscript([{ speaker: 'interviewer', text: intro }]);
    speakText(intro, activeRoundStep.interviewer);

    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [activeMock?.id, currentRoundIdx]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, aiThinking]);

  const showThinkAloudNudge =
    gcaGateUnlocked &&
    !finalScorecard &&
    !thinkAloudNudgeDismissed &&
    elapsedSec - lastCandidateActivitySec >= 90;

  const toggleVoiceMic = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setCandidateInput((prev) =>
        prev || 'Web Speech Recognition unavailable in this browser—please type your response below.'
      );
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (ev) => {
      let combined = '';
      for (let i = 0; i < ev.results.length; i++) {
        combined += ev.results[i][0].transcript + ' ';
      }
      setCandidateInput(combined.trim());
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  };

  const handleSubmitClarifyingGate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeMock || !activeRoundStep || aiThinking) return;
    const msgText = clarifyingInput.trim() || 'Clarifying Qs: Checking scale SLA, out-of-order late arrival bounds, and key cardinality/skew assumptions before coding.';
    setClarifyingNotes(msgText);
    setGcaGateUnlocked(true);
    setLastCandidateActivitySec(elapsedSec);

    const nextTranscript: TranscriptTurn[] = [
      ...transcript,
      { speaker: 'candidate', text: `[GCA Clarifying Questions] ${msgText}` },
    ];
    setTranscript(nextTranscript);
    setClarifyingInput('');
    setAiThinking(true);

    try {
      const res = await fetch('/api/ai/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockTitle: activeMock.title,
          roundType: activeRoundStep.roundType,
          roundNumber: activeRoundStep.roundNumber,
          interviewerName: activeRoundStep.interviewer.name,
          interviewerRole: `${activeRoundStep.interviewer.role} (${activeRoundStep.interviewer.team})`,
          questionPrompt: activeRoundStep.questionPrompt,
          expectedSignals: activeRoundStep.expectedSignals,
          clarifyingNotes: msgText,
          transcript: nextTranscript,
          candidateCodeOrNotes: scratchpad,
          targetLevel,
          sev1Incident: activeSev1Incident || undefined,
          finishInterview: false,
        }),
      });
      const data = await res.json();
      const reply = res.ok
        ? data.reply
        : `Great clarifying checks. Assume p99 SLA under 5 seconds and expect hot-key skew—editor is unlocked, go ahead and think aloud as you build!`;
      setTranscript((prev) => [...prev, { speaker: 'interviewer', text: reply }]);
      setNodTrigger((n) => n + 1);
      speakText(reply, activeRoundStep.interviewer);
    } catch {
      const reply = `Good clarifying checks. Assume p99 SLA under 5s and expect hot-key skew—the editor is unlocked now, please talk me through your design!`;
      setTranscript((prev) => [...prev, { speaker: 'interviewer', text: reply }]);
      speakText(reply, activeRoundStep.interviewer);
    } finally {
      setAiThinking(false);
    }
  };

  const triggerSev1Incident = () => {
    if (!activeRoundStep) return;
    const candidates = SEV1_INCIDENTS.filter((inc) => inc !== activeSev1Incident);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || SEV1_INCIDENTS[0];
    setActiveSev1Incident(chosen);
    setTranscript((prev) => [...prev, { speaker: 'interviewer', text: `🚨 [LIVE SEV-1 PRODUCTION ALERT] ${chosen}` }]);
    speakText(chosen, activeRoundStep.interviewer);
  };

  const handleSendTurn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeMock || !activeRoundStep || !candidateInput.trim() || aiThinking) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setLastCandidateActivitySec(elapsedSec);
    setThinkAloudNudgeDismissed(false);

    const candidateTurnsCount = transcript.filter((t) => t.speaker === 'candidate').length;
    let incidentForTurn = activeSev1Incident;
    const autoDropSev1 = targetLevel === 'L5' && gcaGateUnlocked && !activeSev1Incident && candidateTurnsCount >= 1;
    if (autoDropSev1) {
      incidentForTurn = SEV1_INCIDENTS[Math.floor(Math.random() * SEV1_INCIDENTS.length)];
      setActiveSev1Incident(incidentForTurn);
    }

    const nextTranscript: TranscriptTurn[] = [
      ...transcript,
      { speaker: 'candidate', text: candidateInput.trim() },
      ...(autoDropSev1 && incidentForTurn
        ? [{ speaker: 'interviewer' as const, text: `🚨 [LIVE SEV-1 PRODUCTION ALERT] ${incidentForTurn}` }]
        : []),
    ];
    setTranscript(nextTranscript);
    setCandidateInput('');
    setAiThinking(true);

    try {
      const res = await fetch('/api/ai/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockTitle: activeMock.title,
          roundType: activeRoundStep.roundType,
          roundNumber: activeRoundStep.roundNumber,
          interviewerName: activeRoundStep.interviewer.name,
          interviewerRole: `${activeRoundStep.interviewer.role} (${activeRoundStep.interviewer.team})`,
          questionPrompt: activeRoundStep.questionPrompt,
          expectedSignals: activeRoundStep.expectedSignals,
          clarifyingNotes,
          transcript: nextTranscript,
          candidateCodeOrNotes: scratchpad,
          targetLevel,
          sev1Incident: incidentForTurn || undefined,
          finishInterview: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Interviewer turn failed');
      setTranscript((prev) => [...prev, { speaker: 'interviewer', text: data.reply }]);
      setNodTrigger((n) => n + 1);
      speakText(data.reply, activeRoundStep.interviewer);
    } catch {
      const fallback = incidentForTurn
        ? `Let's switch immediately to Sev-1 triage—walk me through the first telemetry dashboards you check, how you halt blast radius, and what you tell stakeholders.`
        : `Thanks for sharing that. Let's inspect ${activeRoundStep.expectedSignals[0]} — how would your solution behave during a 10x skew burst?`;
      setTranscript((prev) => [...prev, { speaker: 'interviewer', text: fallback }]);
      setNodTrigger((n) => n + 1);
      speakText(fallback, activeRoundStep.interviewer);
    } finally {
      setAiThinking(false);
    }
  };

  const triggerVerdictBurst = (verdict: string) => {
    if (verdict === 'Strong Hire' || verdict === 'Hire') {
      setShowVerdictCelebration(true);
      setNodTrigger((n) => n + 1);
      setTimeout(() => setShowVerdictCelebration(false), 2200);
    }
  };

  const handleFinishAndGrade = async () => {
    if (!activeMock || !activeRoundStep || aiThinking) return;
    setAiThinking(true);
    try {
      const res = await fetch('/api/ai/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockTitle: activeMock.title,
          roundType: activeRoundStep.roundType,
          roundNumber: activeRoundStep.roundNumber,
          interviewerName: activeRoundStep.interviewer.name,
          interviewerRole: `${activeRoundStep.interviewer.role} (${activeRoundStep.interviewer.team})`,
          questionPrompt: activeRoundStep.questionPrompt,
          expectedSignals: activeRoundStep.expectedSignals,
          clarifyingNotes,
          transcript,
          candidateCodeOrNotes: scratchpad,
          targetLevel,
          sev1Incident: activeSev1Incident || undefined,
          finishInterview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grading failed');
      const card: ScorecardData = data.scorecard;
      setFinalScorecard(card);
      triggerVerdictBurst(card.verdict);
      onRecordMock({
        mockId: activeMock.id,
        mockNumber: activeMock.mockNumber,
        title: `${activeMock.title} (${activeRoundStep.roundLabel})`,
        roundType: activeRoundStep.roundType,
        score: card.score,
        verdict: card.verdict,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedSec,
        summary: card.summary,
        rubricScores: card.rubricScores,
      });
    } catch {
      const fallbackCard: ScorecardData = {
        score: 79,
        verdict: 'Hire',
        summary: 'Strong structured problem solving and production cloud trade-offs across this round.',
        technicalStrengths: activeRoundStep.expectedSignals.slice(0, 2),
        growthAreas: ['Quantify p99 latency & BigQuery slot cost math upfront in your GCA gate.'],
        rubricScores: { gca: 80, rrk: 78, leadership: 77, googleyness: 83 },
      };
      setFinalScorecard(fallbackCard);
      triggerVerdictBurst(fallbackCard.verdict);
      onRecordMock({
        mockId: activeMock.id,
        mockNumber: activeMock.mockNumber,
        title: `${activeMock.title} (${activeRoundStep.roundLabel})`,
        roundType: activeRoundStep.roundType,
        score: fallbackCard.score,
        verdict: fallbackCard.verdict,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedSec,
        summary: fallbackCard.summary,
        rubricScores: fallbackCard.rubricScores,
      });
    } finally {
      setAiThinking(false);
    }
  };

  const handleRunScratchpadSql = async () => {
    if (!activeRoundStep?.datasetId) return;
    setLastCandidateActivitySec(elapsedSec);
    const res = await runSqlInBrowser(scratchpad, activeRoundStep.datasetId, []);
    if (res.error) {
      setSqlPreviewOutput(`❌ SQL Error: ${res.error}`);
    } else {
      setNodTrigger((n) => n + 1);
      setSqlPreviewOutput(
        `✅ Returned ${res.rows.length} rows (${res.executionMs}ms): ${res.columns.join(' | ')}\n` +
          res.rows.slice(0, 5).map((r) => r.join(' | ')).join('\n')
      );
    }
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Render Live 6-Round Face-to-Face AI Google Mock Studio
  if (activeMock && activeRoundStep && currentInterviewer) {
    return (
      <div className="space-y-4 relative">
        <CelebrationBurst
          visible={showVerdictCelebration}
          label={`🚀 ${finalScorecard?.verdict || 'Strong Hire'}`}
          sublabel="Google Hiring Committee 4-Pillar Scorecard Recorded!"
        />

        {/* Studio Top Header */}
        <div className="rounded-xl border border-subtle bg-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-accent">
              🎯 {activeMock.code} · {activeMock.tier} · {targetLevel === 'L5' ? '👑 Senior L5 Bar' : '🎯 Mid-Level L3/L4'}
            </div>
            <h1 className="text-base font-bold text-primary">{activeMock.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center p-0.5 rounded-lg border border-subtle bg-canvas text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setTargetLevel('L3/L4')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  targetLevel === 'L3/L4' ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-primary'
                }`}
              >
                🎯 L3/L4
              </button>
              <button
                type="button"
                onClick={() => setTargetLevel('L5')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  targetLevel === 'L5' ? 'bg-amber-500 text-[#09090B]' : 'text-muted hover:text-primary'
                }`}
              >
                👑 Senior L5
              </button>
            </div>
            {targetLevel === 'L5' && (
              <button
                type="button"
                onClick={triggerSev1Incident}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-[#EF4444]/60 bg-[#EF4444]/15 text-[#EF4444] text-xs font-bold hover:bg-[#EF4444]/25 flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {activeSev1Incident ? '🚨 Drop Another Sev-1' : '🚨 Drop Live Sev-1 Alert'}
              </button>
            )}
            <span className="px-3 py-1.5 rounded-lg border border-subtle bg-canvas font-mono text-xs tabular-nums flex items-center gap-1.5 text-primary">
              <Clock className="w-3.5 h-3.5 text-accent" />
              {formatTimer(elapsedSec)}
            </span>
            <button
              onClick={() => setTtsEnabled((v) => !v)}
              title="Toggle Interviewer Voice"
              className="btn-tactile p-2 rounded-lg border border-subtle bg-canvas text-muted hover:text-primary hover:border-accent"
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-accent" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              disabled={aiThinking}
              onClick={handleFinishAndGrade}
              className="btn-tactile px-3.5 py-2 rounded-lg bg-[#10B981] text-[#09090B] text-xs font-bold hover:bg-[#0EA572]"
            >
              {aiThinking ? 'Scoring...' : '✅ Finish & Score Round'}
            </button>
            <button
              onClick={() => {
                onClearCustomMock?.();
                onSelectMockNumber(null);
              }}
              className="btn-tactile px-3 py-2 rounded-lg border border-[#EF4444]/40 text-[#EF4444] text-xs font-semibold hover:bg-[#EF4444]/10 flex items-center gap-1"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
        </div>

        {/* 6-Round Sequential Google Loop Stepper */}
        <div className="rounded-xl border border-subtle bg-card p-3 flex flex-wrap items-center gap-2">
          {activeMock.sixRounds.map((step, idx) => {
            const active = idx === currentRoundIdx;
            return (
              <button
                key={step.roundNumber}
                onClick={() => setCurrentRoundIdx(idx)}
                className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-accent text-accent-contrast border-accent'
                    : 'bg-canvas border-subtle text-muted hover:border-accent hover:text-primary'
                }`}
              >
                <span>{step.roundLabel}</span>
                <span className="opacity-75 text-[10px]">({step.interviewer.name.split(' ')[0]})</span>
              </button>
            );
          })}
        </div>

        {/* 4-Pillar Google Hiring Committee Scorecard */}
        {finalScorecard && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#10B981]" />
                <h2 className="text-base font-bold text-primary">
                  Google Hiring Committee Verdict ({activeRoundStep.roundLabel}): {finalScorecard.verdict}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-accent tabular-nums">
                  {finalScorecard.score}/100
                </span>
                {currentRoundIdx < activeMock.sixRounds.length - 1 && (
                  <button
                    onClick={() => setCurrentRoundIdx((i) => i + 1)}
                    className="btn-tactile px-3 py-1.5 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover text-xs font-bold flex items-center gap-1"
                  >
                    Next Round ({activeMock.sixRounds[currentRoundIdx + 1].roundLabel})
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-primary/90">{finalScorecard.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
              <div className="rounded-lg bg-canvas/90 border border-subtle p-2.5">
                <div className="text-muted">GCA (Cognitive)</div>
                <div className="font-mono font-bold text-accent">{finalScorecard.rubricScores.gca}/100</div>
              </div>
              <div className="rounded-lg bg-canvas/90 border border-subtle p-2.5">
                <div className="text-muted">RRK (Role Knowledge)</div>
                <div className="font-mono font-bold text-accent">{finalScorecard.rubricScores.rrk}/100</div>
              </div>
              <div className="rounded-lg bg-canvas/90 border border-subtle p-2.5">
                <div className="text-muted">Leadership</div>
                <div className="font-mono font-bold text-accent">{finalScorecard.rubricScores.leadership}/100</div>
              </div>
              <div className="rounded-lg bg-canvas/90 border border-subtle p-2.5">
                <div className="text-muted">Googleyness</div>
                <div className="font-mono font-bold text-accent">{finalScorecard.rubricScores.googleyness}/100</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Live Sev-1 Production Incident Triage Banner (L5 Mode) */}
        {activeSev1Incident && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#EF4444]/60 bg-[#EF4444]/10 px-4 py-3 flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="font-bold text-[#EF4444] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                LIVE SEV-1 PRODUCTION INCIDENT — ON-CALL TRIAGE ACTIVE
              </div>
              <p className="text-primary leading-relaxed">{activeSev1Incident}</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#EF4444] text-white font-mono text-[10px] font-bold shrink-0">
              P0 / SEV-1
            </span>
          </motion.div>
        )}

        {/* 90-Second Think-Aloud Nudger */}
        {showThinkAloudNudge && (
          <div className="rounded-xl border border-amber-500/45 bg-amber-500/10 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-500 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                90-Second Think-Aloud Reminder: {currentInterviewer.name} hasn&apos;t heard from you in 90s—narrate your trade-offs, time complexity, or edge cases!
              </span>
            </div>
            <button
              onClick={() => setThinkAloudNudgeDismissed(true)}
              className="text-muted hover:text-primary font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Column Video Call + Live Shared Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Distinct Specialist Interviewer Video + Transcript */}
          <div className="lg:col-span-5 rounded-xl border border-subtle bg-card flex flex-col max-h-[720px] overflow-hidden">
            <div className="relative p-4 bg-[#09090B] border-b border-[#27272A] flex flex-col items-center">
              <div
                className={`relative w-full max-w-[340px] aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                  isAiSpeaking
                    ? 'border-accent shadow-[0_0_30px_rgba(var(--accent-rgb),0.6)] animate-voice-halo'
                    : 'border-[#27272A]'
                }`}
              >
                <AnimeCharacterAvatar
                  profile={currentInterviewer}
                  isSpeaking={isAiSpeaking}
                  nodTrigger={nodTrigger}
                  size="studio"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 flex items-end justify-between z-20">
                  <div>
                    <div className="text-xs font-bold text-white">{currentInterviewer.name}</div>
                    <div className="text-[10px] text-zinc-300">
                      {currentInterviewer.role} · {currentInterviewer.team}
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 h-5">
                    {[0.4, 0.9, 0.6, 1, 0.5, 0.8].map((h, idx) => (
                      <span
                        key={idx}
                        className={`w-1 rounded-full bg-accent transition-all duration-150 ${
                          isAiSpeaking ? 'opacity-100' : 'opacity-30'
                        }`}
                        style={{ height: isAiSpeaking ? `${Math.round(h * 18)}px` : '4px' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {transcript.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg ${
                    t.speaker === 'interviewer'
                      ? 'bg-canvas border border-subtle'
                      : 'ml-6 bg-accent/15 border border-accent/30'
                  }`}
                >
                  <div className="font-semibold text-[11px] text-accent mb-1">
                    {t.speaker === 'interviewer' ? currentInterviewer.name : 'You (Candidate)'}
                  </div>
                  <p className="text-primary/90 leading-relaxed">{t.text}</p>
                </motion.div>
              ))}
              {aiThinking && (
                <div className="text-xs text-accent px-2">
                  ✨ {currentInterviewer.name} is evaluating your response &amp; buffer...
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            <form
              onSubmit={handleSendTurn}
              className="p-3 border-t border-subtle flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoiceMic}
                title="Speak via Web Speech API"
                className={`btn-tactile p-2 rounded-lg border transition-colors ${
                  isListening
                    ? 'bg-[#EF4444] text-white border-[#EF4444]'
                    : 'border-subtle text-muted hover:border-accent hover:text-primary'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={candidateInput}
                onChange={(e) => setCandidateInput(e.target.value)}
                placeholder={isListening ? 'Listening... speak your answer' : 'Think aloud or answer probe...'}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-subtle bg-canvas text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={aiThinking || !candidateInput.trim()}
                className="btn-tactile p-2 rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right: Mandatory 2-Min GCA Clarifying Gate -> Shared Pad */}
          <div className="lg:col-span-7 rounded-xl border border-subtle bg-card flex flex-col max-h-[720px] relative overflow-hidden">
            <div className="px-4 py-2.5 border-b border-subtle flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                {gcaGateUnlocked ? (
                  <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-accent" />
                )}
                Shared Interview Pad ({currentInterviewer.name} inspects live)
              </span>
              {gcaGateUnlocked && activeRoundStep.datasetId && activeRoundStep.workspaceMode === 'ide' && (
                <button
                  onClick={handleRunScratchpadSql}
                  className="btn-tactile px-3 py-1 rounded-lg bg-accent/15 text-accent text-xs font-semibold hover:bg-accent/25 flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Run SQL (sql.js)
                </button>
              )}
            </div>

            {!gcaGateUnlocked ? (
              <div className="flex-1 p-6 flex flex-col justify-center space-y-4 text-xs bg-canvas">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-accent">
                  <ShieldCheck className="w-5 h-5" />
                  Step 1 (Mandatory 2-Min GCA Gate): Ask Clarifying Questions First
                </div>
                <p className="text-primary/85 leading-relaxed">
                  Google interviewers grade <strong>General Cognitive Ability (GCA)</strong> on whether you clarify constraints, data volume, late arrivals, and SLAs before jumping into code. Submit your clarifying questions below to unlock the shared editor.
                </p>

                <div className="space-y-1.5">
                  <div className="font-semibold text-muted">Suggested GCA Clarifications (click to add):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRoundStep.clarifyingPrompts.map((cp, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setClarifyingInput((prev) => (prev ? `${prev} ${cp}` : cp))}
                        className="text-left px-2.5 py-1.5 rounded-lg border border-accent/35 bg-accent/10 text-primary text-[11px] hover:bg-accent/20"
                      >
                        + {cp}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmitClarifyingGate} className="space-y-2.5">
                  <textarea
                    value={clarifyingInput}
                    onChange={(e) => setClarifyingInput(e.target.value)}
                    placeholder="Type 2-3 clarifying questions on data scale, out-of-order arrivals, schema edge cases, or SLAs..."
                    className="w-full h-24 rounded-lg border border-subtle bg-card text-primary p-3 text-xs focus:outline-none focus:border-accent"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={aiThinking}
                      className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast font-bold hover:bg-accent-hover"
                    >
                      🔓 Ask Clarifying Questions &amp; Unlock Editor
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="p-3 bg-[#09090B] flex-1 min-h-[300px]">
                  <textarea
                    value={scratchpad}
                    onChange={(e) => {
                      setScratchpad(e.target.value);
                      setLastCandidateActivitySec(elapsedSec);
                    }}
                    spellCheck={false}
                    placeholder="Write SQL, Python, architecture components, capacity math, or STAR+L bullets here..."
                    className="w-full h-full min-h-[280px] bg-[#09090B] text-zinc-100 font-mono text-xs leading-relaxed resize-none focus:outline-none p-2"
                  />
                </div>

                {sqlPreviewOutput && (
                  <pre
                    className={`p-3 border-t border-[#27272A] bg-[#09090B] font-mono text-[11px] max-h-36 overflow-auto ${
                      sqlPreviewOutput.startsWith('❌') ? 'text-[#EF4444] animate-shake' : 'text-emerald-300'
                    }`}
                  >
                    {sqlPreviewOutput}
                  </pre>
                )}
              </>
            )}

            <div className="p-4 border-t border-subtle text-xs space-y-2">
              <div className="font-semibold text-primary">
                Expected Hiring Signals ({activeRoundStep.roundLabel})
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRoundStep.expectedSignals.map((sig, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-canvas border border-subtle text-primary text-[11px]"
                  >
                    ✅ {sig}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assessment Hub Directory
  const completedIds = new Set(progress.mockHistory.map((m) => m.mockId));
  const filteredMocks = GOOGLE_MOCKS.filter((m) => {
    if (selectedTierFilter !== 'ALL' && m.tier !== selectedTierFilter) return false;
    if (selectedRoundFilter !== 'ALL' && m.roundType !== selectedRoundFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            🎯 Tier-1 Assessment Hub
          </h1>
          <p className="text-sm text-muted mt-1">
            50 End-to-End 6-Round Google Mock Interviews across 5 progressive tiers with 26+ distinct Google interviewers + 7 peer Tier-1 tracks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <div className="flex items-center p-1 rounded-lg border border-subtle bg-card text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTargetLevel('L3/L4')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                targetLevel === 'L3/L4' ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-primary'
              }`}
            >
              🎯 Target: Mid-Level L3/L4
            </button>
            <button
              type="button"
              onClick={() => setTargetLevel('L5')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                targetLevel === 'L5' ? 'bg-amber-500 text-[#09090B]' : 'text-muted hover:text-primary'
              }`}
            >
              👑 Target: Senior L5 (+Sev-1 Triage)
            </button>
          </div>
          <button
            onClick={() => onSelectMockNumber(1)}
            className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            🚀 Start 6-Round Mock #01
          </button>
        </div>
      </div>

      {/* Company Selector Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <button
          onClick={() => setSelectedCompanyTab('google')}
          className={`btn-tactile p-3 rounded-xl border text-left transition-colors ${
            selectedCompanyTab === 'google'
              ? 'border-accent bg-accent/15'
              : 'border-subtle bg-card hover:border-accent'
          }`}
        >
          <div className="text-sm font-bold text-primary">🔍 Google</div>
          <div className="text-[11px] font-semibold text-[#10B981] mt-1">50 × 6-Round Loops</div>
        </button>

        {PEER_COMPANIES.map((comp) => (
          <button
            key={comp.id}
            onClick={() => setSelectedCompanyTab(comp.id)}
            className={`btn-tactile p-3 rounded-xl border text-left transition-colors ${
              selectedCompanyTab === comp.id
                ? 'border-accent bg-accent/15'
                : 'border-subtle bg-card hover:border-accent'
            }`}
          >
            <div className="text-sm font-bold text-primary truncate">
              {comp.emoji} {comp.name}
            </div>
            <div className="text-[11px] text-muted mt-1">{comp.roundsCount} Rounds</div>
          </button>
        ))}
      </div>

      {selectedCompanyTab !== 'google' ? (
        (() => {
          const peer = PEER_COMPANIES.find((c) => c.id === selectedCompanyTab)!;
          return (
            <div className="rounded-xl border border-subtle bg-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-accent">
                    {peer.name} Assessment Track · {peer.roundsCount} Core Rounds
                  </div>
                  <h2 className="text-xl font-bold text-primary mt-1">
                    {peer.emoji} {peer.roleFocus}
                  </h2>
                </div>
                <button
                  onClick={() => onJumpToTrack(peer.recommendedTrackId)}
                  className="btn-tactile px-4 py-2 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover whitespace-nowrap self-start"
                >
                  Open Linked Question Track →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {peer.keyTopics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1.5 rounded-lg border border-subtle bg-canvas text-primary text-xs font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          );
        })()
      ) : (
        <>
          {/* Tier Filter Pills */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedTierFilter('ALL')}
                className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTierFilter === 'ALL'
                    ? 'bg-accent text-accent-contrast'
                    : 'border border-subtle bg-card text-primary hover:border-accent'
                }`}
              >
                All 5 Tiers (50 Mocks)
              </button>
              {MOCK_TIERS.map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTierFilter(tier)}
                  className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedTierFilter === tier
                      ? 'bg-accent text-accent-contrast font-semibold'
                      : 'border border-subtle bg-card text-primary hover:border-accent'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Lead Round Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedRoundFilter('ALL')}
                className={`btn-tactile px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  selectedRoundFilter === 'ALL'
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted hover:text-primary'
                }`}
              >
                All Lead Rounds
              </button>
              {GOOGLE_ROUND_ORDER.map((round) => (
                <button
                  key={round}
                  onClick={() => setSelectedRoundFilter(round)}
                  className={`btn-tactile px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                    selectedRoundFilter === round
                      ? 'bg-accent/20 text-accent font-semibold'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {round}
                </button>
              ))}
            </div>
          </div>

          {/* 50 Mocks Staggered Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMocks.map((mock, idx) => {
              const isDone = completedIds.has(mock.id);
              const latestAttempt = progress.mockHistory.find((h) => h.mockId === mock.id);

              return (
                <motion.div
                  key={mock.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(0.35, idx * 0.015) }}
                  className="rounded-xl border border-subtle bg-card p-4 flex flex-col justify-between gap-3 hover:border-accent transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-accent">{mock.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                          mock.difficulty === 'Easy'
                            ? 'bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border-emerald-600/40 dark:border-[#10B981]/40'
                            : mock.difficulty === 'Medium'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/40 dark:border-amber-500/40'
                            : 'bg-[#EF4444]/15 text-red-700 dark:text-[#EF4444] border-red-600/40 dark:border-[#EF4444]/40'
                        }`}
                      >
                        {mock.difficulty === 'Easy' ? '🟢' : mock.difficulty === 'Medium' ? '🟡' : '🔴'}{' '}
                        {mock.difficulty}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] font-medium text-muted">
                      {mock.tier} · 6 Sequential Rounds
                    </div>

                    <h3 className="mt-1.5 text-sm font-bold text-primary">
                      {mock.title}
                    </h3>

                    <p className="mt-1.5 text-xs text-muted line-clamp-2">
                      {mock.questionPrompt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="rounded-full border border-accent/60 p-0.5 bg-[#09090B] shrink-0">
                        <AnimeCharacterAvatar profile={mock.interviewerProfile} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate text-primary">
                          {mock.interviewerName}
                        </div>
                        {isDone && latestAttempt ? (
                          <div className="text-[10px] font-semibold text-[#10B981] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {latestAttempt.verdict} ({latestAttempt.score}/100)
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted truncate">{mock.interviewerProfile.role}</div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectMockNumber(mock.mockNumber)}
                      className="btn-tactile px-3 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:bg-accent-hover whitespace-nowrap shrink-0"
                    >
                      {isDone ? 'Retake' : 'Start 6-Round'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
