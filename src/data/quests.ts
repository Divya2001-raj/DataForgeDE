import { UserProgressState } from '../types/platform';

export type QuestIconId =
  | 'satellite'
  | 'stream'
  | 'warehouse'
  | 'genai'
  | 'dashboard'
  | 'governance'
  | 'consulting';

export type QuestLevelKind = 'question' | 'mock' | 'carl';

export interface QuestLevelDefinition {
  id: string;
  levelNumber: number;
  title: string;
  topicTag: string;
  focusSummary: string;
  dependencyBridge?: string;
  kind: QuestLevelKind;
  questionId?: string;
  mockNumber?: number;
  supportsGoogleDocMode?: boolean;
}

export interface QuestDefinition {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  roleFocus: string;
  icon: QuestIconId;
  glowColor: string;
  levels: QuestLevelDefinition[];
}

export const GOOGLE_CLOUD_DE_QUESTS: QuestDefinition[] = [
  {
    id: 'quest-1-imagery',
    number: 1,
    title: 'Petabyte Satellite & Aerial Imagery Pipelines',
    shortTitle: 'Overhead Imagery & Spatial',
    roleFocus: 'Overhead Imagery · BigQuery GIS · Dataflow',
    icon: 'satellite',
    glowColor: '#10B981',
    levels: [
      {
        id: 'q1-l1',
        levelNumber: 1,
        title: 'DSA Spatial Grids & Connected Tile Regions',
        topicTag: 'DSA Spatial Grid',
        focusSummary: 'Traverse 2D partition matrices and detect contiguous tile footprints cleanly in O(R·C).',
        dependencyBridge: 'Spatial grid traversal prepares you for K-nearest coordinate pruning.',
        kind: 'question',
        questionId: 'dsa-063',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q1-l2',
        levelNumber: 2,
        title: 'Spatial Proximity & R-Tree Heap Pruning',
        topicTag: 'DSA Heap + Bounds',
        focusSummary: 'Prune bounding-box coordinates using max-heaps before running expensive polygon geometry checks.',
        dependencyBridge: 'Coordinate pruning feeds directly into packing fragmented raster outputs in Python.',
        kind: 'question',
        questionId: 'dsa-056',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q1-l3',
        levelNumber: 3,
        title: 'Python Raster / Tile Metadata Bin-Packing',
        topicTag: 'Python Ingestion',
        focusSummary: 'Compact thousands of tiny raster/Parquet metadata shards into optimal 128MB cloud objects.',
        dependencyBridge: 'Compacted tile metadata pairs with Cloud-Optimized GeoTIFF (COG) mosaic layout.',
        kind: 'question',
        questionId: 'python-009',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q1-l4',
        levelNumber: 4,
        title: 'Cloud-Optimized GeoTIFF (COG) & Mosaic Ingestion',
        topicTag: 'COG & Z-Order Layout',
        focusSummary: 'Architect HTTP range-readable COG tiles and Z-ordered Parquet footprints for fast sub-tile reads.',
        dependencyBridge: 'COG tile catalogs require S2/R-Tree spatial indexing for point-in-polygon joins.',
        kind: 'question',
        questionId: 'geospatial-095',
      },
      {
        id: 'q1-l5',
        levelNumber: 5,
        title: 'S2 Cell Covering & Spatial R-Tree Indexing',
        topicTag: 'S2 / H3 Spatial Index',
        focusSummary: 'Convert irregular AOI polygons into equijoinable S2 cell coverings and R-Tree indexes.',
        dependencyBridge: 'S2 cell prefixes unlock multi-terabyte spatial join pruning inside BigQuery GIS.',
        kind: 'question',
        questionId: 'geospatial-011',
      },
      {
        id: 'q1-l6',
        levelNumber: 6,
        title: 'BigQuery GIS Petabyte Spatial Join Clustering',
        topicTag: 'BigQuery GIS',
        focusSummary: 'Eliminate cross-join shuffles in BigQuery using GEOGRAPHY clustering and S2 prefix keys.',
        dependencyBridge: 'Clustered BigQuery metadata feeds distributed Cloud Dataflow raster workers.',
        kind: 'question',
        questionId: 'geospatial-003',
      },
      {
        id: 'q1-l7',
        levelNumber: 7,
        title: 'Cloud Dataflow Distributed Tile Serialization',
        topicTag: 'Cloud Dataflow',
        focusSummary: 'Eliminate GeoJSON/WKB serialization overhead in Apache Beam / Dataflow streaming workers.',
        dependencyBridge: 'Zero-bottleneck Dataflow tile pipelines scale up to 5 PB/month overhead imagery.',
        kind: 'question',
        questionId: 'geospatial-074',
      },
      {
        id: 'q1-l8',
        levelNumber: 8,
        title: '5 PB/Month Overhead Imagery Architecture & Bottleneck Design',
        topicTag: 'Petabyte Capstone',
        focusSummary: 'Design an end-to-end satellite & aerial tile pipeline handling cloud-cover QC, reprojection, and SLOs.',
        kind: 'question',
        questionId: 'geospatial-007',
      },
    ],
  },
  {
    id: 'quest-2-sync-async',
    number: 2,
    title: 'Sync & Async Integration (Flume, Dataflow & Spark)',
    shortTitle: 'Sync & Async Pipelines',
    roleFocus: 'Flume Migration · Pub/Sub · Dataflow · PySpark',
    icon: 'stream',
    glowColor: '#38BDF8',
    levels: [
      {
        id: 'q2-l1',
        levelNumber: 1,
        title: 'DSA Sliding Window & Bounded Ingestion Queues',
        topicTag: 'DSA Sliding Window',
        focusSummary: 'Enforce thread-safe sliding window rate limits for bursty upstream ingestion gateways.',
        dependencyBridge: 'Bounded window rate-limiting protects downstream async cloud storage pullers.',
        kind: 'question',
        questionId: 'dsa-001',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q2-l2',
        levelNumber: 2,
        title: 'Python Asyncio Concurrent Log & Tile Parsing',
        topicTag: 'Python Asyncio',
        focusSummary: 'Coordinate async GCS/HTTP downloads with semaphore caps so worker memory stays bounded.',
        dependencyBridge: 'Concurrent async pullers require idempotent deduplication when retries arrive out of order.',
        kind: 'question',
        questionId: 'python-008',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q2-l3',
        levelNumber: 3,
        title: 'Idempotent Event Deduplication Within Watermarks',
        topicTag: 'Python Watermarks',
        focusSummary: 'Evict stale dedup keys cleanly using bounded event-time watermarks without state leaks.',
        dependencyBridge: 'Application-level dedup semantics carry straight into Pub/Sub + Dataflow DLQ topologies.',
        kind: 'question',
        questionId: 'python-003',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q2-l4',
        levelNumber: 4,
        title: 'Pub/Sub & Dataflow Schema Evolution + Dead-Letter Queues',
        topicTag: 'Pub/Sub & Kafka',
        focusSummary: 'Route poison-pill messages cleanly and preserve exactly-once delivery across schema changes.',
        dependencyBridge: 'Resilient streaming buses enable stateful event-time windows and late-data handling.',
        kind: 'question',
        questionId: 'cloud-027',
      },
      {
        id: 'q2-l5',
        levelNumber: 5,
        title: 'Event-Time Watermarks & Stateful Late-Data Dedup',
        topicTag: 'Streaming Watermarks',
        focusSummary: 'Configure event-time watermarks and state TTL to drop duplicates without unbounded heap growth.',
        dependencyBridge: 'Stateful stream joins hit OOM quickly unless skewed hot keys are salted or broadcast.',
        kind: 'question',
        questionId: 'pyspark-005',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q2-l6',
        levelNumber: 6,
        title: 'PySpark Broadcast Joins & Key Skew Salting',
        topicTag: 'PySpark Skew Tuning',
        focusSummary: 'Break hot-key partition stragglers using dynamic key salting and broadcast join thresholds.',
        dependencyBridge: 'Mastering async backpressure and skew salting unlocks migrating legacy Flume pipelines.',
        kind: 'question',
        questionId: 'pyspark-001',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q2-l7',
        levelNumber: 7,
        title: 'Legacy Apache Flume-to-Dataflow Sync/Async Migration',
        topicTag: 'Flume -> Dataflow',
        focusSummary: 'Modernize 10+ TB/day Flume + HDFS ingestion to Pub/Sub, Cloud Dataflow & BigQuery Storage Write API.',
        kind: 'question',
        questionId: 'cloud-101',
      },
    ],
  },
  {
    id: 'quest-3-modeling-bq',
    number: 3,
    title: 'Dimensional Modeling & Linked BigQuery SQL',
    shortTitle: 'Modeling & BigQuery SQL',
    roleFocus: 'Kimball SCD2 · Nested Structs · Partitioning · Iceberg',
    icon: 'warehouse',
    glowColor: '#A855F7',
    levels: [
      {
        id: 'q3-l1',
        levelNumber: 1,
        title: 'DSA Hash Partition Lookups & Key Probing',
        topicTag: 'DSA Hash Indexing',
        focusSummary: 'Implement O(1) hash bucket lookup mechanics mirroring surrogate-key dimension joins.',
        dependencyBridge: 'Hash key probing underpins Kimball surrogate keys and SCD Type 2 validity modeling.',
        kind: 'question',
        questionId: 'dsa-004',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q3-l2',
        levelNumber: 2,
        title: 'Star Schema & SCD Type 2 / Type 4 Hybrid Modeling',
        topicTag: 'Kimball SCD Type 2',
        focusSummary: 'Design slowly changing dimension validity intervals without exploding fact join fan-out.',
        dependencyBridge: 'Your SCD Type 2 schema translates directly into point-in-time SQL range queries.',
        kind: 'question',
        questionId: 'modeling-018',
      },
      {
        id: 'q3-l3',
        levelNumber: 3,
        title: 'Linked BigQuery SQL: SCD2 Validity & Window Queries',
        topicTag: 'Linked SQL Windows',
        focusSummary: 'Write deterministic point-in-time joins over SCD2 validity bounds handling open-ended NULLs.',
        dependencyBridge: 'Flat relational joins extend to BigQuery nested ARRAY<STRUCT> & UNNEST patterns.',
        kind: 'question',
        questionId: 'sql-001',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q3-l4',
        levelNumber: 4,
        title: 'BigQuery Repeated Records (UNNEST & STRUCT Normalization)',
        topicTag: 'Nested STRUCTs',
        focusSummary: 'Flatten and normalize BigQuery-style REPEATED RECORD array-of-structs payloads cleanly.',
        dependencyBridge: 'Clean columnar nesting pairs with sargable partition pruning to slash bytes scanned.',
        kind: 'question',
        questionId: 'python-097',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q3-l5',
        levelNumber: 5,
        title: 'BigQuery Partition Pruning & Sargable Predicates',
        topicTag: 'Partition & Clustering',
        focusSummary: 'Rewrite non-sargable partition filters to eliminate full-table scans and save slot budget.',
        dependencyBridge: 'Warehouse pruning mechanics connect directly to open Lakehouse ACID transaction logs.',
        kind: 'question',
        questionId: 'sql-016',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q3-l6',
        levelNumber: 6,
        title: 'Data Lakehouse ACID Isolation (Iceberg / Delta)',
        topicTag: 'Lakehouse CoW vs MoR',
        focusSummary: 'Contrast Copy-on-Write vs Merge-on-Read isolation and BigLake Iceberg compaction trade-offs.',
        dependencyBridge: 'ACID snapshot guarantees anchor zero-downtime legacy enterprise warehouse migrations.',
        kind: 'question',
        questionId: 'concepts-007',
      },
      {
        id: 'q3-l7',
        levelNumber: 7,
        title: 'Zero-Downtime Enterprise Teradata / Oracle -> BigQuery Migration',
        topicTag: 'Warehouse Cutover',
        focusSummary: 'Plan schema translation, SQL parity validation, and shadow-run cutover for multi-source warehouses.',
        kind: 'question',
        questionId: 'cloud-005',
      },
    ],
  },
  {
    id: 'quest-4-genai-dq',
    number: 4,
    title: 'GenAI Agents, RAG & Automated Data Quality',
    shortTitle: 'GenAI & Automated DQ',
    roleFocus: 'Vertex AI · Hybrid RAG · Multimodal Gemini · DQ',
    icon: 'genai',
    glowColor: '#F472B6',
    levels: [
      {
        id: 'q4-l1',
        levelNumber: 1,
        title: 'DSA Top-K Priority Queues for Candidate Ranking',
        topicTag: 'DSA Heap Top-K',
        focusSummary: 'Maintain streaming Top-K heavy hitters with min-heaps in O(N log K) time.',
        dependencyBridge: 'Heap-based Top-K selection drives chunk retrieval and hybrid candidate scoring.',
        kind: 'question',
        questionId: 'dsa-053',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q4-l2',
        levelNumber: 2,
        title: 'Python Semantic Chunking & Metadata Overlap',
        topicTag: 'Chunking & Metadata',
        focusSummary: 'Split engineering runbooks & telemetry docs respecting structural headings and token overlap.',
        dependencyBridge: 'Clean chunk pipelines demand training-serving parity before vector indexing.',
        kind: 'question',
        questionId: 'python-017',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q4-l3',
        levelNumber: 3,
        title: 'ML Feature Parity & Training-Serving Skew Guardrails',
        topicTag: 'ML Drift & Parity',
        focusSummary: 'Eliminate batch-vs-online skew between PySpark/BigQuery features and real-time serving.',
        dependencyBridge: 'Consistent embeddings feed Hybrid BM25 + Cosine Reciprocal Rank Fusion in BigQuery.',
        kind: 'question',
        questionId: 'mlfeatures-003',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q4-l4',
        levelNumber: 4,
        title: 'Hybrid BM25 + BigQuery Vector Search (RRF SQL)',
        topicTag: 'Hybrid RRF SQL',
        focusSummary: 'Fuse sparse lexical BM25 ranks and dense vector similarity scores via Reciprocal Rank Fusion.',
        dependencyBridge: 'Hybrid retrieval queries scale into multi-tenant Vertex AI RAG architectures.',
        kind: 'question',
        questionId: 'sql-008',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q4-l5',
        levelNumber: 5,
        title: 'Vertex AI & BigQuery Multi-Tenant Hybrid RAG Platform',
        topicTag: 'Vertex AI RAG',
        focusSummary: 'Design ACL-governed RAG ingestion, incremental re-embedding, and grounded evaluation loops.',
        dependencyBridge: 'Text RAG systems evolve into multimodal Gemini agents inspecting charts and imagery.',
        kind: 'question',
        questionId: 'genai-001',
      },
      {
        id: 'q4-l6',
        levelNumber: 6,
        title: 'Gemini Multimodal Extraction & Anomaly Detection Agent',
        topicTag: 'Multimodal Agent',
        focusSummary: 'Use Gemini + Document AI pipelines to extract structured signals and flag visual anomalies.',
        dependencyBridge: 'Multimodal inspection agents trigger automated spatial/imagery DQ circuit breakers.',
        kind: 'question',
        questionId: 'genai-004',
      },
      {
        id: 'q4-l7',
        levelNumber: 7,
        title: 'Automated Spatial & Imagery Data Quality Suite',
        topicTag: 'Automated DQ',
        focusSummary: 'Enforce polygon topology, Null Island (0,0) traps, CRS bounds, and self-healing quarantine tables.',
        kind: 'question',
        questionId: 'geospatial-075',
      },
    ],
  },
  {
    id: 'quest-5-ops-dashboards',
    number: 5,
    title: 'Operational Dashboards & Imagery SLA Metrics',
    shortTitle: 'Ops Dashboards & Looker',
    roleFocus: 'SLA SQL · Semantic Layer · BI Engine · Looker',
    icon: 'dashboard',
    glowColor: '#F59E0B',
    levels: [
      {
        id: 'q5-l1',
        levelNumber: 1,
        title: 'SQL Rolling Baseline & Silent Drop Anomaly Detection',
        topicTag: 'Rolling SLA SQL',
        focusSummary: 'Catch >40% ingestion drops against 7-day trailing moving baselines using SQL window frames.',
        dependencyBridge: 'Trailing-window anomaly SQL directly powers imagery completeness & freshness SLO alerts.',
        kind: 'question',
        questionId: 'sql-013',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q5-l2',
        levelNumber: 2,
        title: 'Overhead Imagery Completeness, Freshness & SLO Breach SQL',
        topicTag: 'Imagery SLO SQL',
        focusSummary: 'Quantify regional tile completeness %, ingestion freshness lag, and anomaly rate SLO breaches.',
        dependencyBridge: 'Operational SLO metrics require a governed semantic layer to prevent dashboard metric drift.',
        kind: 'question',
        questionId: 'dataops-102',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q5-l3',
        levelNumber: 3,
        title: 'Looker Semantic Layer & Conformed KPI Star Schema',
        topicTag: 'Looker Semantic Layer',
        focusSummary: 'Model conformed LookML metrics and BigQuery materialized view grains with zero fan-out.',
        dependencyBridge: 'Conformed semantic views need BI Engine coverage audits to guarantee sub-second loads.',
        kind: 'question',
        questionId: 'modeling-102',
      },
      {
        id: 'q5-l4',
        levelNumber: 4,
        title: 'BigQuery Materialized Views & BI Engine Acceleration Audit',
        topicTag: 'BI Engine SQL',
        focusSummary: 'Diagnose BI Engine cache misses and materialized view rewrite coverage across dashboards.',
        dependencyBridge: 'Sub-second BI Engine tuning powers executive Looker operational health dashboards.',
        kind: 'question',
        questionId: 'dataops-101',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q5-l5',
        levelNumber: 5,
        title: 'Executive Looker & Imagery Ops Health Dashboard',
        topicTag: 'Looker Ops Plane',
        focusSummary: 'Architect executive latency/completeness scorecards backed by BigQuery BI Engine and Looker.',
        dependencyBridge: 'Executive dashboards stay green when guarded by automated MV refresh and slot fallback.',
        kind: 'question',
        questionId: 'modeling-104',
      },
      {
        id: 'q5-l6',
        levelNumber: 6,
        title: 'Self-Healing BI Engine + MV Refresh & Slot Fallback Pipeline',
        topicTag: 'Self-Healing BI Ops',
        focusSummary: 'Automate materialized view refresh recovery and slot reservation overflow handling for Looker.',
        kind: 'question',
        questionId: 'dataops-105',
      },
    ],
  },
  {
    id: 'quest-6-governance-finops',
    number: 6,
    title: 'Cloud Governance, Security & Infrastructure FinOps',
    shortTitle: 'Governance & FinOps',
    roleFocus: 'DLP Masking · VPC-SC · GDPR · BigQuery FinOps · DR',
    icon: 'governance',
    glowColor: '#06B6D4',
    levels: [
      {
        id: 'q6-l1',
        levelNumber: 1,
        title: 'Python Columnar PII Redaction & Dynamic Masking Filter',
        topicTag: 'PII Masking Code',
        focusSummary: 'Build deterministic, schema-driven columnar redaction filters for regulated data exports.',
        dependencyBridge: 'Row/column masking logic scales up to automated Cloud DLP + Dataplex catalog discovery.',
        kind: 'question',
        questionId: 'python-100',
        supportsGoogleDocMode: true,
      },
      {
        id: 'q6-l2',
        levelNumber: 2,
        title: 'Automated PII Discovery & Policy Tags (Cloud DLP + Dataplex)',
        topicTag: 'Dataplex & DLP',
        focusSummary: 'Classify sensitive columns automatically and bind BigQuery policy tags for column-level ACLs.',
        dependencyBridge: 'Classified data catalogs must sit behind VPC Service Controls and CMEK key boundaries.',
        kind: 'question',
        questionId: 'cloud-018',
      },
      {
        id: 'q6-l3',
        levelNumber: 3,
        title: 'IAM Least-Privilege, VPC Service Controls & CMEK',
        topicTag: 'VPC-SC & CMEK',
        focusSummary: 'Prevent data exfiltration across GCP boundaries using VPC-SC perimeters and customer-managed keys.',
        dependencyBridge: 'Zero-trust storage perimeters must also execute auditable GDPR deletion cascades.',
        kind: 'question',
        questionId: 'cloud-012',
      },
      {
        id: 'q6-l4',
        levelNumber: 4,
        title: 'GDPR Right-to-Be-Forgotten Deletion Orchestrator',
        topicTag: 'GDPR Compliance',
        focusSummary: 'Orchestrate verifiable subject erasures across GCS Iceberg files, BigQuery, and Bigtable.',
        dependencyBridge: 'Compliant cloud estates require BigQuery slot reservations & FinOps autoscaling guardrails.',
        kind: 'question',
        questionId: 'cloud-039',
      },
      {
        id: 'q6-l5',
        levelNumber: 5,
        title: 'BigQuery Editions Autoscaling & Slot FinOps Governance',
        topicTag: 'BigQuery FinOps',
        focusSummary: 'Balance baseline slot commitments vs autoscaling bursts and chargeback attribution tags.',
        dependencyBridge: 'Cost-governed workloads pair with multi-region active-active DR & carbon resilience.',
        kind: 'question',
        questionId: 'cloud-008',
      },
      {
        id: 'q6-l6',
        levelNumber: 6,
        title: 'Sustainable, Cost-Efficient Multi-Region Active-Active DR',
        topicTag: 'Multi-Region DR',
        focusSummary: 'Meet strict RPO/RTO targets across GCP regions while minimizing cross-region egress and waste.',
        kind: 'question',
        questionId: 'cloud-006',
      },
    ],
  },
  {
    id: 'quest-7-consulting-boss',
    number: 7,
    title: 'Google Cloud Consulting & Bengaluru Loop Boss-Rush',
    shortTitle: 'Bengaluru Boss-Rush',
    roleFocus: 'Discovery · Trade-Offs · CARL · Consulting Bar-Raisers',
    icon: 'consulting',
    glowColor: '#EC4899',
    levels: [
      {
        id: 'q7-l1',
        levelNumber: 1,
        title: '2-Minute Ambiguous Client Discovery Drill',
        topicTag: 'Client Discovery',
        focusSummary: 'Reframe a Retail VP’s vague "real-time everything" demand into concrete SLAs and TCO tiers.',
        dependencyBridge: 'Sharpened discovery requirements equip you to defend dual-write vs shadow-run trade-offs.',
        kind: 'question',
        questionId: 'behavioral-101',
      },
      {
        id: 'q7-l2',
        levelNumber: 2,
        title: 'Structured Dual-Write vs Shadow-Run Trade-Off Defense',
        topicTag: 'Trade-Off Matrix',
        focusSummary: 'Quantify egress, FinOps burn, and carbon sustainability trade-offs for a skeptical client CFO.',
        dependencyBridge: 'Trade-off rigor carries into live zero-downtime Hadoop/Teradata cutover execution.',
        kind: 'question',
        questionId: 'behavioral-103',
      },
      {
        id: 'q7-l3',
        levelNumber: 3,
        title: 'Shadow-Run Reconciliation & Cutover Rollback Blueprint',
        topicTag: 'Cutover Runbook',
        focusSummary: 'Design deterministic row-hash diffing and sub-minute rollback gates before legacy decommissioning.',
        dependencyBridge: 'Migration cutover blueprints scale to an end-to-end Google Cloud Consulting whiteboard.',
        kind: 'question',
        questionId: 'cloud-102',
      },
      {
        id: 'q7-l4',
        levelNumber: 4,
        title: 'End-to-End Enterprise & Overhead Imagery Whiteboard',
        topicTag: 'Full Whiteboard',
        focusSummary: 'Defend ingestion, BigQuery modeling, GenAI DQ, Looker ops, and FinOps in one unified GCP blueprint.',
        dependencyBridge: 'Architecture depth must be backed by crisp, metric-driven CARL consulting stories.',
        kind: 'question',
        questionId: 'cloud-100',
      },
      {
        id: 'q7-l5',
        levelNumber: 5,
        title: '3 CARL Consulting Stakeholder Stories',
        topicTag: 'CARL Story Bank',
        focusSummary: 'Author at least 3 structured Context-Action-Result-Learning stories in your CARL Story Bank.',
        dependencyBridge: 'Three polished CARL stories unlock the 4 Consulting Bar-Raiser mock simulations.',
        kind: 'carl',
      },
      {
        id: 'q7-l6',
        levelNumber: 6,
        title: 'Boss Round 1: Flume + Hadoop (10+ TB/Day) Cutover Mock',
        topicTag: 'Mock #41 · Bar-Raiser',
        focusSummary: 'Defend live Flume-to-Dataflow dual-write parity and rollback strategy under Principal Engineer probing.',
        dependencyBridge: 'Clearing streaming cutover unlocks the Overhead Imagery & Looker Ops Bar-Raiser.',
        kind: 'mock',
        mockNumber: 41,
      },
      {
        id: 'q7-l7',
        levelNumber: 7,
        title: 'Boss Round 2: Overhead Imagery & Looker BI Engine Mock',
        topicTag: 'Mock #42 · Bar-Raiser',
        focusSummary: 'Handle executive SLA curves, BigQuery BI Engine misses, and Googleyness collaboration follow-ups.',
        dependencyBridge: 'Clearing Imagery Ops opens the Ambiguous Retail VP Discovery & Modeling Bar-Raiser.',
        kind: 'mock',
        mockNumber: 42,
      },
      {
        id: 'q7-l8',
        levelNumber: 8,
        title: 'Boss Round 3: Ambiguous Discovery & TCO Modeling Mock',
        topicTag: 'Mock #43 · Bar-Raiser',
        focusSummary: 'Navigate shifting client requirements and defend BigQuery SQL & dimensional schema trade-offs.',
        dependencyBridge: 'Conquering Mock #43 unlocks the Final Google Cloud Consulting Bengaluru HC Simulation.',
        kind: 'mock',
        mockNumber: 43,
      },
      {
        id: 'q7-l9',
        levelNumber: 9,
        title: 'Final Boss: Google Bengaluru Hiring Committee Simulation',
        topicTag: 'Mock #50 · Final HC',
        focusSummary: 'Complete the flagship 6-round multi-cloud cutover Bar-Raiser targeting Strong Hire bar.',
        kind: 'mock',
        mockNumber: 50,
      },
    ],
  },
];

export const TOTAL_QUEST_LEVELS = GOOGLE_CLOUD_DE_QUESTS.reduce(
  (sum, q) => sum + q.levels.length,
  0
);

export function isQuestLevelCompleted(
  level: QuestLevelDefinition,
  progress: UserProgressState
): boolean {
  if (level.kind === 'carl') {
    return (progress.carlStories?.length || 0) >= 3;
  }
  if (level.kind === 'mock' && level.mockNumber !== undefined) {
    return progress.mockHistory.some((m) => m.mockNumber === level.mockNumber);
  }
  if (level.kind === 'question' && level.questionId) {
    return progress.solvedQuestionIds.includes(level.questionId);
  }
  return false;
}

export interface QuestProgressSummary {
  questId: string;
  completedCount: number;
  totalCount: number;
  pct: number;
  nextUnlockedLevelNumber: number | null;
  levelStates: Array<{
    level: QuestLevelDefinition;
    completed: boolean;
    unlocked: boolean;
  }>;
}

export function computeQuestProgress(
  quest: QuestDefinition,
  progress: UserProgressState
): QuestProgressSummary {
  const completedFlags = quest.levels.map((lvl) => isQuestLevelCompleted(lvl, progress));
  const completedCount = completedFlags.filter(Boolean).length;
  const totalCount = quest.levels.length;
  let nextUnlockedLevelNumber: number | null = null;

  const levelStates = quest.levels.map((level, idx) => {
    const completed = completedFlags[idx];
    const unlocked = idx === 0 || completedFlags[idx - 1] || completed;
    if (!completed && unlocked && nextUnlockedLevelNumber === null) {
      nextUnlockedLevelNumber = level.levelNumber;
    }
    return { level, completed, unlocked };
  });

  return {
    questId: quest.id,
    completedCount,
    totalCount,
    pct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    nextUnlockedLevelNumber,
    levelStates,
  };
}
