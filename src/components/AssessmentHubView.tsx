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
import { sanitizeAiErrorMessage } from '../utils/storage';
import { runMockInterviewTurn, transcribeAudioBlob } from '../services/geminiAiService';
import {
  AudioRecordingHandle,
  base64Pcm16ToAudioBuffer,
  computeOutputBufferRms,
  computeRmsLevel,
  float32ToPcm16Base64,
  startMicRecording,
} from '../utils/liveAudio';
import { AnimeCharacterAvatar } from './visuals/AnimeCharacterAvatar';
import { CelebrationBurst } from './visuals/CelebrationAndBadges';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Unlock,
  Volume2,
  VolumeX,
  X,
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

  // Gemini Live Voice & Technical Audio Transcription states
  const [voiceMode, setVoiceMode] = useState<'live' | 'text'>('text');
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [liveMicMuted, setLiveMicMuted] = useState(false);
  const [liveSpeakerMuted, setLiveSpeakerMuted] = useState(false);
  const [aiAudioLevel, setAiAudioLevel] = useState(0);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [liveInputDraft, setLiveInputDraft] = useState('');
  const [liveOutputDraft, setLiveOutputDraft] = useState('');
  const [recordingTarget, setRecordingTarget] = useState<'turn' | 'clarify' | null>(null);
  const [transcribingTarget, setTranscribingTarget] = useState<'turn' | 'clarify' | null>(null);

  const [aiThinking, setAiThinking] = useState(false);
  const [aiBanner, setAiBanner] = useState<{
    type: 'retry' | 'info';
    message: string;
    retryLabel?: string;
    retryAction?: () => void;
  } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lastCandidateActivitySec, setLastCandidateActivitySec] = useState(0);
  const [thinkAloudNudgeDismissed, setThinkAloudNudgeDismissed] = useState(false);
  const [finalScorecard, setFinalScorecard] = useState<ScorecardData | null>(null);
  const [showVerdictCelebration, setShowVerdictCelebration] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<TranscriptTurn[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveSessionActiveRef = useRef<boolean>(false);
  const liveMicMutedRef = useRef<boolean>(false);
  const liveSpeakerMutedRef = useRef<boolean>(false);
  const liveInputBufferRef = useRef<string>('');
  const liveOutputBufferRef = useRef<string>('');
  const lastLevelUpdateRef = useRef<number>(0);
  const elapsedSecRef = useRef<number>(0);
  const audioRecRef = useRef<AudioRecordingHandle | null>(null);

  const activeRoundStep = activeMock?.sixRounds[currentRoundIdx] || activeMock?.sixRounds[0];
  const currentInterviewer: InterviewerProfile | undefined = activeRoundStep?.interviewer || activeMock?.interviewerProfile;

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    elapsedSecRef.current = elapsedSec;
  }, [elapsedSec]);

  useEffect(() => {
    liveMicMutedRef.current = liveMicMuted;
    if (liveMicMuted) {
      setMicAudioLevel(0);
    }
  }, [liveMicMuted]);

  useEffect(() => {
    liveSpeakerMutedRef.current = liveSpeakerMuted;
    if (liveSpeakerMuted) {
      activeSourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch {
          // ignore
        }
      });
      activeSourcesRef.current = [];
      nextStartTimeRef.current = 0;
      setIsAiSpeaking(false);
      setAiAudioLevel(0);
    }
  }, [liveSpeakerMuted]);

  const stopAllAiAudioPlayback = () => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore already-stopped nodes
      }
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsAiSpeaking(false);
    setAiAudioLevel(0);
  };

  const commitLiveSpeakerBuffer = (speaker: 'candidate' | 'interviewer') => {
    if (speaker === 'candidate') {
      const text = liveInputBufferRef.current.trim();
      liveInputBufferRef.current = '';
      setLiveInputDraft('');
      if (text) {
        setTranscript((prev) => [...prev, { speaker: 'candidate', text }]);
      }
      return text;
    }
    const text = liveOutputBufferRef.current.trim();
    liveOutputBufferRef.current = '';
    setLiveOutputDraft('');
    if (text) {
      setTranscript((prev) => [...prev, { speaker: 'interviewer', text }]);
    }
    return text;
  };

  const getFlushedTranscriptSnapshot = (): TranscriptTurn[] => {
    const flushed: TranscriptTurn[] = [...transcriptRef.current];
    const inText = liveInputBufferRef.current.trim();
    const outText = liveOutputBufferRef.current.trim();
    if (inText) {
      flushed.push({ speaker: 'candidate', text: inText });
      liveInputBufferRef.current = '';
      setLiveInputDraft('');
    }
    if (outText) {
      flushed.push({ speaker: 'interviewer', text: outText });
      liveOutputBufferRef.current = '';
      setLiveOutputDraft('');
    }
    setTranscript(flushed);
    return flushed;
  };

  const stopLiveVoiceSession = (switchToTextMode = true) => {
    liveSessionActiveRef.current = false;
    getFlushedTranscriptSnapshot();

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => undefined);
      inputCtxRef.current = null;
    }

    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => undefined);
      outputCtxRef.current = null;
    }

    stopAllAiAudioPlayback();
    setMicAudioLevel(0);
    setLiveStatus('idle');
    if (switchToTextMode) {
      setVoiceMode('text');
    }
  };

  const startLiveVoiceSession = async () => {
    if (!activeMock || !activeRoundStep) return;

    if (audioRecRef.current) {
      audioRecRef.current.cancel();
      audioRecRef.current = null;
      setRecordingTarget(null);
    }

    stopLiveVoiceSession(false);
    setVoiceMode('live');
    setLiveStatus('connecting');
    setAiBanner(null);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is unavailable in this browser. Switched to Text Mode.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }
      inputCtxRef.current = inputCtx;

      const outputCtx = new AudioContext({ sampleRate: 24000 });
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/live-interview`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'setup',
            payload: {
              mockTitle: activeMock.title,
              mockCode: activeMock.code,
              roundLabel: activeRoundStep.roundLabel,
              roundType: activeRoundStep.roundType,
              roundNumber: activeRoundStep.roundNumber,
              interviewerName: activeRoundStep.interviewer.name,
              interviewerRole: `${activeRoundStep.interviewer.role} (${activeRoundStep.interviewer.team})`,
              voiceGender: activeRoundStep.interviewer.voiceGender,
              questionPrompt: activeRoundStep.questionPrompt,
              expectedSignals: activeRoundStep.expectedSignals,
              clarifyingNotes,
              targetLevel,
              sev1Incident: activeSev1Incident || undefined,
              scratchpad,
              transcript: transcriptRef.current,
            },
          })
        );

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        const zeroGain = inputCtx.createGain();
        zeroGain.gain.value = 0;

        processor.onaudioprocess = (event) => {
          if (
            !liveSessionActiveRef.current ||
            liveMicMutedRef.current ||
            wsRef.current?.readyState !== WebSocket.OPEN
          ) {
            return;
          }

          const float32 = event.inputBuffer.getChannelData(0);
          const rms = computeRmsLevel(float32);
          const now = Date.now();
          if (now - lastLevelUpdateRef.current > 65) {
            lastLevelUpdateRef.current = now;
            setMicAudioLevel(rms);
            if (rms > 0.09) {
              setLastCandidateActivitySec(elapsedSecRef.current);
              setThinkAloudNudgeDismissed(false);
            }
          }

          const base64Audio = float32ToPcm16Base64(float32);
          wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
        };

        source.connect(processor);
        processor.connect(zeroGain);
        zeroGain.connect(inputCtx.destination);
        processorRef.current = processor;
      };

      ws.onmessage = (event) => {
        let msg: {
          type?: string;
          data?: string;
          text?: string;
          message?: string;
        };
        try {
          msg = JSON.parse(event.data as string) as typeof msg;
        } catch {
          return;
        }

        if (msg.type === 'ready') {
          liveSessionActiveRef.current = true;
          setLiveStatus('connected');
          return;
        }

        if (msg.type === 'audio' && msg.data && outputCtxRef.current && !liveSpeakerMutedRef.current) {
          const ctx = outputCtxRef.current;
          const buffer = base64Pcm16ToAudioBuffer(ctx, msg.data);
          const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
          const srcNode = ctx.createBufferSource();
          srcNode.buffer = buffer;
          srcNode.connect(ctx.destination);
          srcNode.start(startTime);
          nextStartTimeRef.current = startTime + buffer.duration;
          activeSourcesRef.current.push(srcNode);

          setIsAiSpeaking(true);
          setAiAudioLevel(computeOutputBufferRms(buffer));

          srcNode.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter((n) => n !== srcNode);
            if (activeSourcesRef.current.length === 0) {
              setIsAiSpeaking(false);
              setAiAudioLevel(0);
            }
          };
          return;
        }

        if (msg.type === 'interrupted') {
          stopAllAiAudioPlayback();
          commitLiveSpeakerBuffer('interviewer');
          return;
        }

        if (msg.type === 'inputTranscript' && msg.text) {
          if (liveOutputBufferRef.current.trim()) {
            commitLiveSpeakerBuffer('interviewer');
          }
          liveInputBufferRef.current += msg.text;
          setLiveInputDraft(liveInputBufferRef.current);
          setLastCandidateActivitySec(elapsedSecRef.current);
          return;
        }

        if (msg.type === 'outputTranscript' && msg.text) {
          if (liveInputBufferRef.current.trim()) {
            commitLiveSpeakerBuffer('candidate');
          }
          liveOutputBufferRef.current += msg.text;
          setLiveOutputDraft(liveOutputBufferRef.current);
          return;
        }

        if (msg.type === 'turnComplete') {
          commitLiveSpeakerBuffer('candidate');
          commitLiveSpeakerBuffer('interviewer');
          setNodTrigger((n) => n + 1);
          return;
        }

        if (msg.type === 'error') {
          setLiveStatus('error');
          setAiBanner({
            type: 'retry',
            message: sanitizeAiErrorMessage(msg.message, 'Live Voice session encountered an error.'),
            retryLabel: 'Reconnect Live Voice',
            retryAction: () => startLiveVoiceSession(),
          });
          stopLiveVoiceSession(true);
          return;
        }

        if (msg.type === 'closed') {
          if (liveSessionActiveRef.current) {
            stopLiveVoiceSession(true);
          }
        }
      };

      ws.onerror = () => {
        setLiveStatus('error');
        setAiBanner({
          type: 'retry',
          message: 'Live Voice WebSocket disconnected. You can continue in Text Mode or reconnect.',
          retryLabel: 'Reconnect Live Voice',
          retryAction: () => startLiveVoiceSession(),
        });
        stopLiveVoiceSession(true);
      };
    } catch (err: unknown) {
      setLiveStatus('error');
      setVoiceMode('text');
      setAiBanner({
        type: 'retry',
        message: sanitizeAiErrorMessage(
          err,
          'Microphone permission is required for Live Voice Mode. Switched to Text Mode.'
        ),
        retryLabel: 'Retry Live Voice',
        retryAction: () => startLiveVoiceSession(),
      });
    }
  };

  useEffect(() => {
    if (!activeMock) return;
    setCurrentRoundIdx(0);
  }, [activeMock?.id]);

  // Initialize state whenever the active round step changes (1 -> 6)
  useEffect(() => {
    if (!activeMock || !activeRoundStep) return;
    stopLiveVoiceSession(true);
    if (audioRecRef.current) {
      audioRecRef.current.cancel();
      audioRecRef.current = null;
      setRecordingTarget(null);
    }

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
    setAiBanner(null);
    liveInputBufferRef.current = '';
    liveOutputBufferRef.current = '';
    setLiveInputDraft('');
    setLiveOutputDraft('');

    const intro = `Hi, I am ${activeRoundStep.interviewer.name}, ${activeRoundStep.interviewer.role} on ${activeRoundStep.interviewer.team}. Welcome to ${activeRoundStep.roundLabel} of ${activeMock.code}. Before writing code or drawing diagrams, take up to 2 minutes to ask clarifying questions: ${activeRoundStep.questionPrompt}`;
    setTranscript([{ speaker: 'interviewer', text: intro }]);

    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      clearInterval(timer);
      stopLiveVoiceSession(true);
      if (audioRecRef.current) {
        audioRecRef.current.cancel();
        audioRecRef.current = null;
      }
    };
  }, [activeMock?.id, currentRoundIdx]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, liveInputDraft, liveOutputDraft, aiThinking]);

  const showThinkAloudNudge =
    gcaGateUnlocked &&
    !finalScorecard &&
    !thinkAloudNudgeDismissed &&
    elapsedSec - lastCandidateActivitySec >= 90;

  const toggleAudioTranscription = async (target: 'turn' | 'clarify') => {
    if (transcribingTarget) return;

    if (recordingTarget === target && audioRecRef.current) {
      const handle = audioRecRef.current;
      audioRecRef.current = null;
      setRecordingTarget(null);
      setTranscribingTarget(target);
      setAiBanner(null);
      try {
        const blob = await handle.stop();
        const contextHint = activeRoundStep
          ? `${activeRoundStep.roundType}: ${activeRoundStep.questionPrompt}`
          : undefined;
        const result = await transcribeAudioBlob(blob, contextHint);
        const text = result.transcript.trim();
        if (text) {
          if (target === 'clarify') {
            setClarifyingInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
          } else {
            setCandidateInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
          }
          setLastCandidateActivitySec(elapsedSecRef.current);
        } else {
          setAiBanner({
            type: 'info',
            message: 'No speech detected in the recording. Please try speaking closer to the mic.',
          });
        }
      } catch (err: unknown) {
        setAiBanner({
          type: 'retry',
          message: sanitizeAiErrorMessage(err, 'Audio transcription failed. Please try again.'),
        });
      } finally {
        setTranscribingTarget(null);
      }
      return;
    }

    if (audioRecRef.current) {
      audioRecRef.current.cancel();
      audioRecRef.current = null;
    }

    try {
      setAiBanner(null);
      const handle = await startMicRecording();
      audioRecRef.current = handle;
      setRecordingTarget(target);
    } catch (err: unknown) {
      setAiBanner({
        type: 'retry',
        message: sanitizeAiErrorMessage(
          err,
          'Microphone permission is required for Gemini Audio Transcription.'
        ),
      });
    }
  };

  const sendInterviewTurnRequest = async (
    turnTranscript: TranscriptTurn[],
    clarifyText: string,
    incidentText?: string
  ) => {
    if (!activeMock || !activeRoundStep) return;
    setAiThinking(true);
    setAiBanner(null);

    try {
      const data = await runMockInterviewTurn({
        mockTitle: activeMock.title,
        roundType: activeRoundStep.roundType,
        roundNumber: activeRoundStep.roundNumber,
        interviewerName: activeRoundStep.interviewer.name,
        interviewerRole: `${activeRoundStep.interviewer.role} (${activeRoundStep.interviewer.team})`,
        questionPrompt: activeRoundStep.questionPrompt,
        expectedSignals: activeRoundStep.expectedSignals,
        clarifyingNotes: clarifyText,
        transcript: turnTranscript,
        candidateCodeOrNotes: scratchpad,
        targetLevel,
        sev1Incident: incidentText,
        finishInterview: false,
      });
      if (data.fallbackFrom) {
        setAiBanner({
          type: 'info',
          message: `Primary model busy — interviewer responded via ${data.modelUsed}.`,
        });
      } else if (data.retried) {
        setAiBanner({
          type: 'info',
          message: `Recovered automatically on ${data.modelUsed}.`,
        });
      }
      const replyText =
        data.reply ||
        'Thanks for walking through that. Could you clarify how you handle late-arriving partitions and data skew here?';
      setTranscript((prev) => [...prev, { speaker: 'interviewer', text: replyText }]);
      setNodTrigger((n) => n + 1);
    } catch (err: unknown) {
      setAiBanner({
        type: 'retry',
        message: sanitizeAiErrorMessage(err, 'Interviewer response failed due to temporary load.'),
        retryLabel: 'Retry Turn',
        retryAction: () => sendInterviewTurnRequest(turnTranscript, clarifyText, incidentText),
      });
    } finally {
      setAiThinking(false);
    }
  };

  const handleSubmitClarifyingGate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeMock || !activeRoundStep || aiThinking) return;
    const msgText =
      clarifyingInput.trim() ||
      'Clarifying Qs: Checking scale SLA, out-of-order late arrival bounds, and key cardinality/skew assumptions before coding.';
    setClarifyingNotes(msgText);
    setGcaGateUnlocked(true);
    setLastCandidateActivitySec(elapsedSec);

    const nextTranscript: TranscriptTurn[] = [
      ...transcript,
      { speaker: 'candidate', text: `[GCA Clarifying Questions] ${msgText}` },
    ];
    setTranscript(nextTranscript);
    setClarifyingInput('');

    if (voiceMode === 'live' && liveSessionActiveRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: `The candidate submitted their GCA Clarifying Questions and unlocked the shared editor: "${msgText}". Briefly answer these constraints and invite them to start walking through their solution.`,
        })
      );
      return;
    }

    await sendInterviewTurnRequest(nextTranscript, msgText, activeSev1Incident || undefined);
  };

  const triggerSev1Incident = () => {
    if (!activeRoundStep) return;
    const candidates = SEV1_INCIDENTS.filter((inc) => inc !== activeSev1Incident);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || SEV1_INCIDENTS[0];
    setActiveSev1Incident(chosen);
    setTranscript((prev) => [...prev, { speaker: 'interviewer', text: `🚨 [LIVE SEV-1 PRODUCTION ALERT] ${chosen}` }]);

    if (voiceMode === 'live' && liveSessionActiveRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: `URGENT SEV-1 INCIDENT CURVEBALL TRIGGERED: "${chosen}". Deliver this alert to the candidate right now and ask for their first 15 minutes of triage.`,
        })
      );
    }
  };

  const handleSendTurn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeMock || !activeRoundStep || !candidateInput.trim() || aiThinking) return;

    setLastCandidateActivitySec(elapsedSec);
    setThinkAloudNudgeDismissed(false);

    const candidateTurnsCount = transcript.filter((t) => t.speaker === 'candidate').length;
    let incidentForTurn = activeSev1Incident;
    const autoDropSev1 = targetLevel === 'L5' && gcaGateUnlocked && !activeSev1Incident && candidateTurnsCount >= 1;
    if (autoDropSev1) {
      incidentForTurn = SEV1_INCIDENTS[Math.floor(Math.random() * SEV1_INCIDENTS.length)];
      setActiveSev1Incident(incidentForTurn);
    }

    const userText = candidateInput.trim();
    const nextTranscript: TranscriptTurn[] = [
      ...transcript,
      { speaker: 'candidate', text: userText },
      ...(autoDropSev1 && incidentForTurn
        ? [{ speaker: 'interviewer' as const, text: `🚨 [LIVE SEV-1 PRODUCTION ALERT] ${incidentForTurn}` }]
        : []),
    ];
    setTranscript(nextTranscript);
    setCandidateInput('');

    if (voiceMode === 'live' && liveSessionActiveRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: autoDropSev1 && incidentForTurn
            ? `Candidate response: "${userText}". Current editor buffer:\n${scratchpad || '(empty)'}\n\nRespond briefly, then immediately pivot to this SEV-1 alert: ${incidentForTurn}`
            : `Candidate typed: "${userText}". Current editor buffer:\n${scratchpad || '(empty)'}\n\nRespond concisely by voice and ask one sharp follow-up.`,
        })
      );
      return;
    }

    await sendInterviewTurnRequest(nextTranscript, clarifyingNotes, incidentForTurn || undefined);
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
    const fullTranscript = getFlushedTranscriptSnapshot();
    if (voiceMode === 'live') {
      stopLiveVoiceSession(true);
    }

    setAiThinking(true);
    setAiBanner(null);
    try {
      const data = await runMockInterviewTurn({
        mockTitle: activeMock.title,
        roundType: activeRoundStep.roundType,
        roundNumber: activeRoundStep.roundNumber,
        interviewerName: activeRoundStep.interviewer.name,
        interviewerRole: `${activeRoundStep.interviewer.role} (${activeRoundStep.interviewer.team})`,
        questionPrompt: activeRoundStep.questionPrompt,
        expectedSignals: activeRoundStep.expectedSignals,
        clarifyingNotes,
        transcript: fullTranscript,
        candidateCodeOrNotes: scratchpad,
        targetLevel,
        sev1Incident: activeSev1Incident || undefined,
        finishInterview: true,
      });
      if (!data.scorecard) throw new Error('Hiring Committee scorecard was incomplete. Click Retry Grading.');
      const card: ScorecardData = data.scorecard;
      if (data.fallbackFrom) {
        setAiBanner({
          type: 'info',
          message: `Primary model busy — Hiring Committee graded via ${data.modelUsed}.`,
        });
      }
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
        growthAreas: card.growthAreas,
        rubricScores: card.rubricScores,
      });
    } catch (err: unknown) {
      setAiBanner({
        type: 'retry',
        message: sanitizeAiErrorMessage(err, 'Hiring Committee grading failed due to temporary load.'),
        retryLabel: 'Retry Grading',
        retryAction: () => handleFinishAndGrade(),
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
            {/* Live Voice Mode vs Text Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-subtle bg-canvas text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (voiceMode !== 'live') startLiveVoiceSession();
                }}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
                  voiceMode === 'live'
                    ? 'bg-accent text-accent-contrast'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <Radio className="w-3 h-3" />
                🎙️ Live Voice Mode (Gemini Live API)
              </button>
              <button
                type="button"
                onClick={() => stopLiveVoiceSession(true)}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
                  voiceMode === 'text'
                    ? 'bg-card border border-subtle text-primary shadow-sm'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                💬 Text Mode
              </button>
            </div>
            <span className="px-3 py-1.5 rounded-lg border border-subtle bg-canvas font-mono text-xs tabular-nums flex items-center gap-1.5 text-primary">
              <Clock className="w-3.5 h-3.5 text-accent" />
              {formatTimer(elapsedSec)}
            </span>
            {voiceMode === 'live' && (
              <button
                type="button"
                onClick={() => setLiveSpeakerMuted((v) => !v)}
                title={liveSpeakerMuted ? 'Unmute Interviewer Audio' : 'Mute Interviewer Audio'}
                className="btn-tactile p-2 rounded-lg border border-subtle bg-canvas text-muted hover:text-primary hover:border-accent"
              >
                {liveSpeakerMuted ? <VolumeX className="w-4 h-4 text-[#EF4444]" /> : <Volume2 className="w-4 h-4 text-accent" />}
              </button>
            )}
            <button
              disabled={aiThinking}
              onClick={handleFinishAndGrade}
              className="btn-tactile px-3.5 py-2 rounded-lg bg-[#10B981] text-[#09090B] text-xs font-bold hover:bg-[#0EA572]"
            >
              {aiThinking ? 'Scoring...' : '✅ Finish & Score Round'}
            </button>
            <button
              onClick={() => {
                stopLiveVoiceSession(true);
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

        {/* AI Retry / Fallback Status Banner */}
        {aiBanner && (
          <div
            className={`rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs ${
              aiBanner.type === 'retry'
                ? 'border-[#EF4444]/45 bg-[#EF4444]/10 text-red-700 dark:text-[#EF4444]'
                : 'border-accent/35 bg-accent/10 text-primary'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {aiBanner.type === 'retry' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent shrink-0" />
              )}
              <span>{aiBanner.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {aiBanner.retryAction && (
                <button
                  type="button"
                  disabled={aiThinking}
                  onClick={aiBanner.retryAction}
                  className="btn-tactile px-3 py-1 rounded-md bg-accent text-accent-contrast text-[11px] font-bold hover:bg-accent-hover flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {aiBanner.retryLabel || 'Retry'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAiBanner(null)}
                className="p-1 text-muted hover:text-primary"
                aria-label="Dismiss AI banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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
          {/* Left: Distinct Specialist Interviewer Video + Live Waveform Ring + Transcript */}
          <div className="lg:col-span-5 rounded-xl border border-subtle bg-card flex flex-col max-h-[720px] overflow-hidden">
            <div className="relative p-4 bg-editor border-b border-subtle flex flex-col items-center gap-2.5">
              {/* Outer Real-Time Audio Waveform Ring Container */}
              {(() => {
                const isLiveConnected = voiceMode === 'live' && liveStatus === 'connected';
                const isLiveListening = isLiveConnected && !liveMicMuted && !isAiSpeaking;
                const activeLevel = isAiSpeaking ? aiAudioLevel : isLiveListening ? micAudioLevel : 0;
                const ringGlowPx = Math.round(14 + activeLevel * 28);
                return (
                  <div className="relative w-full max-w-[340px] flex items-center justify-center">
                    {(isAiSpeaking || isLiveListening) && (
                      <div
                        className="absolute -inset-1.5 rounded-2xl pointer-events-none transition-all duration-75"
                        style={{
                          border: isAiSpeaking
                            ? '2px solid rgba(var(--accent-rgb), 0.78)'
                            : '2px solid rgba(16, 185, 129, 0.72)',
                          boxShadow: isAiSpeaking
                            ? `0 0 ${ringGlowPx}px rgba(var(--accent-rgb), ${0.28 + activeLevel * 0.52})`
                            : `0 0 ${ringGlowPx}px rgba(16, 185, 129, ${0.22 + activeLevel * 0.45})`,
                          transform: `scale(${1 + activeLevel * 0.028})`,
                        }}
                      />
                    )}
                    <div
                      className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                        isAiSpeaking
                          ? 'border-accent'
                          : isLiveListening
                          ? 'border-[#10B981]/80'
                          : 'border-subtle'
                      }`}
                    >
                      <AnimeCharacterAvatar
                        profile={currentInterviewer}
                        isSpeaking={isAiSpeaking}
                        isLiveListening={isLiveListening}
                        audioLevel={activeLevel}
                        nodTrigger={nodTrigger}
                        size="studio"
                      />

                      {/* Live Mode Status Pill */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-20">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold backdrop-blur-md border flex items-center gap-1.5 ${
                            voiceMode === 'live'
                              ? liveStatus === 'connected'
                                ? isAiSpeaking
                                  ? 'bg-accent/25 border-accent/60 text-white'
                                  : 'bg-[#10B981]/20 border-[#10B981]/60 text-emerald-200'
                                : 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                              : 'bg-black/65 border-white/15 text-zinc-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              voiceMode === 'live'
                                ? liveStatus === 'connected'
                                  ? isAiSpeaking
                                    ? 'bg-accent animate-pulse'
                                    : 'bg-[#10B981] animate-pulse'
                                  : 'bg-amber-400 animate-pulse'
                                : 'bg-zinc-400'
                            }`}
                          />
                          {voiceMode === 'live'
                            ? liveStatus === 'connecting'
                              ? 'CONNECTING GEMINI LIVE...'
                              : isAiSpeaking
                              ? 'LIVE VOICE · SPEAKING'
                              : liveMicMuted
                              ? 'LIVE VOICE · MIC MUTED'
                              : 'LIVE VOICE · LISTENING'
                            : 'TEXT MODE · SILENT'}
                        </span>

                        {voiceMode === 'live' && liveStatus === 'connected' && (
                          <button
                            type="button"
                            onClick={() => setLiveMicMuted((m) => !m)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-md flex items-center gap-1 ${
                              liveMicMuted
                                ? 'bg-[#EF4444]/85 border-[#EF4444] text-white'
                                : 'bg-black/60 border-white/20 text-zinc-100 hover:border-accent'
                            }`}
                          >
                            {liveMicMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-[#10B981]" />}
                            {liveMicMuted ? 'Muted' : 'Mic On'}
                          </button>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3 flex items-end justify-between z-20">
                        <div>
                          <div className="text-xs font-bold text-white">{currentInterviewer.name}</div>
                          <div className="text-[10px] text-zinc-300">
                            {currentInterviewer.role} · {currentInterviewer.team}
                          </div>
                        </div>
                        {/* Real-Time Waveform Bars */}
                        <div className="flex items-end gap-0.5 h-5" aria-hidden="true">
                          {[0.42, 0.88, 0.62, 1, 0.72, 0.5, 0.84].map((weight, idx) => {
                            const barLevel = isAiSpeaking || isLiveListening ? Math.max(0.18, activeLevel) : 0;
                            const px =
                              barLevel > 0 ? Math.max(4, Math.round(weight * barLevel * 20)) : 4;
                            return (
                              <span
                                key={idx}
                                className={`w-1 rounded-full transition-all duration-75 ${
                                  isAiSpeaking
                                    ? 'bg-accent opacity-100'
                                    : isLiveListening
                                    ? 'bg-[#10B981] opacity-95'
                                    : 'bg-accent opacity-30'
                                }`}
                                style={{ height: `${px}px` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Live Call CTA inside Video Stage when in Text Mode */}
              <div className="w-full max-w-[340px] flex items-center justify-between gap-2 text-[11px]">
                {voiceMode === 'text' ? (
                  <button
                    type="button"
                    onClick={startLiveVoiceSession}
                    className="btn-tactile w-full py-1.5 px-3 rounded-lg bg-accent/15 border border-accent/45 text-accent font-semibold hover:bg-accent/25 flex items-center justify-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    🎙️ Switch to Real-Time Voice Call (Gemini Live API)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => stopLiveVoiceSession(true)}
                    className="btn-tactile w-full py-1.5 px-3 rounded-lg bg-elevated border border-subtle text-primary font-semibold hover:border-accent hover:text-accent flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    💬 Switch to Quiet Text Mode
                  </button>
                )}
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
              {liveInputDraft && (
                <div className="ml-6 p-3 rounded-lg bg-accent/10 border border-dashed border-accent/45">
                  <div className="font-semibold text-[11px] text-[#10B981] mb-1">
                    🎙️ You (Speaking live...)
                  </div>
                  <p className="text-primary/90 leading-relaxed">{liveInputDraft}</p>
                </div>
              )}
              {liveOutputDraft && (
                <div className="p-3 rounded-lg bg-canvas border border-dashed border-accent/45">
                  <div className="font-semibold text-[11px] text-accent mb-1">
                    🔊 {currentInterviewer.name} (Speaking live...)
                  </div>
                  <p className="text-primary/90 leading-relaxed">{liveOutputDraft}</p>
                </div>
              )}
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
              {voiceMode === 'text' && (
                <button
                  type="button"
                  disabled={transcribingTarget !== null}
                  onClick={() => toggleAudioTranscription('turn')}
                  title={
                    recordingTarget === 'turn'
                      ? 'Stop & Transcribe with Gemini Audio'
                      : 'Record Technical Answer (Gemini Audio Transcription)'
                  }
                  className={`btn-tactile px-2.5 py-2 rounded-lg border transition-colors flex items-center gap-1 text-[11px] font-semibold shrink-0 ${
                    recordingTarget === 'turn'
                      ? 'bg-[#EF4444] text-white border-[#EF4444]'
                      : transcribingTarget === 'turn'
                      ? 'bg-accent/20 text-accent border-accent/50'
                      : 'border-subtle text-muted hover:border-accent hover:text-primary'
                  }`}
                >
                  {recordingTarget === 'turn' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Stop
                    </>
                  ) : transcribingTarget === 'turn' ? (
                    'Transcribing...'
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      Dictate
                    </>
                  )}
                </button>
              )}
              <input
                type="text"
                value={candidateInput}
                onChange={(e) => setCandidateInput(e.target.value)}
                placeholder={
                  recordingTarget === 'turn'
                    ? 'Recording... click Stop to transcribe DE terms'
                    : voiceMode === 'live'
                    ? 'Speak aloud or send a quick text note...'
                    : 'Type or click Dictate (Gemini Transcribe)...'
                }
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
                    placeholder="Type or record 2-3 clarifying questions on data scale, out-of-order arrivals, schema edge cases, or SLAs..."
                    className="w-full h-24 rounded-lg border border-subtle bg-card text-primary p-3 text-xs focus:outline-none focus:border-accent"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={transcribingTarget !== null}
                      onClick={() => toggleAudioTranscription('clarify')}
                      className={`btn-tactile px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                        recordingTarget === 'clarify'
                          ? 'bg-[#EF4444] text-white border-[#EF4444]'
                          : 'border-subtle bg-card text-primary hover:border-accent'
                      }`}
                    >
                      {recordingTarget === 'clarify' ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop &amp; Transcribe
                        </>
                      ) : transcribingTarget === 'clarify' ? (
                        'Transcribing Audio...'
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-accent" />
                          🎙️ Speak Clarifications (Gemini Transcribe)
                        </>
                      )}
                    </button>
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
                <div className="p-3 bg-editor flex-1 min-h-[300px]">
                  <textarea
                    value={scratchpad}
                    onChange={(e) => {
                      setScratchpad(e.target.value);
                      setLastCandidateActivitySec(elapsedSec);
                    }}
                    spellCheck={false}
                    placeholder="Write SQL, Python, architecture components, capacity math, or STAR+L bullets here..."
                    className="w-full h-full min-h-[280px] bg-editor text-primary placeholder:text-muted font-mono text-xs leading-relaxed resize-none focus:outline-none p-2"
                  />
                </div>

                {sqlPreviewOutput && (
                  <pre
                    className={`p-3 border-t border-subtle bg-editor font-mono text-[11px] max-h-36 overflow-auto ${
                      sqlPreviewOutput.startsWith('❌') ? 'text-[#EF4444] animate-shake' : 'text-emerald-700 dark:text-emerald-300'
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
                      <div className="rounded-full border border-accent/60 p-0.5 bg-elevated shrink-0">
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
