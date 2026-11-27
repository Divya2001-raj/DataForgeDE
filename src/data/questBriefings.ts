import {
  GOOGLE_CLOUD_DE_QUESTS,
  QuestDefinition,
  QuestLevelDefinition,
} from './quests';
import {
  QUEST_BRIEFINGS_1_TO_3,
  QuestStudyBriefing,
} from './questBriefingsQuests1to3';
import { QUEST_BRIEFINGS_4_TO_7 } from './questBriefingsQuests4to7';

export type { QuestStudyBriefing };

export const QUEST_BRIEFINGS: Record<string, QuestStudyBriefing> = {
  ...QUEST_BRIEFINGS_1_TO_3,
  ...QUEST_BRIEFINGS_4_TO_7,
};

export interface QuestLevelContext {
  quest: QuestDefinition;
  level: QuestLevelDefinition;
}

export function findQuestContextByLevelId(levelId: string): QuestLevelContext | null {
  for (const quest of GOOGLE_CLOUD_DE_QUESTS) {
    const level = quest.levels.find((l) => l.id === levelId);
    if (level) return { quest, level };
  }
  return null;
}

export function findQuestContextByQuestionId(questionId: string): QuestLevelContext | null {
  for (const quest of GOOGLE_CLOUD_DE_QUESTS) {
    const level = quest.levels.find((l) => l.kind === 'question' && l.questionId === questionId);
    if (level) return { quest, level };
  }
  return null;
}

export function findQuestContextByMockNumber(mockNumber: number): QuestLevelContext | null {
  for (const quest of GOOGLE_CLOUD_DE_QUESTS) {
    const level = quest.levels.find((l) => l.kind === 'mock' && l.mockNumber === mockNumber);
    if (level) return { quest, level };
  }
  return null;
}

export function getQuestStudyBriefing(level: QuestLevelDefinition): QuestStudyBriefing {
  const found = QUEST_BRIEFINGS[level.id];
  if (found) return found;

  return {
    levelId: level.id,
    coreMentalModel: level.focusSummary,
    whyGoogleCloudReliesOnIt:
      'Google Cloud Consulting teams apply this foundational pattern to maintain predictable SLAs, strict governance, and low slot/compute cost at petabyte scale.',
    exampleTitle: `${level.topicTag} Applied Workflow`,
    exampleInput: `Incoming production dataset / stream scoped to ${level.topicTag}.`,
    exampleLogic: level.focusSummary,
    exampleOutput:
      'Deterministic, auditable output ready for downstream BigQuery, Dataflow, or Looker consumers.',
    implementationSteps: [
      {
        step: 'Clarify invariants & failure boundaries',
        detail: 'Pin down expected volume, latency SLA, null semantics, and schema constraints before coding.',
      },
      {
        step: 'Build the clean production core',
        detail: 'Implement modular logic using native cloud primitives and deterministic tie-breakers.',
      },
      {
        step: 'Verify edge cases & FinOps impact',
        detail: 'Validate empty/null inputs, skew behavior, and BigQuery/Dataflow resource bounds.',
      },
    ],
    clarifyingQuestions: [
      'What are the expected data volume, burst multiplier, and latency SLO?',
      'How should NULL, missing, or out-of-order records behave?',
      'What operational trade-offs matter most here (cost vs latency vs consistency)?',
    ],
    solvingStrategy: {
      baseline: 'Start with a simple, clearly stated baseline that satisfies correctness.',
      optimal: 'Refine into a scalable Google Cloud production pattern removing bottlenecks and unnecessary scans/shuffles.',
      tradeOffs: 'Explicitly compare complexity, compute/slot burn, and operational maintenance.',
    },
    commonTraps: [
      'Skipping clarifying questions before writing code or drawing components.',
      'Overlooking NULL semantics, skew keys, or schema drift edge cases.',
    ],
  };
}
