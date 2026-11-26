import {
  Difficulty,
  GoogleRoundId,
  InterviewerProfile,
  MockInterviewRound,
  MockRoundStep,
  MockTierName,
  TrackId,
  WorkspaceType,
} from '../types/platform';

export const INTERVIEWER_ROSTER: InterviewerProfile[] = [
  { id: 'ananya', name: 'Ananya Rao', role: 'Staff Data Engineer', team: 'Google Cloud Consulting · Bengaluru', voiceGender: 'female', voicePitch: 1.08, voiceRate: 1.03, skin: '#D69E7E', skinShadow: '#BA7E5E', hair: '#14141B', hairHighlight: '#3B2F63', hairStyle: 'long', outfit: '#1A1A24', glassesStyle: 'rect', glassesColor: '#E4E4E7', bgTint: '#141122' },
  { id: 'kevin', name: 'Kevin Lin', role: 'Principal Data Architect', team: 'BigQuery Storage · Sunnyvale', voiceGender: 'male', voicePitch: 0.94, voiceRate: 1.02, skin: '#EED0BA', skinShadow: '#D4AC92', hair: '#161822', hairHighlight: '#4C3D82', hairStyle: 'short', outfit: '#1F202C', glassesStyle: 'rect', glassesColor: '#9D7FEA', bgTint: '#12131F' },
  { id: 'meera', name: 'Meera Iyer', role: 'Senior Staff DE', team: 'Cloud Dataflow · Bengaluru', voiceGender: 'female', voicePitch: 1.12, voiceRate: 1.0, skin: '#C98A68', skinShadow: '#A86E4E', hair: '#12101A', hairHighlight: '#6D4AFF', hairStyle: 'bob', outfit: '#181822', glassesStyle: 'round', glassesColor: '#C4B5FD', bgTint: '#171226' },
  { id: 'david', name: 'David Vance', role: 'Staff SWE, Distributed SQL', team: 'Dremel / BigQuery · Seattle', voiceGender: 'male', voicePitch: 0.9, voiceRate: 0.99, skin: '#F0D4C2', skinShadow: '#D4AE98', hair: '#2D2638', hairHighlight: '#7C65B8', hairStyle: 'parted', outfit: '#1B1D26', glassesStyle: 'none', glassesColor: '#9D7FEA', bgTint: '#111421' },
  { id: 'priya', name: 'Priya Menon', role: 'Cloud Geospatial Architect', team: 'Google Maps / Earth Engine', voiceGender: 'female', voicePitch: 1.06, voiceRate: 1.04, skin: '#CE9270', skinShadow: '#B07454', hair: '#14121D', hairHighlight: '#5A439E', hairStyle: 'curly', outfit: '#1D1829', glassesStyle: 'round', glassesColor: '#E4E4E7', bgTint: '#161224' },
  { id: 'kenji', name: 'Kenji Takahashi', role: 'Senior ML Data Engineer', team: 'Vertex AI Feature Store · Tokyo', voiceGender: 'male', voicePitch: 0.96, voiceRate: 1.05, skin: '#F2D7C5', skinShadow: '#D6B29B', hair: '#12141E', hairHighlight: '#9D7FEA', hairStyle: 'parted', outfit: '#151821', glassesStyle: 'rect', glassesColor: '#C4B5FD', bgTint: '#101420' },
  { id: 'sophia', name: 'Sophia Alvarez', role: 'Principal Lakehouse Lead', team: 'Dataproc & Iceberg · NYC', voiceGender: 'female', voicePitch: 1.09, voiceRate: 1.01, skin: '#DFAF92', skinShadow: '#C28E70', hair: '#23182B', hairHighlight: '#8B68E0', hairStyle: 'long', outfit: '#1A1624', glassesStyle: 'none', glassesColor: '#9D7FEA', bgTint: '#181226' },
  { id: 'rohan', name: 'Rohan Deshmukh', role: 'Staff Analytics Architect', team: 'Google Cloud Consulting · Mumbai', voiceGender: 'male', voicePitch: 0.92, voiceRate: 1.01, skin: '#C88966', skinShadow: '#A66C4C', hair: '#14141A', hairHighlight: '#4E3C85', hairStyle: 'short', outfit: '#191A23', glassesStyle: 'rect', glassesColor: '#E4E4E7', bgTint: '#131220' },
  { id: 'elena', name: 'Elena Rostova', role: 'Staff Reliability Eng', team: 'Cloud Spanner Replication · Zurich', voiceGender: 'female', voicePitch: 1.05, voiceRate: 0.98, skin: '#F5DDD0', skinShadow: '#D9B7A6', hair: '#29223B', hairHighlight: '#A78BFA', hairStyle: 'bob', outfit: '#161822', glassesStyle: 'rect', glassesColor: '#9D7FEA', bgTint: '#141324' },
  { id: 'marcus', name: 'Marcus Cole', role: 'Director, Data Platforms', team: 'Google Cloud Bar-Raiser · Austin', voiceGender: 'male', voicePitch: 0.87, voiceRate: 0.97, skin: '#8F5B42', skinShadow: '#70422D', hair: '#111116', hairHighlight: '#4A3A7A', hairStyle: 'curly', outfit: '#1C1B24', glassesStyle: 'none', glassesColor: '#9D7FEA', bgTint: '#12111E' },
  { id: 'nisha', name: 'Nisha Kulkarni', role: 'Lead GenAI Data Architect', team: 'Vertex Vector Search · Bengaluru', voiceGender: 'female', voicePitch: 1.1, voiceRate: 1.04, skin: '#D19675', skinShadow: '#B27757', hair: '#15131F', hairHighlight: '#7E60CC', hairStyle: 'long', outfit: '#181524', glassesStyle: 'round', glassesColor: '#9D7FEA', bgTint: '#171128' },
  { id: 'daniel', name: 'Daniel Park', role: 'Senior Staff SWE', team: 'Pub/Sub & Streaming · Waterloo', voiceGender: 'male', voicePitch: 0.95, voiceRate: 1.03, skin: '#EFCFB8', skinShadow: '#D1AD94', hair: '#181924', hairHighlight: '#634EA8', hairStyle: 'parted', outfit: '#1B1D29', glassesStyle: 'round', glassesColor: '#E4E4E7', bgTint: '#111321' },
  { id: 'claire', name: 'Claire Dubois', role: 'Staff FinOps & SQL Lead', team: 'Looker & BigQuery BI · Paris', voiceGender: 'female', voicePitch: 1.07, voiceRate: 1.0, skin: '#F1D4C4', skinShadow: '#D2B09E', hair: '#2B2038', hairHighlight: '#9D7FEA', hairStyle: 'bob', outfit: '#1A1826', glassesStyle: 'rect', glassesColor: '#C4B5FD', bgTint: '#161325' },
  { id: 'arjun', name: 'Arjun Nair', role: 'Principal Data Consultant', team: 'Google Cloud BFSI · Hyderabad', voiceGender: 'male', voicePitch: 0.91, voiceRate: 1.02, skin: '#C48462', skinShadow: '#A16748', hair: '#13131A', hairHighlight: '#554194', hairStyle: 'short', outfit: '#181A24', glassesStyle: 'rect', glassesColor: '#9D7FEA', bgTint: '#121220' },
  { id: 'maya', name: 'Maya Chen', role: 'Staff Geospatial Engineer', team: 'Geo S2 / StreetView · Mountain View', voiceGender: 'female', voicePitch: 1.11, voiceRate: 1.03, skin: '#EED2BD', skinShadow: '#D1AF97', hair: '#141521', hairHighlight: '#8567DB', hairStyle: 'long', outfit: '#161722', glassesStyle: 'none', glassesColor: '#9D7FEA', bgTint: '#131223' },
  { id: 'vikram', name: 'Vikram Singhania', role: 'Senior Staff DE', team: 'Cloud Composer & Airflow · Bengaluru', voiceGender: 'male', voicePitch: 0.93, voiceRate: 1.0, skin: '#CE9372', skinShadow: '#AE7455', hair: '#16151E', hairHighlight: '#6D54B5', hairStyle: 'parted', outfit: '#1B1A26', glassesStyle: 'round', glassesColor: '#E4E4E7', bgTint: '#151221' },
  { id: 'hannah', name: 'Hannah Abbott', role: 'Staff Governance Lead', team: 'Dataplex & DPDP Privacy · London', voiceGender: 'female', voicePitch: 1.04, voiceRate: 0.99, skin: '#F4DCD0', skinShadow: '#D7B9AA', hair: '#2A1F38', hairHighlight: '#9D7FEA', hairStyle: 'curly', outfit: '#181924', glassesStyle: 'rect', glassesColor: '#E4E4E7', bgTint: '#141424' },
  { id: 'lucas', name: 'Lucas Moreira', role: 'Senior Data Systems Eng', team: 'Flink & Beam Runtime · Sao Paulo', voiceGender: 'male', voicePitch: 0.94, voiceRate: 1.02, skin: '#DDA989', skinShadow: '#BD8868', hair: '#191722', hairHighlight: '#7256C2', hairStyle: 'curly', outfit: '#191B26', glassesStyle: 'none', glassesColor: '#9D7FEA', bgTint: '#111420' },
  { id: 'kavya', name: 'Kavya Subramanian', role: 'Staff Warehouse Eng', team: 'BigQuery Omni · Chennai', voiceGender: 'female', voicePitch: 1.09, voiceRate: 1.03, skin: '#C78968', skinShadow: '#A66B4C', hair: '#13121A', hairHighlight: '#8B68E0', hairStyle: 'bob', outfit: '#1C1928', glassesStyle: 'rect', glassesColor: '#9D7FEA', bgTint: '#171226' },
  { id: 'omar', name: 'Omar Farooq', role: 'Principal Security Eng', team: 'Cloud KMS & Lakehouse IAM · Dubai', voiceGender: 'male', voicePitch: 0.89, voiceRate: 0.98, skin: '#C99071', skinShadow: '#A97154', hair: '#14141C', hairHighlight: '#5A459C', hairStyle: 'short', outfit: '#161821', glassesStyle: 'round', glassesColor: '#C4B5FD', bgTint: '#10131F' },
  { id: 'rachel', name: 'Rachel Kim', role: 'Staff AI Pipeline Lead', team: 'Gemini Grounding & Eval · Seoul', voiceGender: 'female', voicePitch: 1.13, voiceRate: 1.04, skin: '#F2D8C8', skinShadow: '#D4B5A2', hair: '#181626', hairHighlight: '#A78BFA', hairStyle: 'long', outfit: '#191726', glassesStyle: 'round', glassesColor: '#9D7FEA', bgTint: '#161228' },
  { id: 'sanjay', name: 'Sanjay Kulkarni', role: 'Bar-Raiser Staff Eng', team: 'Google Cloud Consulting · Bengaluru', voiceGender: 'male', voicePitch: 0.91, voiceRate: 1.01, skin: '#CC8E6D', skinShadow: '#AC6F50', hair: '#15151C', hairHighlight: '#674FB5', hairStyle: 'parted', outfit: '#1A1B26', glassesStyle: 'rect', glassesColor: '#E4E4E7', bgTint: '#141222' },
  { id: 'zoe', name: 'Zoe Mercer', role: 'Staff Streaming Architect', team: 'Pub/Sub Lite & Edge IoT · Sydney', voiceGender: 'female', voicePitch: 1.06, voiceRate: 1.02, skin: '#F0D2C0', skinShadow: '#D1AF9B', hair: '#251E35', hairHighlight: '#9D7FEA', hairStyle: 'short', outfit: '#181824', glassesStyle: 'none', glassesColor: '#9D7FEA', bgTint: '#141323' },
  { id: 'tarun', name: 'Tarun Chatterjee', role: 'Principal Data Engineer', team: 'Retail & Supply Chain GCP · Gurgaon', voiceGender: 'male', voicePitch: 0.93, voiceRate: 1.0, skin: '#D39776', skinShadow: '#B27758', hair: '#14141D', hairHighlight: '#755BC9', hairStyle: 'short', outfit: '#191A25', glassesStyle: 'round', glassesColor: '#9D7FEA', bgTint: '#121321' },
  { id: 'amara', name: 'Amara Okafor', role: 'Staff Distributed Systems', team: 'Colossus & Parquet Engine · London', voiceGender: 'female', voicePitch: 1.03, voiceRate: 0.99, skin: '#8C5840', skinShadow: '#6E412B', hair: '#121118', hairHighlight: '#8E6CE6', hairStyle: 'curly', outfit: '#1D1A29', glassesStyle: 'rect', glassesColor: '#C4B5FD', bgTint: '#151225' },
  { id: 'ethan', name: 'Ethan Gallagher', role: 'Principal HC Calibration', team: 'Google Cloud APAC Bar-Raiser', voiceGender: 'male', voicePitch: 0.88, voiceRate: 0.98, skin: '#F1D5C5', skinShadow: '#D4B29F', hair: '#262033', hairHighlight: '#8366D9', hairStyle: 'parted', outfit: '#181A24', glassesStyle: 'rect', glassesColor: '#9D7FEA', bgTint: '#121322' },
];

export const INTERVIEWER_FEMALE_AVATAR = '/src/assets/images/avatar_google_interviewer_staff_1795704394774.jpg';
export const INTERVIEWER_MALE_AVATAR = '/src/assets/images/avatar_google_interviewer_principal_1795704395446.jpg';

export const GOOGLE_ROUND_ORDER: GoogleRoundId[] = [
  'OA / GHA',
  'Phone Screen',
  'Python & DSA',
  'SQL & Modeling',
  'Geospatial & System Design',
  'GenAI & RAG',
  'Googleyness',
];

export const MOCK_TIERS: MockTierName[] = [
  'Foundations (01-10)',
  'Scale & Performance (11-20)',
  'Geospatial & Petabyte Imagery (21-30)',
  'GenAI & RAG Ops (31-40)',
  'Bar-Raiser Consulting Loops (41-50)',
];

export interface PeerCompanyAssessment {
  id: string;
  name: string;
  emoji: string;
  roleFocus: string;
  roundsCount: number;
  status: 'Active' | 'Track Linked';
  recommendedTrackId: TrackId;
  keyTopics: string[];
}

export const PEER_COMPANIES: PeerCompanyAssessment[] = [
  { id: 'microsoft', name: 'Microsoft', emoji: '🪟', roleFocus: 'Azure Data Engineer (Fabric & Synapse)', roundsCount: 4, status: 'Track Linked', recommendedTrackId: 'cloud', keyTopics: ['Azure Fabric DirectLake', 'Event Hubs', 'PySpark', 'T-SQL Windowing'] },
  { id: 'uber', name: 'Uber', emoji: '🚗', roleFocus: 'Data Engineer II (Mobility & H3)', roundsCount: 5, status: 'Track Linked', recommendedTrackId: 'geospatial', keyTopics: ['H3 Spatial Indexing', 'Apache Flink', 'Presto/Trino', 'Skew Salting'] },
  { id: 'amazon', name: 'Amazon', emoji: '📦', roleFocus: 'Data Engineer II (AWS & Redshift)', roundsCount: 5, status: 'Track Linked', recommendedTrackId: 'modeling', keyTopics: ['Kimball Star Schema', 'Kinesis & Glue', 'SQL Tuning', 'Leadership Principles'] },
  { id: 'meta', name: 'Meta', emoji: '♾️', roleFocus: 'Data Engineer, Product Analytics', roundsCount: 4, status: 'Track Linked', recommendedTrackId: 'sql', keyTopics: ['Sessionization SQL', 'Python ETL', 'Product Metrics', 'Presto/Spark'] },
  { id: 'netflix', name: 'Netflix', emoji: '🎬', roleFocus: 'Senior Analytics / Data Platform Eng', roundsCount: 5, status: 'Track Linked', recommendedTrackId: 'sysdesign', keyTopics: ['Apache Iceberg', 'Flink Streaming', 'Data Mesh', 'High-Scale Ingestion'] },
  { id: 'snowflake', name: 'Snowflake', emoji: '❄️', roleFocus: 'Solutions / Data Platform Engineer', roundsCount: 4, status: 'Track Linked', recommendedTrackId: 'snowflake', keyTopics: ['Micro-Partitions', 'Dynamic Tables', 'Cortex AI', 'Query Profiling'] },
  { id: 'databricks', name: 'Databricks', emoji: '🧱', roleFocus: 'Resident Solutions Architect (Lakehouse)', roundsCount: 4, status: 'Track Linked', recommendedTrackId: 'databricks', keyTopics: ['Delta Lake ACID', 'Liquid Clustering', 'Photon Engine', 'DLT & Unity Catalog'] },
];

const BLANK_PY_SKELETON = `# Write your solution from scratch below (no pre-filled logic)
class Solution:
    def solve(self, data):
        # TODO: Implement O(N) or O(N log K) streaming / algorithmic logic
        pass

def solve(data):
    return Solution().solve(data)
`;

function blankSqlSkeleton(datasetId: string, title: string): string {
  const tbl =
    datasetId === 'ad_events_stream'
      ? 'ad_impressions'
      : datasetId === 'rideshare_trips'
      ? 'trips'
      : datasetId === 'cloud_billing_usage'
      ? 'gcp_billing_export'
      : datasetId === 'rag_telemetry'
      ? 'retrieval_logs'
      : datasetId === 'imagery_ops_telemetry'
      ? 'tile_ingestion_runs'
      : 'orders';
  return `-- ${title}\n-- Write your SQL query from scratch below\nSELECT *\nFROM ${tbl}\nLIMIT 5;`;
}

function getTierForMockNumber(num: number): MockTierName {
  if (num <= 10) return 'Foundations (01-10)';
  if (num <= 20) return 'Scale & Performance (11-20)';
  if (num <= 30) return 'Geospatial & Petabyte Imagery (21-30)';
  if (num <= 40) return 'GenAI & RAG Ops (31-40)';
  return 'Bar-Raiser Consulting Loops (41-50)';
}

interface DomainThemeSpec {
  title: string;
  difficulty: Difficulty;
  datasetId: string;
  context: string;
  geospatialTwist: string;
  genaiTwist: string;
  consultingBrief?: string;
}

const DOMAIN_THEMES: DomainThemeSpec[] = [
  { title: 'Omnichannel Retail Real-Time Telemetry & Cart Attribution', difficulty: 'Medium', datasetId: 'ecommerce_orders', context: '2M–10M daily POS & mobile checkout events across Indian metro stores', geospatialTwist: 'hyperlocal dark-store 10-min catchment routing with S2 cells', genaiTwist: 'multi-tenant catalog & inventory RAG assistant' },
  { title: '10+ TB Banking Flume-to-Pub/Sub & Spanner Ledger Modernization', difficulty: 'Hard', datasetId: 'cloud_billing_usage', context: '10+ TB legacy on-prem Flume + Hadoop banking batch migration to GCP', geospatialTwist: 'regional ATM fraud ring velocity & branch proximity detection', genaiTwist: 'RBI compliance audit RAG over policy PDFs & SQL catalogs' },
  { title: '5+ TB Healthcare Claims & Clinical Pipeline Optimization', difficulty: 'Hard', datasetId: 'ecommerce_orders', context: '5+ TB HIPAA/DPDP patient diagnostics & provider billing feeds', geospatialTwist: 'ambulance dispatch & hospital ICU capacity spatial grid', genaiTwist: 'clinician summarization grounding with strict patient ACL pre-filters' },
  { title: 'Google Ads Clickstream Deduplication & Multi-Touch Attribution', difficulty: 'Hard', datasetId: 'ad_events_stream', context: '500k events/sec ad impression & click logs with late mobile bursts', geospatialTwist: 'geo-fenced store-visit uplift attribution via H3 hexes', genaiTwist: 'advertiser campaign FinOps Text-to-SQL copilot' },
  { title: 'Rideshare Fleet GPS Ingestion & Dynamic Surge Pricing Engine', difficulty: 'Hard', datasetId: 'rideshare_trips', context: '1M GPS pings/sec across Koramangala, Indiranagar, and Airport corridors', geospatialTwist: 'dynamic H3 Resolution-8 supply/demand heatmaps under 3s p99', genaiTwist: 'driver support multi-lingual RAG triage agent' },
  { title: 'GCP Multi-Cloud FinOps & BigQuery Slot Governance Platform', difficulty: 'Medium', datasetId: 'cloud_billing_usage', context: '100+ GCP projects emitting granular billing & INFORMATION_SCHEMA telemetry', geospatialTwist: 'cross-region egress cost & sovereignty residency audit', genaiTwist: 'automated SQL query rewrite recommender powered by Gemini' },
  { title: 'Petabyte Satellite & Street-Level Imagery Tile Pipeline', difficulty: 'Hard', datasetId: 'imagery_ops_telemetry', context: 'Petabyte Cloud Storage TIFF/COG imagery ingestion & spatial indexing', geospatialTwist: 'ST_INTERSECTS skewed quadkey & S2 parent-cell decomposition', genaiTwist: 'multimodal road-sign & PoI visual indexing in Vertex Vector Search' },
  { title: 'Enterprise SaaS Subscription MRR & Bi-Temporal Revenue Mesh', difficulty: 'Medium', datasetId: 'ecommerce_orders', context: 'Retroactive plan upgrades, refunds, and multi-currency FX settlements', geospatialTwist: 'country-level GST/VAT tax nexus polygon lookup', genaiTwist: 'CFO earnings-prep grounded RAG over verified LookML metrics' },
  { title: 'Real-Time Fraud Velocity & Feature Store Parity Architecture', difficulty: 'Hard', datasetId: 'ad_events_stream', context: 'Sub-15ms online feature serving + zero-leakage offline BigQuery training', geospatialTwist: 'impossible-travel velocity calculation across S2 tokens', genaiTwist: 'fraud analyst case-investigation RAG with citation verification' },
  { title: 'In-Browser SQL AST & Pyodide Evaluation Sandbox Platform', difficulty: 'Medium', datasetId: 'rag_telemetry', context: 'High-concurrency sandboxed code/SQL execution & telemetry logging', geospatialTwist: 'edge PoP latency routing across APAC & EU workspaces', genaiTwist: 'context-aware code debugging cascade (Flash -> Pro)' },
];

const CONSULTING_BAR_RAISER_THEMES: DomainThemeSpec[] = [
  {
    title: 'Banking Flume + Hadoop (10+ TB/Day) to Dataflow & BigQuery Dual-Write Cutover',
    difficulty: 'Hard',
    datasetId: 'cloud_billing_usage',
    context: '10+ TB/day legacy Apache Flume + HDFS banking ingestion migrating to Cloud Pub/Sub, Dataflow & BigQuery',
    geospatialTwist: 'multi-region sovereign banking DR + branch catchment telemetry',
    genaiTwist: 'regulatory compliance lineage RAG over BigQuery audit tables',
    consultingBrief: 'Client Risk Ops fears silent data loss during cutover. Compare Dual-Write vs Shadow-Run validation, define 99.99% parity gates, and design a 15-min rollback switch.',
  },
  {
    title: 'Overhead Imagery Operational Dashboard, Looker BI Engine & DQ SLA Platform',
    difficulty: 'Hard',
    datasetId: 'imagery_ops_telemetry',
    context: '200M+ daily GeoTIFF/COG tile batches powering executive Looker freshness, completeness & anomaly dashboards',
    geospatialTwist: 'S2 regional tile completeness tracking & skewed hotspot isolation',
    genaiTwist: 'automated incident root-cause summarization over tile DQ logs',
    consultingBrief: 'Client Geo Ops reports 6s Looker dashboard loads and conflicting completeness %. Architect BigQuery Materialized Views + BI Engine + LookML semantic layer.',
  },
  {
    title: 'Ambiguous Retail VP Discovery: Hadoop-to-BigQuery Real-Time vs Micro-Batch TCO',
    difficulty: 'Hard',
    datasetId: 'ecommerce_orders',
    context: 'Legacy Cloudera Hadoop/Hive retail warehouse serving 2M–10M daily POS & online events',
    geospatialTwist: 'dark-store 10-min catchment H3 inventory balancing',
    genaiTwist: 'merchandising RAG copilot grounded in Looker semantic metrics',
    consultingBrief: 'Non-technical VP demands "real-time everything" on a tight budget and ESG carbon target. Guide stakeholder discovery to separate true streaming from BigQuery micro-batch.',
  },
  {
    title: 'On-Prem Teradata/Hive Warehouse Cutover: Shadow-Run Diffing & Carbon-Aware FinOps',
    difficulty: 'Hard',
    datasetId: 'cloud_billing_usage',
    context: '350 TB on-prem Teradata/Hive batch workloads moving to BigQuery Editions + Cloud Dataflow',
    geospatialTwist: 'low-CO2 GCP region placement & cross-border egress minimization',
    genaiTwist: 'automated Teradata-to-BigQuery SQL dialect migration verifier',
    consultingBrief: 'CFO questions the 60-day parallel shadow-run cost and carbon impact. Present FinOps slot autoscaling, DVT parity gates, and a firm legacy shutdown roadmap.',
  },
  {
    title: 'Healthcare Claims (5+ TB) Legacy Oozie/Spark Migration to Dataflow & Dataplex',
    difficulty: 'Hard',
    datasetId: 'imagery_ops_telemetry',
    context: '5+ TB clinical & claims pipelines plagued by Oozie bottlenecks and DPDP/HIPAA audit gaps',
    geospatialTwist: 'regional hospital ambulance catchment & clinic capacity SLA views',
    genaiTwist: 'privacy-masked clinical ops RAG with Cloud DLP policy tags',
    consultingBrief: 'Two weeks before UAT, client Ops requests converting batch claims feeds to streaming. Manage scope, de-risk UAT, and stage Wave 2 Dataflow streaming.',
  },
  {
    title: 'Global Logistics Flume-to-Pub/Sub Migration & Executive Completeness Scorecards',
    difficulty: 'Hard',
    datasetId: 'rideshare_trips',
    context: 'Legacy Flume + Kafka logistics telemetry migrating to Cloud Dataflow + BigQuery Storage Write API',
    geospatialTwist: 'port-to-warehouse GPS corridor geofencing & delay anomaly SLIs',
    genaiTwist: 'supply-chain disruption analyst RAG over live SLA telemetry',
    consultingBrief: 'Client SMEs disagree on "on-time delivery" definitions across 30 legacy scripts. Lead metric alignment, codify LookML contracts, and hand over Day-2 ops.',
  },
  {
    title: 'Telecom Petabyte CDR & Spatial Coverage Migration With Zero-Downtime Cutover',
    difficulty: 'Hard',
    datasetId: 'imagery_ops_telemetry',
    context: 'Multi-TB/hour cell-tower telemetry and aerial RF coverage maps moving off HDFS to BigQuery GIS',
    geospatialTwist: 'S2 cell spatial joins + BigQuery BI Engine regional coverage dashboards',
    genaiTwist: 'NOC alert triage RAG indexing historical tower incident postmortems',
    consultingBrief: 'Design strangler-fig migration from Spark/Hive to Dataflow + BigQuery while delivering sub-second Looker SLA/anomaly operational dashboards.',
  },
  {
    title: 'FinTech Double-Entry Ledger Migration: Dual-Write Parity & Rollback Bar-Raiser',
    difficulty: 'Hard',
    datasetId: 'ecommerce_orders',
    context: 'High-throughput UPI/card settlement pipelines transitioning from on-prem Oracle/Flume to GCP',
    geospatialTwist: 'impossible-travel geo-velocity fraud checks across merchant terminals',
    genaiTwist: 'auditor compliance evidence RAG with strict IAM row filtering',
    consultingBrief: 'Sponsor pressures team to waive 14-day shadow-run validation before quarter close. Defend automated DVT reconciliation and staged Authorized View rollback.',
  },
  {
    title: 'Enterprise BI Modernization: Looker Semantic Layer & Materialized View Ops Plane',
    difficulty: 'Hard',
    datasetId: 'imagery_ops_telemetry',
    context: 'Consolidating 15 fragmented Tableau/Hive reporting marts onto BigQuery + BI Engine + Looker',
    geospatialTwist: 'regional SLA heatmaps tracking freshness lag, completeness %, and throughput',
    genaiTwist: 'governed LookML Text-to-SQL assistant eliminating hallucinated KPIs',
    consultingBrief: 'Align Engineering, Finance, and Client Executives around standardized DQ SLOs, error-budget burn alerts, and automated MV refresh workflows.',
  },
  {
    title: 'Google Cloud Consulting Bengaluru Final Bar-Raiser: Ambiguous Multi-Cloud Cutover',
    difficulty: 'Hard',
    datasetId: 'cloud_billing_usage',
    context: 'Multi-region AWS/Hadoop-to-GCP Dataflow & BigQuery modernization for a global enterprise client',
    geospatialTwist: 'cross-cloud egress optimization + low-carbon GCP region routing',
    genaiTwist: 'Gemini-assisted data contract enforcement & FinOps anomaly copilot',
    consultingBrief: 'End-to-end consulting loop testing ambiguous stakeholder discovery, Flume/Hadoop migration cutover + rollback, BI Engine acceleration, and Day-2 handoff.',
  },
];

function buildSixRoundsForMock(
  mockIdx: number,
  primaryInterviewerIdx: number,
  theme: DomainThemeSpec
): MockRoundStep[] {
  const pickInterviewer = (offset: number): InterviewerProfile =>
    INTERVIEWER_ROSTER[(primaryInterviewerIdx + offset) % INTERVIEWER_ROSTER.length];
  const isConsultingBarRaiser = mockIdx >= 40;

  return [
    {
      roundNumber: 1,
      roundLabel: '1. OA / GHA',
      roundType: 'OA / GHA',
      interviewer: pickInterviewer(0),
      durationMinutes: 45,
      workspaceMode: 'ide',
      starterCode: BLANK_PY_SKELETON,
      questionPrompt: `[Round 1 — Online / GHA Screening] ${theme.title}: Given an out-of-order stream of events (${theme.context}), implement a bounded sliding-window deduplicator and throttle filter in Python. State your time and space complexity before coding.`,
      clarifyingPrompts: [
        'Are timestamps strictly monotonic or can mobile/edge batches arrive out of order?',
        'What is the memory ceiling per worker key (millions of active keys vs bounded window)?',
        'How should tie-breaks behave when two duplicate event_ids share the exact same epoch second?',
      ],
      expectedSignals: ['Amortized O(1) per event via deque/heap', 'Explicit out-of-order watermark handling', 'Clear Big-O space & throughput bounds'],
      followUps: ['How would this state serialize cleanly in Apache Beam / Dataflow checkpoints?', 'What happens during a 10x festival traffic spike?'],
    },
    {
      roundNumber: 2,
      roundLabel: '2. Phone Screen',
      roundType: 'Phone Screen',
      interviewer: pickInterviewer(4),
      durationMinutes: 45,
      workspaceMode: 'conceptual',
      questionPrompt: isConsultingBarRaiser
        ? `[Round 2 — Consulting Discovery & Phone Screen] ${theme.consultingBrief} Walk through how you run stakeholder discovery with non-technical leaders, compare Dual-Write vs Shadow-Run migration validation, and diagnose BigQuery slot/BI Engine bottlenecks.`
        : `[Round 2 — Technical Phone Screen] A client running ${theme.context} hits 3.5-hour SLAs and $40k/mo slot overages on BigQuery + Spark. Walk through your exact diagnostic playbook across storage layout, partition pruning, shuffle skew, and slot reservations.`,
      clarifyingPrompts: isConsultingBarRaiser
        ? [
            'What latency SLA does the business actually need per KPI (5s streaming vs 15-min micro-batch)?',
            'Can legacy Flume/Hadoop producers tolerate dual-write hooks or must we isolate via shadow replay?',
            'What are the client’s FinOps budget and sustainability/region residency constraints?',
          ]
        : [
            'Is the workload flat-rate Editions Autoscaling or on-demand per-TB billing?',
            'Are bottlenecks concentrated in one shuffle stage (skew) or broad table scans?',
            'What is the fresh-data SLA (batch hourly vs sub-minute CDC)?',
          ],
      expectedSignals: isConsultingBarRaiser
        ? ['Structured stakeholder discovery translating business KPIs to SLA tiers', 'Dual-Write vs Shadow-Run & 15-min rollback gate design', 'BigQuery Materialized Views + BI Engine & carbon-aware FinOps']
        : ['INFORMATION_SCHEMA.JOBS_BY_PROJECT triage', 'Sargable partitioning + 4-col clustering', 'Salted joins vs Broadcast threshold math'],
      followUps: ['When does BigQuery BI Engine / Materialized Views beat Dataproc?', 'How do you prove 99.99% migration parity before decommissioning Hadoop?'],
    },
    {
      roundNumber: 3,
      roundLabel: '3. Python & DSA',
      roundType: 'Python & DSA',
      interviewer: pickInterviewer(8),
      durationMinutes: 45,
      workspaceMode: 'ide',
      starterCode: BLANK_PY_SKELETON,
      questionPrompt: `[Round 3 — Python & DSA Coding] For ${theme.title}, merge K sorted GCS partition iterators into a single deterministic stream and identify the Top-K heavy hitter keys without loading the full dataset into memory.`,
      clarifyingPrompts: [
        'Can K exceed 10,000 partitions (small-file problem)?',
        'Are tie-breakers deterministic by partition_id or event_ts?',
        'Do we need exact Top-K or Count-Min Sketch / Space-Saving approximation?',
      ],
      expectedSignals: ['O(N log K) min-heap external k-way merge', 'O(K) bounded memory generator pattern', 'Clean handling of empty partitions & duplicates'],
      followUps: ['How would you parallelize a 2-level merge tree across 100 Dataflow workers?', 'Compare exact Top-K vs streaming HyperLogLog / CMS.'],
    },
    {
      roundNumber: 4,
      roundLabel: '4. SQL & Modeling',
      roundType: 'SQL & Modeling',
      interviewer: pickInterviewer(12),
      durationMinutes: 45,
      workspaceMode: 'ide',
      datasetId: theme.datasetId,
      starterCode: blankSqlSkeleton(theme.datasetId, `Round 4: ${theme.title}`),
      questionPrompt:
        theme.datasetId === 'imagery_ops_telemetry'
          ? `[Round 4 — Operational BI SQL & Modeling] Using tile_ingestion_runs, pipeline_sla_targets, and bi_query_audit, compute freshness lag, weighted tile completeness %, anomaly rate %, and BI Engine acceleration coverage, then design the Looker semantic layer + BigQuery Materialized View schema.`
          : `[Round 4 — SQL & Dimensional Modeling] Using the pre-loaded schema, deduplicate double-fired records, assign 30-minute inactivity session windows, and design the downstream Kimball star schema + Looker semantic layer supporting SCD Type 2 historical attributes.`,
      clarifyingPrompts: [
        'What is the exact fact table grain (one row per event/run vs per hourly MV bucket)?',
        'Why must ratios like completeness % be stored as additive numerators/denominators in the semantic layer?',
        'Which attributes belong in SCD Type 2 vs Type 1?',
      ],
      expectedSignals: ['Weighted ratio aggregation & window analytics', 'Explicit fact grain declaration + Materialized View / BI Engine alignment', 'SCD Type 2 [effective_from, effective_to) with surrogate keys'],
      followUps: ['How do you prevent BigQuery Materialized Views from silently losing incremental refresh?', 'Compare dbt incremental insert_overwrite vs MERGE on BigQuery.'],
    },
    {
      roundNumber: 5,
      roundLabel: '5. System Design',
      roundType: 'Geospatial & System Design',
      interviewer: pickInterviewer(16),
      durationMinutes: 45,
      workspaceMode: 'architecture',
      questionPrompt: isConsultingBarRaiser
        ? `[Round 5 — GCP Consulting Migration & BI Architecture] Architect the end-to-end migration & operational platform for ${theme.title}. ${theme.consultingBrief} Address ${theme.geospatialTwist}, Cloud Dataflow watermarks, BigQuery Storage Write API, Looker BI Engine dashboards, and reversible cutover rollback.`
        : `[Round 5 — System & Geospatial Design] Architect the end-to-end GCP platform for ${theme.title}, explicitly solving ${theme.geospatialTwist} with <5s p99 streaming freshness, schema contracts, DLQ replay, and multi-region DR.`,
      clarifyingPrompts: [
        'What is peak burst QPS and daily TB/PB volume for capacity & slot math?',
        'What dual-write vs shadow-run parity threshold unlocks production cutover?',
        'What are RPO, RTO, and rollback targets if a cutover wave exhibits metric drift?',
      ],
      expectedSignals: isConsultingBarRaiser
        ? ['End-to-end Flume/Hadoop -> Pub/Sub -> Dataflow -> BigQuery migration topology', 'Shadow-run / DVT parity gates + 15-min Authorized View rollback plan', 'Looker + BI Engine operational SLA dashboard & carbon/FinOps optimization']
        : ['End-to-end throughput & storage PB/yr math', 'S2/H3 spatial key salting against Koramangala/hot-zone Bigtable skew', 'Pub/Sub + Dataflow watermarks + BigQuery Storage Write + Bigtable serving'],
      followUps: ['How do BigQuery Editions Autoscaling and low-CO2 GCP region selection reduce both TCO and carbon emissions?', 'Walk through zero-downtime backfill when schema or H3 resolution evolves.'],
    },
    {
      roundNumber: 6,
      roundLabel: '6. GenAI & Googleyness',
      roundType: 'Googleyness',
      interviewer: pickInterviewer(20),
      durationMinutes: 45,
      workspaceMode: 'conceptual',
      questionPrompt: isConsultingBarRaiser
        ? `[Round 6 — Consulting Stakeholder Discovery & Googleyness Bar-Raiser] Part A: Design the ${theme.genaiTwist} with governed LookML/BigQuery grounding and eval CI gates. Part B: Role-play guiding a non-technical client VP/CFO through ambiguous real-time demands, legacy Flume/Hadoop migration risks, and Day-2 team enablement (anchor in STAR+L metrics).`
        : `[Round 6 — GenAI Ops & Googleyness Bar-Raiser] Part A: Design the ${theme.genaiTwist} with incremental indexing, ACL pre-filtering, and RAGAS CI gates. Part B: Describe a high-stakes time you pushed back on a client or VP pushing an unsafe or over-engineered architecture (anchor in your 10+ TB banking/healthcare/retail experience).`,
      clarifyingPrompts: [
        'Who owns document/metric ACL truth and how do you prevent semantic drift?',
        'How do you align an impatient client sponsor around phased shadow validation vs skipping tests?',
        'In your behavioral story, what concrete latency, cost, or reliability metric proved your recommendation?',
      ],
      expectedSignals: ['Pre-filtered ACL namespaces + grounded semantic layer', 'Empathetic non-technical executive framing & risk-tiered compromises', 'Structured STAR+L ownership, measurable impact & Day-2 handoff rigor'],
      followUps: ['How do you prevent prompt injection or cross-tenant leakage in Text-to-SQL?', 'What did you change in your own consulting discovery playbook after a tough project?'],
    },
  ];
}

export const GOOGLE_MOCKS: MockInterviewRound[] = Array.from({ length: 50 }, (_, idx) => {
  const num = idx + 1;
  const code = `Mock #${String(num).padStart(2, '0')}`;
  const tier = getTierForMockNumber(num);

  // Rotate primary interviewer cleanly across all 26 distinct Google specialists so no adjacent cards ever repeat!
  const primaryInterviewerIdx = idx % INTERVIEWER_ROSTER.length;
  const primaryProfile = INTERVIEWER_ROSTER[primaryInterviewerIdx];
  const theme =
    num >= 41
      ? CONSULTING_BAR_RAISER_THEMES[(num - 41) % CONSULTING_BAR_RAISER_THEMES.length]
      : DOMAIN_THEMES[idx % DOMAIN_THEMES.length];

  const primaryRoundTypes: GoogleRoundId[] = [
    'OA / GHA',
    'Phone Screen',
    'Python & DSA',
    'SQL & Modeling',
    'Geospatial & System Design',
    'GenAI & RAG',
    'Googleyness',
  ];
  const leadRoundType: GoogleRoundId =
    num <= 10
      ? primaryRoundTypes[idx % 4]
      : num <= 20
      ? primaryRoundTypes[(idx % 4) + 1]
      : num <= 30
      ? 'Geospatial & System Design'
      : num <= 40
      ? 'GenAI & RAG'
      : (['Geospatial & System Design', 'Googleyness', 'SQL & Modeling', 'Phone Screen'] as GoogleRoundId[])[
          (num - 41) % 4
        ];

  const sixRounds = buildSixRoundsForMock(idx, primaryInterviewerIdx, theme);
  const leadStep = sixRounds.find((r) => r.roundType === leadRoundType) || sixRounds[0];

  const diff: Difficulty =
    num <= 8 ? (num % 2 === 0 ? 'Medium' : 'Easy') : num <= 35 ? theme.difficulty : 'Hard';

  return {
    id: `google-mock-${String(num).padStart(2, '0')}`,
    mockNumber: num,
    code,
    tier,
    title: num >= 41 ? `${theme.title} — Consulting Bar-Raiser` : `${theme.title} — ${tier.split(' ')[0]} Loop`,
    roundType: leadRoundType,
    durationMinutes: 45,
    difficulty: diff,
    targetRole: 'Data Engineer (3 YoE) — Google Cloud Consulting, Bengaluru',
    interviewerName: primaryProfile.name,
    interviewerRole: `${primaryProfile.role} · ${primaryProfile.team}`,
    interviewerAvatar: primaryProfile.voiceGender === 'female' ? INTERVIEWER_FEMALE_AVATAR : INTERVIEWER_MALE_AVATAR,
    interviewerProfile: primaryProfile,
    questionPrompt: leadStep.questionPrompt,
    workspaceMode: leadStep.workspaceMode,
    datasetId: leadStep.datasetId,
    starterCode: leadStep.starterCode,
    expectedSignals: leadStep.expectedSignals,
    followUps: leadStep.followUps,
    sixRounds,
  };
});

export function buildWeakSpotCustomMock(weakTrackIds: TrackId[]): MockInterviewRound {
  const focusLabel = weakTrackIds.slice(0, 3).join(' · ').toUpperCase() || 'SQL · PYSPARK · SYSDESIGN';
  const base = GOOGLE_MOCKS[40]; // Bar-raiser structure
  return {
    ...base,
    id: `google-mock-weakspot-${Date.now()}`,
    mockNumber: 99,
    code: 'Custom Loop',
    tier: 'Bar-Raiser Consulting Loops (41-50)',
    title: `Weak-Spot Targeted 6-Round Mock (${focusLabel})`,
    questionPrompt: `Adaptive Google Cloud Consulting Loop calibrated directly to your lowest-scoring tracks (${focusLabel}). Complete the 2-minute GCA Clarifying Questions Gate before coding.`,
  };
}
