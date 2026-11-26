import { Question, TrackId } from '../../types/platform';
import { TRACKS_1_TO_4_QUESTIONS } from './tracks1to4';
import { TRACK_DSA_QUESTIONS } from './trackDsa';
import { TRACKS_5_TO_8_QUESTIONS } from './tracks5to8';
import { TRACKS_9_TO_12_QUESTIONS } from './tracks9to12';
import { TRACKS_13_TO_14_QUESTIONS } from './tracks13to14';

export const ALL_QUESTIONS: Question[] = [
  ...TRACKS_1_TO_4_QUESTIONS,
  ...TRACK_DSA_QUESTIONS,
  ...TRACKS_5_TO_8_QUESTIONS,
  ...TRACKS_9_TO_12_QUESTIONS,
  ...TRACKS_13_TO_14_QUESTIONS,
];

export const QUESTIONS_BY_TRACK: Record<TrackId, Question[]> = ALL_QUESTIONS.reduce(
  (acc, q) => {
    acc[q.trackId].push(q);
    return acc;
  },
  {
    concepts: [],
    sql: [],
    python: [],
    dsa: [],
    pyspark: [],
    snowflake: [],
    databricks: [],
    cloud: [],
    geospatial: [],
    modeling: [],
    sysdesign: [],
    genai: [],
    mlfeatures: [],
    dataops: [],
    behavioral: [],
  } as Record<TrackId, Question[]>
);

export const ALL_CONCEPT_NAMES: string[] = Array.from(
  new Set(ALL_QUESTIONS.map((q) => q.concept))
).sort();

export const ALL_COMPANIES: string[] = Array.from(
  new Set(ALL_QUESTIONS.map((q) => q.company))
).sort();
