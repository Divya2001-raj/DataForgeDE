import { ConceptGuide } from '../types/platform';

export const CONCEPT_GUIDES: Record<string, ConceptGuide> = {
  'SCD Type 2 & Bi-Temporal Modeling': {
    name: 'SCD Type 2 & Bi-Temporal Modeling',
    category: 'Dimensional Modeling',
    summary: 'Preserves full historical attribute versions in dimension tables using surrogate keys, effective_from/effective_to validity windows, and is_current flags—ensuring historical facts join to the attribute state valid at event time.',
    mentalModel: 'Treat every dimension change as an immutable time-bounded interval [valid_from, valid_to). Never overwrite history in place; close the previous row and insert a new version with a new surrogate key.',
    internals: [
      'Surrogate key (SK) uniquely identifies one version of a natural key (NK).',
      'Point-in-time joins match fact.event_ts BETWEEN dim.effective_from AND dim.effective_to.',
      'Bi-temporal models add system_from/system_to alongside business valid_from/valid_to to handle retroactive corrections.',
      'Use HASHDIFF (SHA-256 of tracked columns) in dbt snapshots / MERGE jobs to detect changes in O(1) comparison.',
    ],
    tradeOffs: [
      { optionA: 'SCD Type 2', optionB: 'SCD Type 1', whenToChoose: 'Choose Type 2 for auditable historical attribution (e.g., customer tier at purchase time); Type 1 for typo fixes.' },
      { optionA: 'Point-in-time range join', optionB: 'Fact-stored SK at load time', whenToChoose: 'Store SK in fact during ETL for fast star joins; use range join when backfilling late-arriving dimensions.' },
    ],
    pitfalls: [
      'Overlapping intervals from non-atomic MERGE causing fan-out multiplication in fact joins.',
      'Using NULL instead of 9999-12-31 for open-ended effective_to, forcing COALESCE in every join.',
      'Forgetting late-arriving facts that predate the earliest dimension version.',
    ],
    codeExample: `SELECT o.order_id, c.tier AS tier_at_order_time, o.amount
FROM orders o
JOIN customers c
  ON o.customer_id = c.customer_id
 AND o.order_ts >= c.effective_from
 AND o.order_ts <= c.effective_to;`,
    asciiDiagram: `NK: 101 | SK: 5001 | Tier: Gold     | [2025-01-01 .. 2026-03-14] | is_current=0
NK: 101 | SK: 5002 | Tier: Platinum | [2026-03-15 .. 9999-12-31] | is_current=1`,
  },
  'Window Frames & Sessionization': {
    name: 'Window Frames & Sessionization',
    category: 'SQL & Query Tuning',
    summary: 'Computes ordered analytics across partitions without collapsing rows, enabling running totals, sliding 7-day metrics, gap-and-island grouping, and inactivity-based user sessionization.',
    mentalModel: 'Sessionization is a two-pass window pattern: LAG() detects gaps exceeding the timeout threshold (1 if new session, 0 otherwise), and cumulative SUM() over those flags mints monotonic session IDs.',
    internals: [
      'ROWS BETWEEN N PRECEDING AND CURRENT ROW counts physical rows; RANGE BETWEEN INTERVAL ... evaluates logical key values.',
      'Always specify explicit frame clauses when using LAST_VALUE()—default frame stops at CURRENT ROW!',
      'QUALIFY filters window results directly in BigQuery/Snowflake/DuckDB without needing an outer subquery.',
    ],
    tradeOffs: [
      { optionA: 'ROWS BETWEEN', optionB: 'RANGE BETWEEN', whenToChoose: 'Use ROWS for fixed row counts; RANGE for time-gap windows with duplicate timestamps.' },
      { optionA: 'Window Deduplication', optionB: 'GROUP BY + ANY_VALUE', whenToChoose: 'Use ROW_NUMBER() = 1 when deterministic tie-breaking on updated_at is mandatory.' },
    ],
    pitfalls: [
      'Leaving PARTITION BY empty on large tables forces all rows onto a single worker.',
      'Assuming LAST_VALUE() sees the whole partition without UNBOUNDED FOLLOWING.',
    ],
    codeExample: `WITH flagged AS (
  SELECT user_id, event_ts,
    CASE WHEN julianday(event_ts) - julianday(LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts)) > (30.0/1440.0)
         OR LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts) IS NULL
         THEN 1 ELSE 0 END AS is_new_session
  FROM ad_impressions
)
SELECT user_id, event_ts,
       SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY event_ts) AS session_seq
FROM flagged;`,
    asciiDiagram: `Event Ts:  10:00  --(+12m)-->  10:12  --(+53m > 30m!)-->  11:05
New Flag:    1                    0                            1
SessionID:   1                    1                            2`,
  },
  'Shuffle & Skew Mitigation': {
    name: 'Shuffle & Skew Mitigation',
    category: 'PySpark & Distributed Compute',
    summary: 'Eliminates straggler tasks and Out-Of-Memory failures in Spark/BigQuery/Dataflow when hot keys (e.g., null user_id, bot IPs, top merchant) overload a single partition during wide transformations.',
    mentalModel: 'Wide transformations (groupBy, join, distinct) hash-partition keys across the network. If 1 key holds 40% of rows, 199 executors sit idle while 1 spills to disk. Break hot keys with salting or broadcast the small side.',
    internals: [
      'Broadcast Hash Join eliminates shuffle completely when the smaller table fits below spark.sql.autoBroadcastJoinThreshold.',
      'AQE (spark.sql.adaptive.skewJoin.enabled) splits skewed partitions dynamically at runtime based on shuffle file statistics.',
      'Manual Key Salting appends a random suffix (0..K-1) to skewed keys on the big table and explodes the small table K times.',
    ],
    tradeOffs: [
      { optionA: 'Broadcast Join', optionB: 'Salted Sort-Merge Join', whenToChoose: 'Broadcast when dimension < 100MB; Salt when both tables are multi-terabyte and skewed.' },
      { optionA: 'Two-Stage Salted Aggregation', optionB: 'Single groupBy', whenToChoose: 'Use partial salted agg -> strip salt -> final agg when cardinality of one group is millions of rows.' },
    ],
    pitfalls: [
      'Broadcasting a growing table without size checks causes Driver OOM.',
      'Forgetting to filter NULL join keys before salting still concentrates nulls on one task.',
    ],
    codeExample: `from pyspark.sql import functions as F
# Stage 1: Salt key across 16 buckets
salted = df.withColumn("salt", (F.rand() * 16).cast("int"))
partial = salted.groupBy("merchant_id", "salt").agg(F.sum("amount").alias("partial_amt"))
# Stage 2: Final reduce
final_df = partial.groupBy("merchant_id").agg(F.sum("partial_amt").alias("total_amt"))`,
    asciiDiagram: `Hot Key 'NULL/VIP' -> [Partition 0: 98GB OOM!]
After 4x Salting  -> [P0: 24GB] [P1: 25GB] [P2: 24GB] [P3: 25GB]`,
  },
  'Delta Lake ACID & Liquid Clustering': {
    name: 'Delta Lake ACID & Liquid Clustering',
    category: 'Databricks & Lakehouse',
    summary: 'Brings serializable/write-serializable ACID transactions to cloud object storage (S3/GCS/ADLS) via an append-only _delta_log JSON commit trail, Parquet checkpoints, and multi-dimensional Liquid Clustering.',
    mentalModel: 'Data files in Parquet are immutable. State changes are atomic JSON entries in _delta_log/0000N.json listing "add" and "remove" file actions, enabling time travel and optimistic concurrency control.',
    internals: [
      'Every 10 commits (configurable), Delta writes a Parquet checkpoint summarizing active files so readers skip scanning thousands of JSONs.',
      'Liquid Clustering (CLUSTER BY) replaces rigid Hive-style directory partitioning + Z-ORDER, adapting incrementally without full table rewrites.',
      'Deletion Vectors mark deleted rows in roaring bitmaps instead of rewriting entire 1GB Parquet files on single-row GDPR deletes.',
    ],
    tradeOffs: [
      { optionA: 'Liquid Clustering', optionB: 'Hive Partitioning + Z-Order', whenToChoose: 'Use Liquid Clustering for evolving query patterns and avoiding small-file explosion across high-cardinality keys.' },
      { optionA: 'Deletion Vectors (MoR)', optionB: 'Copy-on-Write', whenToChoose: 'Deletion Vectors win for frequent MERGE/UPDATE/DELETE; CoW wins for pure append + heavy scan.' },
    ],
    pitfalls: [
      'Running VACUUM RETAIN 0 HOURS breaks concurrent readers and destroys time-travel history.',
      'Over-partitioning by user_id or minute creates millions of tiny Parquet files and metadata bottlenecks.',
    ],
    codeExample: `CREATE TABLE lakehouse.gold_orders (
  order_id BIGINT,
  customer_id BIGINT,
  order_date DATE,
  amount DECIMAL(12,2)
) USING DELTA
CLUSTER BY (order_date, customer_id);`,
    asciiDiagram: `_delta_log/00001.json -> { add: part-001.parquet, min/max stats }
_delta_log/00002.json -> { remove: part-001, add: part-002 (OPTIMIZE) }`,
  },
  'Snowflake Micro-Partitions & Cortex AI': {
    name: 'Snowflake Micro-Partitions & Cortex AI',
    category: 'Snowflake & Cloud Warehouses',
    summary: 'Columnar immutable 50–500MB compressed micro-partitions paired with automatic cloud-services metadata min/max pruning, Dynamic Tables for declarative pipelines, and native Cortex AI SQL inference.',
    mentalModel: 'Snowflake separates Cloud Services (optimizer + micro-partition metadata) from stateless Virtual Warehouses (compute) and shared object storage. Fast queries skip 99% of micro-partitions before touching compute.',
    internals: [
      'Each micro-partition stores min/max/NDV/null-count per column in the Metadata Store.',
      'Applying functions to clustered columns (e.g. DATE_TRUNC(\'day\', ts) = ...) disables pruning unless written as a range predicate.',
      'Cortex AI exposes SNOWFLAKE.CORTEX.COMPLETE, EMBED_TEXT_768, and Cortex Search directly inside SQL without moving governed data outside Snowflake.',
    ],
    tradeOffs: [
      { optionA: 'Dynamic Tables', optionB: 'Streams + Tasks', whenToChoose: 'Dynamic Tables for declarative TARGET_LAG incremental transforms; Streams+Tasks for imperative multi-step branching.' },
      { optionA: 'Automatic Clustering', optionB: 'Search Optimization Service', whenToChoose: 'Clustering for range scans on dates/timestamps; Search Optimization for selective point lookups (WHERE id = X).' },
    ],
    pitfalls: [
      'Wrapping predicate columns in CAST() or TO_CHAR() breaks micro-partition pruning.',
      'Keeping AUTO_SUSPEND too high burns credits on idle virtual warehouses.',
    ],
    codeExample: `SELECT ticket_id,
       SNOWFLAKE.CORTEX.SENTIMENT(body) AS sentiment_score,
       SNOWFLAKE.CORTEX.SUMMARIZE(body) AS executive_summary
FROM support_tickets
WHERE created_at >= DATEADD('day', -7, CURRENT_TIMESTAMP());`,
    asciiDiagram: `Cloud Services (Pruning via Min/Max) -> Virtual Warehouse (Stateless Cache) -> S3/GCS Micro-Partitions`,
  },
  'S2 & H3 Spatial Indexing': {
    name: 'S2 & H3 Spatial Indexing',
    category: 'Geospatial & Petabyte Scale',
    summary: 'Maps 2D lat/lon coordinates into hierarchical 64-bit integer cell IDs (Uber H3 hexagons or Google S2 Hilbert curves) so spatial proximity joins reduce from O(N×M) polygon scans to O(N) integer equijoins.',
    mentalModel: 'Geospatial polygons are expensive to intersect at petabyte scale. Convert coordinates to H3/S2 cell IDs at an appropriate resolution; neighbor lookups become kRing integer set checks.',
    internals: [
      'Google S2 projects the sphere onto a cube and uses a Hilbert space-filling curve so nearby 2D points share nearby 1D 64-bit integers.',
      'Uber H3 partitions the globe into hexagons where every neighbor center is equidistant (unlike squares which have corner distortion).',
      'BigQuery GEOGRAPHY functions use S2 indexing internally when clustering tables by a GEOGRAPHY column.',
    ],
    tradeOffs: [
      { optionA: 'Uber H3 (Hexagons)', optionB: 'Google S2 (Quad/Hilbert)', whenToChoose: 'H3 for uniform radial distance, surge pricing grids, and k-ring smoothing; S2 for exact hierarchical containment and BigQuery native clustering.' },
    ],
    pitfalls: [
      'Choosing resolution too fine (e.g. H3 res 12) explodes key cardinality; too coarse (res 5) causes hot-spot skew in dense cities.',
      'Using Euclidean distance sqrt(dx^2+dy^2) instead of Haversine/ST_DISTANCE near high latitudes.',
    ],
    codeExample: `-- BigQuery S2 Geospatial Clustering + Boundary Filter
SELECT z.zone_name, COUNT(*) AS pickups
FROM trips t
JOIN zones z ON ST_CONTAINS(z.boundary_geog, ST_GEOGPOINT(t.lon, t.lat))
GROUP BY 1;`,
    asciiDiagram: `(lat, lon) -> [H3 Cell 8860145b03fffff] -> Equijoin / Partition Key -> kRing(cell, 1)`,
  },
  'Hybrid RAG & Vector Chunking': {
    name: 'Hybrid RAG & Vector Chunking',
    category: 'GenAI & LLM Data Engineering',
    summary: 'Combines semantic dense vector search (HNSW/ScaNN) with lexical sparse search (BM25/TF-IDF) via Reciprocal Rank Fusion (RRF), backed by deterministic parent-child chunking and ACL-aware incremental ingestion.',
    mentalModel: 'Dense embeddings excel at paraphrased meaning but miss exact error codes, SKUs, and table names; BM25 nails exact tokens. Fusing both with RRF and reranking recovers both precision and recall.',
    internals: [
      'Reciprocal Rank Fusion: RRF(d) = sum(1 / (k + rank_i(d))) with k=60 normalizes incompatible cosine and BM25 scores.',
      'Incremental RAG pipelines compute content hashes per document section so edits only re-embed changed chunks, avoiding full corpus cost.',
      'Metadata pre-filtering (tenant_id, acl_groups, effective_date) must run inside the vector index scan to prevent empty post-filter top-K results.',
    ],
    tradeOffs: [
      { optionA: 'Fixed Token Chunking', optionB: 'Structure-Aware / Semantic Chunking', whenToChoose: 'Structure-aware (Markdown headers/AST/tables) preserves context boundaries; fixed overlap is fallback for raw text.' },
      { optionA: 'HNSW In-Memory', optionB: 'ScaNN / DiskANN', whenToChoose: 'HNSW for <10M vectors ultra-low latency; ScaNN/IVF-PQ for billion-scale quantized cost efficiency.' },
    ],
    pitfalls: [
      'Chunking tables mid-row destroys numeric grounding and causes LLM hallucinations.',
      'Enforcing document ACL permissions after top-K retrieval leaks existence or leaves 0 results.',
    ],
    codeExample: `SELECT chunk_id,
       (1.0 / (60 + RANK() OVER (ORDER BY cosine_score DESC))) +
       (1.0 / (60 + RANK() OVER (ORDER BY bm25_score DESC))) AS rrf_score
FROM retrieval_logs
ORDER BY rrf_score DESC
LIMIT 5;`,
    asciiDiagram: `Query -> [Dense Embed + ScaNN] + [Sparse BM25] -> RRF Fusion -> Cross-Encoder Rerank -> Grounded Context`,
  },
  'Kafka Exactly-Once & Watermarking': {
    name: 'Kafka Exactly-Once & Watermarking',
    category: 'Streaming & System Design',
    summary: 'Guarantees end-to-end deterministic state in unbounded event streams using Kafka idempotent producers, transactional offsets, event-time watermarks, and allowed lateness triggers.',
    mentalModel: 'Processing time lies whenever mobile clients go offline. Event-time windowing tracks a moving Watermark W(t) estimating when all events <= t have arrived, routing late stragglers to side outputs.',
    internals: [
      'Kafka EOS combines enable.idempotence=true (PID + sequence number) with two-phase commit transactional coordinator across consumer offsets and sink writes.',
      'In Apache Flink / Beam, Chandy-Lamport checkpoint barriers align operator state snapshots to RocksDB without stopping the stream.',
      'Idempotent sinks (UPSERT by event_id or deterministic partition overwrite) decouple correctness from transport retries.',
    ],
    tradeOffs: [
      { optionA: 'At-Least-Once + Idempotent Sink', optionB: 'Distributed 2PC EOS', whenToChoose: 'Idempotent sink is simpler and higher throughput for BigQuery/Delta merges; 2PC EOS for Kafka-to-Kafka stateful chains.' },
    ],
    pitfalls: [
      'Setting watermark delay too tight drops valid mobile offline events; too loose bloats RocksDB state TTL.',
      'Partitioning Kafka solely by country causes hot partitions; compound with user_id or session_id.',
    ],
    codeExample: `Watermark = max_observed_event_time - allowed_out_of_orderness (e.g. 5 min)
If event.ts < Watermark -> Route to SideOutput('late_events_dlq')`,
    asciiDiagram: `Producer (Idempotent) -> Kafka Partition -> Flink/Dataflow (RocksDB Checkpoint + Watermark) -> Iceberg/BQ MERGE`,
  },
  'BigQuery Slot Reservations & Clustering': {
    name: 'BigQuery Slot Reservations & Clustering',
    category: 'Multi-Cloud & GCP',
    summary: 'Controls petabyte-scale BigQuery latency and FinOps cost using ingestion/column partitioning, multi-column clustering, materialized views, and Capacity Autoscaling Slot Reservations.',
    mentalModel: 'Partitioning splits a table into coarse physical segments (usually by DATE) to cap scanned bytes; Clustering sorts rows inside each partition by up to 4 columns to enable fine-grained block pruning.',
    internals: [
      'BigQuery Capacitor columnar storage stores zone maps (min/max) per storage block; clustering groups identical keys together so blocks are skipped.',
      'Editions Autoscaling allocates baseline slots + burst slots billed per second (1-minute minimum) to handle morning BI spikes without paying 24/7.',
      'BI Engine caches hot columns in vectorized RAM for sub-second Looker dashboards.',
    ],
    tradeOffs: [
      { optionA: 'On-Demand ($/TB scanned)', optionB: 'Capacity Editions (Slots)', whenToChoose: 'On-Demand for spiky ad-hoc exploration; Capacity Slots for predictable high-volume ETL + BI concurrency.' },
    ],
    pitfalls: [
      'SELECT * on wide tables negates columnar pruning even with partitioning.',
      'Partitioning by high-cardinality STRING or creating >10,000 partitions hits BigQuery partition limits.',
    ],
    codeExample: `CREATE TABLE analytics.fact_billing
PARTITION BY DATE(usage_date)
CLUSTER BY project_id, service
OPTIONS (require_partition_filter = TRUE)
AS SELECT * FROM raw.gcp_billing_export;`,
    asciiDiagram: `Query -> Partition Pruning (Date) -> Capacitor Block Pruning (Cluster Keys) -> Shuffle Slots -> Result`,
  },
  'Feast Online/Offline Feature Store': {
    name: 'Feast Online/Offline Feature Store',
    category: 'ML Feature Engineering',
    summary: 'Eliminates training-serving skew by computing feature transformations once and serving point-in-time historical snapshots from BigQuery/Parquet for training alongside <10ms Redis/Bigtable lookups for inference.',
    mentalModel: 'Never join training labels to current feature values—that leaks future information. Point-in-time ASOF joins attach the latest feature value recorded strictly BEFORE the label timestamp.',
    internals: [
      'Offline Store (BigQuery / Snowflake / Iceberg) stores full time-series feature history for reproducible training datasets.',
      'Online Store (Redis / Bigtable / DynamoDB) stores only the latest materialized feature vector per entity key.',
      'On-demand feature views compute lightweight request-time transforms (e.g., distance between user_lat/lon and merchant_lat/lon) consistently in both paths.',
    ],
    tradeOffs: [
      { optionA: 'Pre-computed Batch Materialization', optionB: 'Streaming + On-Demand Features', whenToChoose: 'Batch for 30-day aggregates; Streaming (Flink/Dataflow) for 5-minute fraud velocity counters.' },
    ],
    pitfalls: [
      'Data leakage from joining feature_ts > label_ts during model training.',
      'Mismatch between Python Pandas training logic and Java/Go serving logic.',
    ],
    codeExample: `-- Point-in-time ASOF lookup
SELECT l.entity_id, l.label_ts, f.tx_count_1h
FROM labels l
ASOF JOIN user_features f
  ON l.entity_id = f.entity_id
 AND l.label_ts >= f.feature_ts;`,
    asciiDiagram: `Stream/Batch Source -> Feature Transform -> [Offline Store: BigQuery] + [Online Store: Bigtable <10ms]`,
  },
  'dbt Incremental & Snapshots': {
    name: 'dbt Incremental & Snapshots',
    category: 'DataOps & Orchestration',
    summary: 'Structures modular SQL transformations with Git-versioned lineage, contract tests, incremental merge/insert_overwrite materializations, and automated SCD Type 2 snapshots.',
    mentalModel: 'An incremental model processes only new or updated records using is_incremental(), reducing a 4-hour full table rebuild into a 90-second partition replacement.',
    internals: [
      'insert_overwrite (BigQuery/Spark) replaces entire target partitions atomically, making retries idempotent without expensive row-level MERGE scans.',
      'merge strategy matches unique_key to update changed rows and insert new ones—always include a partition filter on incremental_predicates to prevent full-table scans.',
      'Model Contracts enforce column names and types at build time so upstream breaking changes fail CI before reaching BI.',
    ],
    tradeOffs: [
      { optionA: 'insert_overwrite', optionB: 'merge', whenToChoose: 'insert_overwrite for append/partition-scoped event tables; merge for mutable entity tables with late updates across many dates.' },
    ],
    pitfalls: [
      'Forgetting lookback window (e.g. -3 days) drops late-arriving events.',
      'Running dbt merge without incremental_predicates scans the entire multi-TB target table.',
    ],
    codeExample: `{{ config(
  materialized='incremental',
  incremental_strategy='insert_overwrite',
  partition_by={'field': 'order_date', 'data_type': 'date'}
) }}
SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
  WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}`,
    asciiDiagram: `Source -> Staging (Views) -> Intermediate -> Marts (Incremental Partitioned) -> Schema Contracts + Tests`,
  },
  'Googleyness & Ambiguity Navigation': {
    name: 'Googleyness & Ambiguity Navigation',
    category: 'Behavioral & Cloud Consulting',
    summary: 'Demonstrates structured problem decomposition under ambiguous client requirements, blameless incident ownership, bias-to-action with data-driven trade-offs, and inclusive cross-functional leadership.',
    mentalModel: 'Use STAR+L (Situation, Task, Action, Result with concrete metrics, and Learnings/Retrospective). In Google Cloud Consulting, interviewers probe how you align client executives when scope, budget, and SLAs conflict.',
    internals: [
      'Clarify ambiguity upfront: define SLA, RPO/RTO, data volume, compliance (DPDP/GDPR), and team skill constraints before proposing tech.',
      'Own failures transparently: describe blameless root cause, immediate mitigation, and systemic guardrail added.',
      'Show collaborative influence without authority across Product, ML Scientists, and client Infra teams.',
    ],
    tradeOffs: [
      { optionA: 'Pragmatic Managed MVP (BigQuery + dbt)', optionB: 'Over-Engineered Custom K8s + Flink', whenToChoose: 'Always tie architectural complexity to actual client latency, team maturity, and TCO.' },
    ],
    pitfalls: [
      'Saying "we" exclusively without clarifying your personal technical ownership.',
      'Blaming stakeholders or teammates instead of showing alignment and empathy.',
    ],
    codeExample: `STAR+L Blueprint:
S: Legacy Oracle nightly batch missed 6AM SLA by 3h during festival peaks.
T: Re-architect for <15min freshness within flat cloud budget.
A: Led 3 engineers to build CDC -> Pub/Sub -> BigQuery + dbt incremental.
R: Cut latency 92% (4h -> 12m), saved $18k/mo, zero P1 incidents in 9 months.`,
    asciiDiagram: `Ambiguity -> Align Constraints -> Compare Trade-offs -> Execute + Measure -> Blameless Learnings`,
  },
  'BI Semantic Layers & Operational Data Quality SLAs': {
    name: 'BI Semantic Layers & Operational Data Quality SLAs',
    category: 'Operational Dashboards & BI',
    summary: 'Powers sub-second Looker operational dashboards over petabyte ingestion pipelines by pairing BigQuery Materialized Views, vectorized BI Engine RAM caching, governed LookML/MetricFlow semantic layers, and explicit freshness/completeness/anomaly SLO contracts.',
    mentalModel: 'Never point BI dashboards directly at raw multi-TB event tables. Pre-aggregate hot KPI grains into partition-aligned Materialized Views, pin conformed lookup dimensions inside BigQuery BI Engine memory, and measure pipeline trust through four core operational SLIs: Freshness Lag, Completeness %, Throughput (tiles/sec), and Anomaly Rate.',
    internals: [
      'BigQuery Materialized Views support automatic query rewrite—even queries hitting base tables transparently reroute to MV delta summaries.',
      'BI Engine reserves vectorized RAM cache per project/region so Looker tile/SLA filters execute in <250ms without spinning heavy slot pools.',
      'Operational DQ contracts separate hard pipeline circuit-breakers (schema/null violations -> quarantine) from soft SLO burn alerts (completeness < 99.5%).',
    ],
    tradeOffs: [
      { optionA: 'BigQuery Materialized Views + BI Engine', optionB: 'Scheduled dbt Rollup Tables', whenToChoose: 'Use MVs + BI Engine when base tables append continuously and dashboards require near-real-time consistency; use dbt rollup tables for complex multi-table window joins unsupported by incremental MVs.' },
      { optionA: 'LookML / MetricFlow Semantic Layer', optionB: 'Dashboard-Embedded Custom SQL', whenToChoose: 'Always centralize SLA/anomaly/revenue formulas in the semantic layer so Finance, Ops, and Engineering dashboards never diverge.' },
    ],
    pitfalls: [
      'Using non-deterministic functions (CURRENT_TIMESTAMP()) or unsupported outer joins inside BigQuery MVs silently disables incremental refresh.',
      'Exceeding BI Engine RAM reservation causes silent fallback to slower BigQuery on-demand/slot execution.',
    ],
    codeExample: `SELECT p.pipeline_name,
  ROUND(AVG(r.freshness_lag_min), 2) AS avg_lag_min,
  ROUND(100.0 * SUM(r.valid_tiles) / NULLIF(SUM(r.expected_tiles), 0), 2) AS completeness_pct,
  ROUND(100.0 * SUM(r.corrupt_tiles) / NULLIF(SUM(r.expected_tiles), 0), 2) AS anomaly_rate_pct
FROM tile_ingestion_runs r
JOIN pipeline_sla_targets p ON r.pipeline_id = p.pipeline_id
GROUP BY 1;`,
    asciiDiagram: `Tile Runs -> BigQuery Partitioned Fact -> Incremental MV -> BI Engine RAM -> Looker Semantic Layer`,
  },
  'GCP Consulting Migrations & Stakeholder Discovery': {
    name: 'GCP Consulting Migrations & Stakeholder Discovery',
    category: 'Google Cloud Consulting',
    summary: 'Structured methodology for migrating legacy Apache Flume, Hadoop/HDFS, and on-prem enterprise warehouses to BigQuery & Cloud Dataflow—combining dual-write/shadow-run reconciliation, reversible cutover gates, FinOps + carbon-aware region choices, and non-technical stakeholder alignment.',
    mentalModel: 'Cloud migrations fail from metric drift and stakeholder surprises, not syntax translation. Anchor discovery in SLA/budget/compliance constraints first, run legacy and GCP Dataflow/BigQuery pipelines in parallel shadow validation until row/aggregate parity reaches 99.99%, and maintain an instant DNS/PubSub/view rollback toggle during cutover.',
    internals: [
      'Dual-Write vs Shadow-Run: Dual-write decouples producers via Pub/Sub fan-out immediately; Shadow-Run replays production snapshots safely with zero blast radius on legacy SLAs.',
      'Automated Reconciliation Harness compares row counts, null rates, and numeric checksums across Oracle/Hive vs BigQuery daily before approving BI cutover.',
      'Sustainability & FinOps: Selecting low-CO2 GCP regions (e.g. europe-north1 / asia-south1 sizing), eliminating redundant full-table batch scans via Dataflow streaming + BQ clustering reduces both carbon footprint and monthly spend.',
    ],
    tradeOffs: [
      { optionA: 'Shadow-Run Validation', optionB: 'Producer Dual-Write Cutover', whenToChoose: 'Shadow-Run when upstream Flume/ERP agents cannot risk latency spikes; Dual-Write via Kafka/Pub/Sub bridge when near-real-time parity is required before decommissioning Hadoop.' },
      { optionA: 'Lift-and-Shift Dataproc', optionB: 'Cloud-Native Refactor (Dataflow + BigQuery)', whenToChoose: 'Dataproc for urgent data-center exit deadlines; Dataflow + BigQuery/dbt refactor for long-term serverless TCO and low ops toil.' },
    ],
    pitfalls: [
      'Cutting over Looker/Tableau dashboards before reconciling timezone, rounding, and NULL semantics between Hive/Teradata and BigQuery.',
      'Accepting ambiguous stakeholder requests ("make everything real-time") without quantifying 5x cost multiplier vs 5-minute micro-batch.',
    ],
    codeExample: `Cutover Gate Checklist:
1. Shadow Parity >= 99.99% for 14 consecutive days
2. Reconcile PII masking (Cloud DLP + Policy Tags)
3. Pre-warmed BigQuery Slot Reservation + Looker view switch
4. 1-click Rollback: revert Authorized View alias to legacy sync table`,
    asciiDiagram: `Legacy Flume/Hadoop -> [Shadow/Dual-Write] -> Dataflow + BigQuery -> Parity Diff Audit -> Cutover Gate`,
  },
};

export function getConceptGuide(conceptName: string): ConceptGuide {
  if (CONCEPT_GUIDES[conceptName]) {
    return CONCEPT_GUIDES[conceptName];
  }
  const firstKey = Object.keys(CONCEPT_GUIDES)[0];
  return {
    ...CONCEPT_GUIDES[firstKey],
    name: conceptName,
    summary: `Core Tier-1 Data Engineering mastery topic covering ${conceptName} internals, distributed execution mechanics, production trade-offs, and interview edge cases.`,
  };
}
