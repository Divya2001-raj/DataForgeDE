import { DailyPulseItem } from '../types/platform';

const CURATED_PULSES: Array<Omit<DailyPulseItem, 'dateKey'>> = [
  {
    quote: 'Data pipelines rarely fail on the happy path; they break silently on schema drift, skewed hot keys, and clocks running backwards.',
    quoteAuthor: 'Google Cloud Architecture Principle',
    warStoryTitle: 'The $42k Nightly BigQuery Full-Scan Bug',
    warStoryFact: 'Wrapping a partitioned `event_date` column inside `DATE(TIMESTAMP(event_ts))` in a WHERE clause disabled partition pruning on a 14TB/day retail table—fixing the predicate cut daily scan bytes by 98.4%.',
    topicName: 'BigQuery Slot Reservations & Clustering',
    topicBullets: {
      what: 'Keep partition and cluster columns bare on one side of comparison operators (`event_date >= "2026-01-01"`) so query engines skip irrelevant storage blocks.',
      why: 'Both BigQuery and Snowflake store min/max micro-partition metadata; non-sargable functions force full-table scans.',
      trap: 'Applying `COALESCE(partition_col, ...)` or `FORMAT_DATE(...)` inside JOIN/WHERE conditions silently destroys pruning.',
    },
  },
  {
    quote: 'Idempotency is the difference between a pipeline that self-heals on retry and one that silently doubles financial revenue.',
    quoteAuthor: 'Martin Kleppmann · Designing Data-Intensive Applications',
    warStoryTitle: 'Why At-Least-Once Pub/Sub Duplicated 1.8M Orders',
    warStoryFact: 'A Cloud Dataflow job checkpoint stalled at 59s; Pub/Sub redelivered un-acked messages while an append-only BigQuery sink wrote duplicate rows until MERGE deduplication keys were added.',
    topicName: 'dbt Incremental & Snapshots',
    topicBullets: {
      what: 'Guaranteeing that running the same pipeline batch N times yields the exact same warehouse state as running it once.',
      why: 'Distributed runners (Spark, Dataflow, Airflow) guarantee at-least-once task retries—never rely on single delivery.',
      trap: 'Using `CURRENT_TIMESTAMP()` or random UUIDs inside transformation keys breaks deterministic partition overwrites.',
    },
  },
  {
    quote: 'Know your table grain before writing the first JOIN, or subtle many-to-many fan-outs will quietly inflate every KPI.',
    quoteAuthor: 'Ralph Kimball · The Data Warehouse Toolkit',
    warStoryTitle: 'The SCD Type 2 Overlapping Interval Fan-Out',
    warStoryFact: 'A late-arriving banking dimension update created two rows with `is_current = 1` for the same customer_id, multiplying fact table revenue by 2x for 12% of enterprise accounts.',
    topicName: 'SCD Type 2 & Bi-Temporal Modeling',
    topicBullets: {
      what: 'Preserve historical dimension snapshots using surrogate keys (`SK`) and half-open validity intervals `[effective_from, effective_to)`.',
      why: 'Enables accurate point-in-time attribution (e.g., customer tier at exact checkout timestamp) without mutating past facts.',
      trap: 'Using `NULL` for open-ended `effective_to` instead of `9999-12-31` creates bug-prone `COALESCE` range joins.',
    },
  },
  {
    quote: 'Never confuse processing time with event time when mobile devices go offline in elevators and subways.',
    quoteAuthor: 'Tyler Akidau · Streaming Systems',
    warStoryTitle: 'Lost Telemetry During Tunnel Rides',
    warStoryFact: 'A delivery fleet emitted GPS pings delayed by 18 minutes after network reconnect; fixed 5-minute processing windows dropped 11% of drop-off events until event-time watermarks + allowed lateness were configured.',
    topicName: 'Kafka Exactly-Once & Watermarking',
    topicBullets: {
      what: 'A monotonic heuristic tracking how far event-time progress has caught up to real time before emitting window aggregations.',
      why: 'Balances result completeness against p99 streaming latency in Apache Beam, Google Dataflow, and Flink.',
      trap: 'Setting `allowedLateness = 0` drops delayed mobile bursts; route post-watermark arrivals to a side-output DLQ.',
    },
  },
  {
    quote: 'A single skewed join key can turn a 200-executor Spark cluster into a single-threaded bottleneck.',
    quoteAuthor: 'Spark Performance Engineering Rule',
    warStoryTitle: 'The Null `user_id` Straggler at 99%',
    warStoryFact: 'An e-commerce clickstream join hung at 199/200 Spark tasks for 2 hours because unauthenticated visitors shared `user_id = NULL`, spilling 480GB to one executor disk.',
    topicName: 'Shuffle & Skew Mitigation',
    topicBullets: {
      what: 'Breaking hot keys via two-stage salting (`concat(key, "_", rand() % K)`), pre-filtering NULLs, or Broadcast Hash Joins.',
      why: 'Eliminates network shuffle imbalance and executor OOMs on power-law distributions.',
      trap: 'Enabling Adaptive Query Execution (AQE) helps skew joins, but `COUNT(DISTINCT)` on skewed keys still requires two-phase salting.',
    },
  },
  {
    quote: 'In enterprise RAG, retrieval accuracy is an indexing and metadata ACL problem long before it is a prompt engineering problem.',
    quoteAuthor: 'Google Cloud Applied AI Consulting',
    warStoryTitle: 'The Cross-Tenant Leak via Post-Filtering',
    warStoryFact: 'Fetching Top-10 vector neighbors globally and filtering user permissions afterwards returned 0 results for restricted staff—switching to pre-filtered tenant metadata namespaces fixed recall & security.',
    topicName: 'Hybrid RAG & Vector Chunking',
    topicBullets: {
      what: 'Combining sparse lexical matching (BM25) with dense semantic embeddings via Reciprocal Rank Fusion (RRF) and pre-filtered RBAC metadata.',
      why: 'Dense vectors alone miss exact SKUs, error codes, and SQL table names.',
      trap: 'Re-embedding entire 20M-doc corpora on every nightly cron instead of content-hash incremental delta indexing.',
    },
  },
  {
    quote: 'Point-in-time feature correctness protects ML models from achieving 99% AUC in staging and 52% accuracy in production.',
    quoteAuthor: 'Feast / Vertex Feature Store Playbook',
    warStoryTitle: 'The Future-Knowledge Churn Feature',
    warStoryFact: 'Joining training labels to a static `dim_customer` snapshot leaked post-cancellation support tickets into pre-churn features—an ASOF temporal join eliminated leakage.',
    topicName: 'Feast Online/Offline Feature Store',
    topicBullets: {
      what: 'Using `ASOF` / `<= event_ts` lookups so training rows only observe feature values valid strictly before prediction time.',
      why: 'Prevents target leakage and guarantees online-offline feature parity between BigQuery and Redis/Vertex.',
      trap: 'Using `BETWEEN` without tie-breaking when two feature updates land inside the same millisecond.',
    },
  },
];

export function getDailyPulseForDate(date: Date = new Date()): DailyPulseItem {
  const iso = date.toISOString().slice(0, 10);
  const dayNum = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const item = CURATED_PULSES[Math.abs(dayNum) % CURATED_PULSES.length];
  return {
    dateKey: iso,
    ...item,
  };
}
