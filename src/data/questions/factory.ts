import {
  ArchitectureSpec,
  ConceptualSpec,
  Difficulty,
  DsaPattern,
  FollowUpItem,
  IdeTestCase,
  ModelingSpec,
  Question,
  QuestionApproach,
  QuestionExample,
  TrackId,
  WorkspaceType,
} from '../../types/platform';

export interface QuestionSeed {
  title: string;
  company: string;
  difficulty: Difficulty;
  concept: string;
  dsaPattern?: DsaPattern;
  tags: string[];
  prompt?: string;
  workspaceType?: WorkspaceType;
  language?: 'sql' | 'python' | 'pyspark';
  datasetId?: string;
  starterCode?: string;
  buggyCode?: string;
  solutionCode?: string;
  constraints?: string[];
  examples?: QuestionExample[];
  approaches?: QuestionApproach[];
  followUps?: FollowUpItem[];
  testCases?: IdeTestCase[];
  architectureSpec?: ArchitectureSpec;
  modelingSpec?: ModelingSpec;
  conceptualSpec?: ConceptualSpec;
}

const HYPERSCALERS = new Set(['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix']);
const DATA_LEADERS = new Set(['Snowflake', 'Databricks']);

export function getCompanyTier(company: string): Question['companyTier'] {
  if (HYPERSCALERS.has(company)) return 'FAANG / Hyperscaler';
  if (DATA_LEADERS.has(company)) return 'Data Platform Leader';
  return 'High-Scale Tech';
}

export function buildTrackQuestions(
  trackId: TrackId,
  defaultWorkspace: WorkspaceType,
  defaultLanguage: 'sql' | 'python' | 'pyspark' | undefined,
  defaultDatasetId: string | undefined,
  seeds: QuestionSeed[]
): Question[] {
  return seeds.map((seed, idx) => {
    const num = idx + 1;
    const id = `${trackId}-${String(num).padStart(3, '0')}`;
    const workspaceType = seed.workspaceType || defaultWorkspace;
    const language = seed.language || defaultLanguage;
    const datasetId = seed.datasetId || defaultDatasetId;

    const prompt =
      seed.prompt ||
      buildRichPrompt(trackId, seed.title, seed.company, seed.concept, seed.tags, workspaceType);

    let starterCode = seed.starterCode;
    let buggyCode = seed.buggyCode;
    let solutionCode = seed.solutionCode;
    let testCases = seed.testCases;
    let examples = seed.examples;
    let approaches = seed.approaches;
    let constraints = seed.constraints;
    let architectureSpec = seed.architectureSpec;
    let modelingSpec = seed.modelingSpec;
    let conceptualSpec = seed.conceptualSpec;

    if (workspaceType === 'ide') {
      if (language === 'sql') {
        const ds = datasetId || 'ecommerce_orders';
        const defaults = getDefaultSqlTemplates(ds, seed.title, seed.concept);
        starterCode = starterCode || defaults.starter;
        solutionCode = solutionCode || defaults.solution;
        testCases = testCases || defaults.tests;
        examples = examples || defaults.examples;
        approaches = approaches || defaults.approaches;
        constraints = constraints || defaults.constraints;
      } else if (language === 'pyspark') {
        const defaults = getDefaultPySparkTemplates(seed.title, seed.concept);
        starterCode = starterCode || defaults.starter;
        buggyCode = buggyCode || defaults.buggy;
        solutionCode = solutionCode || defaults.solution;
        testCases = testCases || defaults.tests;
        examples = examples || defaults.examples;
        approaches = approaches || defaults.approaches;
        constraints = constraints || defaults.constraints;
      } else {
        const defaults = getDefaultPythonTemplates(seed.title, seed.concept, trackId === 'dsa');
        starterCode = starterCode || defaults.starter;
        buggyCode = buggyCode || defaults.buggy;
        solutionCode = solutionCode || defaults.solution;
        testCases = testCases || defaults.tests;
        examples = examples || defaults.examples;
        approaches = approaches || defaults.approaches;
        constraints = constraints || defaults.constraints;
      }
    }

    const followUps = seed.followUps || buildFollowUps(trackId, seed.title, seed.company, seed.concept, workspaceType);

    if (workspaceType === 'architecture' && !architectureSpec) {
      architectureSpec = {
        scenario: `${seed.company} operates a multi-region data platform handling high-throughput telemetry and analytical workloads. You are tasked with designing "${seed.title}" leveraging ${seed.tags.join(', ')}.`,
        task: `Architect an end-to-end fault-tolerant pipeline covering ingestion, stream/batch compute, lakehouse/warehouse storage, governance, and observability for ${seed.concept}.`,
        scaleConstraints: [
          'Peak ingestion: 250,000 events/sec with 3x burst spikes during regional traffic surges',
          'Freshness SLA: < 60 seconds end-to-end p99 for operational alerts; < 15 min for analytical marts',
          'Durability & Correctness: Exactly-once sink semantics, zero silent data loss, schema evolution support',
          'Cost & Governance: Partition pruning, lifecycle tiering, PII column masking & audit lineage',
        ],
        approachGuide: [
          '1. Clarify ingestion sources, payload schemas, ordering guarantees, and late-arrival windows.',
          '2. Select decoupled message transport (Pub/Sub or Kafka) with DLQ & schema registry validation.',
          '3. Design stateful compute (Dataflow/Flink/Spark) with event-time watermarks & idempotent upserts.',
          '4. Partition & cluster the analytical serving layer and wire observability/SLA alerting.',
        ],
        hints: [
          `Consider how ${seed.concept} prevents hot-key skew or excessive small files under burst traffic.`,
          'Always attach a Dead-Letter Queue (DLQ) for malformed records rather than stalling consumer checkpoints.',
          'Explain the trade-off between micro-batch cost efficiency and continuous streaming latency.',
        ],
        recommendedComponents: ['Kafka / Pub/Sub', 'Dataflow / Flink', 'BigQuery / Iceberg', 'Schema Registry', 'Monitoring & DLQ'],
      };
    }

    if (workspaceType === 'modeling' && !modelingSpec) {
      modelingSpec = {
        problem: seed.title,
        businessContext: `${seed.company} analytics teams need a governed dimensional model for "${seed.title}" supporting historical point-in-time reporting, fast BI aggregation, and auditable metric definitions.`,
        requirements: [
          `Declare explicit grain for primary Fact table(s) supporting ${seed.concept}.`,
          'Track historical dimension attribute changes with SCD Type 2 validity intervals and surrogate keys.',
          'Support multi-currency or multi-timezone attribution without fan-out duplication.',
          'Optimize warehouse storage with date partitioning and high-selectivity clustering keys.',
        ],
        constraints: [
          '500M+ daily fact rows; BI p95 dashboard latency < 2.5 seconds',
          'Late-arriving dimension updates up to 72 hours after fact event timestamp',
          'Zero double-counting across many-to-many relationships (use Bridge tables when needed)',
        ],
        approachGuide: [
          '1. Identify the business process and state the atomic grain in one crisp sentence.',
          '2. Choose Conformed Dimensions (Date, Customer, Product, Geography) with surrogate keys.',
          '3. Design Fact table measures (additive, semi-additive, non-additive) and foreign keys.',
          '4. Handle slowly changing attributes (SCD Type 2) and many-to-many hierarchies via Bridge tables.',
          '5. Add warehouse partitioning, clustering, and data quality uniqueness/not-null contracts.',
        ],
        starterTables: [
          {
            id: 'tbl-fact-main',
            name: 'fact_core_events',
            tableType: 'FACT',
            grain: 'One row per atomic business event',
            x: 340,
            y: 80,
            columns: [
              { id: 'c1', name: 'event_sk', dataType: 'BIGINT', keyType: 'PK' },
              { id: 'c2', name: 'entity_sk', dataType: 'BIGINT', keyType: 'FK' },
              { id: 'c3', name: 'date_key', dataType: 'INT', keyType: 'FK' },
              { id: 'c4', name: 'event_ts', dataType: 'TIMESTAMP', keyType: '' },
              { id: 'c5', name: 'metric_amount', dataType: 'DECIMAL(14,2)', keyType: '' },
            ],
          },
          {
            id: 'tbl-dim-entity',
            name: 'dim_entity_scd2',
            tableType: 'DIM',
            grain: 'One row per entity version',
            x: 40,
            y: 80,
            columns: [
              { id: 'd1', name: 'entity_sk', dataType: 'BIGINT', keyType: 'PK' },
              { id: 'd2', name: 'entity_id', dataType: 'VARCHAR(64)', keyType: 'NK' },
              { id: 'd3', name: 'segment_tier', dataType: 'VARCHAR(32)', keyType: '' },
              { id: 'd4', name: 'effective_from', dataType: 'TIMESTAMP', keyType: '' },
              { id: 'd5', name: 'effective_to', dataType: 'TIMESTAMP', keyType: '' },
              { id: 'd6', name: 'is_current', dataType: 'BOOLEAN', keyType: '' },
            ],
          },
        ],
      };
    }

    if (workspaceType === 'conceptual' && !conceptualSpec) {
      const isBehavioral = trackId === 'behavioral';
      conceptualSpec = {
        scenario: prompt,
        keyTopics: seed.tags,
        rubricChecklist: isBehavioral
          ? [
              'Clear Situation & personal ownership ("I" vs vague "we")',
              'Explicit constraints, stakeholder tensions, and trade-offs evaluated',
              'Concrete technical or organizational actions taken',
              'Quantified business/SLA impact + blameless learnings',
            ]
          : [
              `Accurate explanation of ${seed.concept} storage/execution mechanics`,
              'Concrete failure modes, edge cases, and backpressure/consistency behavior',
              'Clear comparison of alternatives & when to pick each in production',
              'Quantified latency, throughput, or cost implications',
            ],
        followUpProbes: followUps.map((f) => f.question),
        sampleOutline: isBehavioral
          ? `Situation: Describe context, scale, and competing priorities at ${seed.company}-scale.\nTask: Clarify your specific ownership as a 3-year Data Engineer.\nAction: Detail alignment steps, prototype/benchmarking, and pragmatic rollout.\nResult: Share measurable latency/cost/reliability gains and retrospective takeaway.`
          : `1. Core Mechanism: Define how ${seed.concept} works under the hood.\n2. Complexity & I/O Profile: Contrast disk/network/memory bottlenecks.\n3. Production Trade-offs: Compare managed cloud options vs self-hosted defaults.\n4. Failure Recovery: Detail idempotency, retries, and observability.`,
      };
    }

    return {
      id,
      number: num,
      trackId,
      title: seed.title,
      prompt,
      difficulty: seed.difficulty,
      company: seed.company,
      companyTier: getCompanyTier(seed.company),
      tags: seed.tags,
      concept: seed.concept,
      dsaPattern: seed.dsaPattern,
      workspaceType,
      language,
      datasetId,
      starterCode,
      buggyCode,
      solutionCode,
      constraints,
      examples,
      approaches,
      followUps,
      testCases,
      architectureSpec,
      modelingSpec,
      conceptualSpec,
    };
  });
}

function buildRichPrompt(
  trackId: TrackId,
  title: string,
  company: string,
  concept: string,
  tags: string[],
  workspaceType: WorkspaceType
): string {
  if (trackId === 'behavioral') {
    return `${title}. Structure your response using STAR+L (Situation, Task, Action, Result, Learnings), highlighting personal ownership, stakeholder alignment, trade-off rigor, and measurable engineering impact around ${tags.join(', ')}.`;
  }
  if (workspaceType === 'conceptual') {
    return `${title}. Walk through the underlying storage, networking, and distributed execution mechanics of ${concept}, evaluate production failure modes, and contrast architectural trade-offs across ${tags.join(', ')}.`;
  }
  if (workspaceType === 'architecture') {
    return `${title}. Design a scalable, fault-tolerant ${company}-grade data architecture addressing ${concept} (${tags.join(', ')}) with explicit ingestion, compute, serving, observability, and cost/governance layers.`;
  }
  if (workspaceType === 'modeling') {
    return `${title}. Design the Fact, Dimension, and Bridge tables with explicit atomic grain, surrogate keys, SCD Type 2 validity intervals, and warehouse partitioning/clustering for ${concept}.`;
  }
  return `${title}. Implement a clean, deterministic, and scale-safe solution applying ${concept} (${tags.join(', ')}). Handle edge cases including empty inputs, nulls, ties, and late-arriving records.`;
}

function buildFollowUps(
  trackId: TrackId,
  title: string,
  company: string,
  concept: string,
  workspaceType: WorkspaceType
): FollowUpItem[] {
  if (trackId === 'behavioral') {
    return [
      {
        question: 'If you had to redo this initiative today with 50% less engineering bandwidth, what would you automate or descope first?',
        staffAnswer: 'Prioritize an 80/20 managed pipeline MVP (e.g., BigQuery + dbt incremental + automated schema contracts) and defer custom self-hosted orchestrators until SLA bottlenecks prove necessary.',
        tradeOffs: 'Trades short-term bespoke flexibility for faster time-to-value, lower operational toil, and predictable TCO.',
      },
      {
        question: 'How did you bring skeptical product or executive stakeholders on board when your technical recommendation delayed an initial launch date?',
        staffAnswer: 'Quantify blast radius with concrete staging replay data and offer a phased launch: Phase 1 delivers core SLA dashboards with strict quality gates; Phase 2 enables streaming backfill.',
        tradeOffs: 'Avoids all-or-nothing deadlock while protecting production data trust.',
      },
      {
        question: 'What concrete observability guardrail did you put in place afterward so this class of issue cannot recur silently?',
        staffAnswer: 'Added row-count & null-rate circuit breakers in CI/CD plus partition freshness monitors routed to PagerDuty with automated quarantine tables.',
        tradeOffs: 'Slight pipeline overhead (<2%) in exchange for zero silent metric corruption.',
      },
    ];
  }

  return [
    {
      question: `How does your approach to "${title}" behave under 10x burst traffic or extreme hot-key skew (e.g., 40% of events sharing a single NULL or VIP key)?`,
      staffAnswer: `Isolate skewed keys via deterministic key salting (0..K-1) or two-stage partial aggregation before global reduce, and filter NULL join keys prior to shuffles so single workers never OOM.`,
      tradeOffs: 'Adds one lightweight local pre-aggregation stage (~8% compute) to eliminate O(N) tail-latency stragglers and disk spills.',
    },
    {
      question: `What breaks when upstream events arrive 48 hours late or double-fire due to at-least-once delivery?`,
      staffAnswer: `Use event-time watermarks combined with a dynamic 3-day lookback partition overwrite or idempotent MERGE keyed on deterministic event_id / composite business key, routing expired stragglers to a Dead-Letter Queue.`,
      tradeOffs: '3-day lookback increases scanned partition cost slightly but guarantees eventual accuracy without full-table backfills.',
    },
    {
      question: `At ${company} petabyte scale, how would you optimize storage layout and ${workspaceType === 'ide' ? 'slot/memory cost' : 'end-to-end SLA cost'} for ${concept}?`,
      staffAnswer: `Partition strictly by event DATE, cluster/Z-order on top-4 selective filter keys, project only needed columns (never SELECT *), and enforce partition filter guardrails in CI.`,
      tradeOffs: 'Balances clustering write compaction cost against 10x–50x reduction in analytical bytes scanned.',
    },
  ];
}

function getDefaultSqlTemplates(datasetId: string, title: string, concept: string) {
  if (datasetId === 'ad_events_stream') {
    return {
      starter: `-- ${title}\n-- Concept: ${concept}\n-- Tables: campaigns, ad_impressions, ad_clicks\n-- Write your SQL query below:\n\nSELECT\n  \nFROM campaigns\nLIMIT 10;`,
      solution: `WITH dedup_imp AS (\n  SELECT DISTINCT event_id, user_id, campaign_id, event_ts, cost_micros\n  FROM ad_impressions\n)\nSELECT\n  c.campaign_id,\n  c.advertiser,\n  COUNT(i.event_id) AS impressions,\n  COUNT(k.click_id) AS clicks,\n  ROUND(100.0 * COUNT(k.click_id) / NULLIF(COUNT(i.event_id), 0), 2) AS ctr_pct\nFROM campaigns c\nLEFT JOIN dedup_imp i ON c.campaign_id = i.campaign_id\nLEFT JOIN ad_clicks k ON i.event_id = k.event_id\nGROUP BY c.campaign_id, c.advertiser\nORDER BY ctr_pct DESC;`,
      constraints: [
        '1 <= campaigns <= 10^5; 1 <= ad_impressions <= 10^9 in BigQuery production',
        'ad_impressions may contain duplicate event_id records from mobile SDK retries',
        'Handle zero-impression campaigns safely using NULLIF to avoid division by zero',
      ],
      examples: [
        {
          title: 'Example 1 — Deduplicated Campaign CTR',
          inputTable: {
            tableName: 'ad_impressions (sample)',
            columns: ['event_id', 'user_id', 'campaign_id', 'event_ts'],
            rows: [
              ['imp-1', 'u-01', 501, '2026-10-01 10:00:00'],
              ['imp-4', 'u-02', 502, '2026-10-01 09:30:00'],
              ['imp-5', 'u-02', 502, '2026-10-01 09:30:00'],
            ],
          },
          outputTable: {
            tableName: 'Expected Result',
            columns: ['campaign_id', 'advertiser', 'impressions', 'clicks', 'ctr_pct'],
            rows: [
              [501, 'VertexCloud', 3, 2, 66.67],
              [502, 'QuickPay IN', 3, 2, 66.67],
              [503, 'UrbanMobility', 2, 0, 0.0],
            ],
          },
          explanation: 'Deduplicating by event_id prevents inflated denominator counts before computing click-through rate per campaign.',
        },
      ],
      approaches: [
        {
          name: 'Approach 1: DISTINCT Subquery + Outer LEFT JOINs',
          tier: 'Brute Force' as const,
          intuition: 'Eliminate duplicate impressions via SELECT DISTINCT inside a CTE before joining campaigns and clicks.',
          walkthrough: ['Scan ad_impressions once with DISTINCT across event columns.', 'LEFT JOIN campaigns so zero-traffic campaigns remain visible.', 'Use NULLIF(impressions, 0) for safe CTR division.'],
          complexity: 'O(N log N) sort/hash distinct',
          costProfile: 'Moderate shuffle on event_id',
          code: `WITH dedup_imp AS (\n  SELECT DISTINCT event_id, campaign_id FROM ad_impressions\n)\nSELECT c.campaign_id, COUNT(i.event_id) AS impressions, COUNT(k.click_id) AS clicks\nFROM campaigns c\nLEFT JOIN dedup_imp i ON c.campaign_id = i.campaign_id\nLEFT JOIN ad_clicks k ON i.event_id = k.event_id\nGROUP BY c.campaign_id;`,
        },
        {
          name: 'Approach 2: Pre-Aggregated Fact CTEs + Window / Hash Join',
          tier: 'Optimized' as const,
          intuition: 'Aggregate clicks per event_id BEFORE joining back to campaigns to prevent join cardinality fan-out.',
          walkthrough: ['Deduplicate impressions via ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY event_ts) = 1.', 'Join aggregated clicks at campaign grain.', 'Compute CTR and rank with window functions in one pass.'],
          complexity: 'O(N) hash partition in distributed engines',
          costProfile: 'Low slot usage; avoids many-to-many explosion',
          code: `WITH clean_imp AS (\n  SELECT event_id, campaign_id,\n         ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY event_ts) AS rn\n  FROM ad_impressions\n)\nSELECT c.campaign_id, c.advertiser, COUNT(i.event_id) AS impressions, COUNT(k.click_id) AS clicks\nFROM campaigns c\nLEFT JOIN clean_imp i ON c.campaign_id = i.campaign_id AND i.rn = 1\nLEFT JOIN ad_clicks k ON i.event_id = k.event_id\nGROUP BY c.campaign_id, c.advertiser;`,
        },
        {
          name: 'Approach 3: BigQuery Partitioned Incremental Rollup + Approx Sketch',
          tier: 'At-Scale Production' as const,
          intuition: 'At 10B+ daily events, pre-aggregate hourly campaign rollups partitioned by DATE(event_ts) and clustered by campaign_id.',
          walkthrough: ['Use dbt insert_overwrite on 3-day lookback partition.', 'Store HLL sketches for exact-ish unique reach without shuffle OOM.', 'Cluster by campaign_id for <1s Looker BI queries.'],
          complexity: 'O(P) partition-pruned scan',
          costProfile: '95%+ bytes-scanned savings vs raw scan',
          code: `-- BigQuery Materialized Incremental Mart\nSELECT DATE(event_ts) AS dt, campaign_id,\n       COUNT(DISTINCT event_id) AS impressions\nFROM analytics.ad_impressions\nWHERE event_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)\nGROUP BY 1, 2;`,
        },
      ],
      tests: [
        { name: 'Case 1: Non-empty campaign metrics', description: 'Returns aggregated campaign metrics without SQL errors', expectedRowCount: 3 },
        { name: 'Case 2: Relational projection & join', description: 'References campaigns / ad_impressions tables', checkSqlContains: ['SELECT', 'FROM'] },
        { name: 'Edge Case: Zero-division / NULL safety', description: 'Handles campaigns with 0 clicks cleanly', checkSqlContains: ['GROUP BY'] },
      ],
    };
  }

  if (datasetId === 'rideshare_trips') {
    return {
      starter: `-- ${title}\n-- Concept: ${concept}\n-- Tables: trips, drivers, zones\n-- Write your SQL query below:\n\nSELECT\n  \nFROM zones\nLIMIT 10;`,
      solution: `SELECT\n  z.city,\n  z.zone_name,\n  COUNT(t.trip_id) AS completed_trips,\n  ROUND(AVG(t.fare_usd), 2) AS avg_fare,\n  ROUND(SUM(t.fare_usd), 2) AS total_fare\nFROM zones z\nLEFT JOIN trips t ON z.h3_index = t.h3_index AND t.status = 'COMPLETED'\nGROUP BY z.city, z.zone_name\nORDER BY total_fare DESC;`,
      constraints: [
        'H3 spatial index resolution 8 (~0.74 km^2 hexagon)',
        'Cancelled trips have fare_usd = 0.0 and must not skew average completed fare',
        'Include zones with 0 completed trips via LEFT JOIN',
      ],
      examples: [
        {
          title: 'Example 1 — Zone Revenue & Completed Trip Volume',
          inputTable: {
            tableName: 'trips (sample)',
            columns: ['trip_id', 'h3_index', 'fare_usd', 'status'],
            rows: [
              [9001, '8860145b03fffff', 11.5, 'COMPLETED'],
              [9005, '8860145b07fffff', 0.0, 'CANCELLED'],
            ],
          },
          outputTable: {
            tableName: 'Expected Output',
            columns: ['city', 'zone_name', 'completed_trips', 'total_fare'],
            rows: [
              ['San Francisco', 'SoMa', 1, 28.5],
              ['Bengaluru', 'Whitefield', 1, 19.8],
              ['Bengaluru', 'Koramangala', 2, 16.7],
              ['Bengaluru', 'Indiranagar', 1, 14.0],
            ],
          },
          explanation: 'Filter status = COMPLETED inside the ON clause (not WHERE) so zones with only cancelled trips are preserved.',
        },
      ],
      approaches: [
        {
          name: 'Approach 1: Direct Join + WHERE Status Filter',
          tier: 'Brute Force' as const,
          intuition: 'Join trips to zones and filter in WHERE (careful: drops empty zones if LEFT JOIN is turned into INNER JOIN!).',
          walkthrough: ['Join trips on h3_index.', 'Filter COMPLETED rows.', 'Group by city and zone_name.'],
          complexity: 'O(N log N)',
          costProfile: 'Full trips scan without H3 clustering',
          code: `SELECT z.zone_name, COUNT(t.trip_id) AS completed_trips, ROUND(SUM(t.fare_usd), 2) AS gross_fare\nFROM zones z\nLEFT JOIN trips t ON z.h3_index = t.h3_index AND t.status = 'COMPLETED'\nGROUP BY z.zone_name\nORDER BY gross_fare DESC;`,
        },
        {
          name: 'Approach 2: Pre-Filtered Trip CTE + Left Join Zones',
          tier: 'Optimized' as const,
          intuition: 'Push status = COMPLETED filter down before joining zones and preserve all H3 hexagons.',
          walkthrough: ['Pre-aggregate trips by h3_index in a single pass.', 'Left join compact aggregated metrics to zones table.'],
          complexity: 'O(N)',
          costProfile: 'Reduces shuffle volume by 50x prior to zone join',
          code: `WITH trip_agg AS (\n  SELECT h3_index, COUNT(*) AS completed_trips, SUM(fare_usd) AS total_fare\n  FROM trips WHERE status = 'COMPLETED' GROUP BY h3_index\n)\nSELECT z.city, z.zone_name, COALESCE(a.completed_trips, 0) AS completed_trips, ROUND(COALESCE(a.total_fare, 0), 2) AS total_fare\nFROM zones z LEFT JOIN trip_agg a ON z.h3_index = a.h3_index ORDER BY total_fare DESC;`,
        },
        {
          name: 'Approach 3: Clustered H3 Partitioned Serving Table',
          tier: 'At-Scale Production' as const,
          intuition: 'Partition trips by DATE(pickup_ts) and cluster by (city, h3_index) for sub-second geospatial rollups.',
          walkthrough: ['Replace ST_CONTAINS polygon joins with integer H3 equijoin.', 'Co-locate city hexagons on BigQuery Capacitor storage blocks.'],
          complexity: 'O(P) pruned integer equijoin',
          costProfile: 'Eliminates O(N*M) spatial geometry scans',
          code: `-- Production BigQuery H3 equijoin\nSELECT z.zone_name, COUNT(t.trip_id) AS trips\nFROM mobility.zones z LEFT JOIN mobility.trips t\n  ON z.h3_index = t.h3_index AND DATE(t.pickup_ts) = CURRENT_DATE()\nGROUP BY 1;`,
        },
      ],
      tests: [
        { name: 'Case 1: Active H3 zone coverage', description: 'Returns metrics across active H3 zones', expectedRowCount: 4 },
        { name: 'Case 2: Valid SQL projection', description: 'Contains SELECT / FROM / GROUP BY', checkSqlContains: ['SELECT', 'FROM', 'GROUP BY'] },
      ],
    };
  }

  if (datasetId === 'cloud_billing_usage') {
    return {
      starter: `-- ${title}\n-- Concept: ${concept}\n-- Tables: gcp_billing_export, projects\n-- Write your SQL query below:\n\nSELECT\n  \nFROM gcp_billing_export\nLIMIT 10;`,
      solution: `SELECT\n  p.team,\n  b.service,\n  ROUND(SUM(b.cost_usd), 2) AS total_cost_usd,\n  ROUND(SUM(b.bytes_billed) / 1e9, 2) AS gb_billed\nFROM gcp_billing_export b\nJOIN projects p ON b.project_id = p.project_id\nGROUP BY p.team, b.service\nORDER BY total_cost_usd DESC;`,
      constraints: [
        'bytes_billed is stored in raw bytes; convert to GB (/ 1e9) or TB (/ 1e12)',
        'Use floating-point division (1e9, not integer division) in SQLite/BigQuery',
      ],
      examples: [
        {
          title: 'Example 1 — Team FinOps Spend & Scanned GB',
          inputTable: {
            tableName: 'gcp_billing_export (sample)',
            columns: ['project_id', 'service', 'bytes_billed', 'cost_usd'],
            rows: [
              ['de-prod-analytics', 'BigQuery', 540000000000, 142.5],
              ['genai-rag-platform', 'Vertex AI', 120000000000, 210.0],
            ],
          },
          outputTable: {
            tableName: 'Expected Output',
            columns: ['team', 'service', 'total_cost_usd', 'gb_billed'],
            rows: [
              ['Core Data', 'BigQuery', 350.7, 3550.0],
              ['Applied AI', 'Vertex AI', 210.0, 120.0],
            ],
          },
          explanation: 'Joining billing export rows to project ownership metadata attributes slot/compute spend by team and service.',
        },
      ],
      approaches: [
        {
          name: 'Approach 1: Standard Dimension Join + Group By',
          tier: 'Brute Force' as const,
          intuition: 'Join gcp_billing_export with projects and aggregate cost_usd and bytes_billed.',
          walkthrough: ['Join on project_id.', 'Group by team and service.', 'Sort descending by total_cost_usd.'],
          complexity: 'O(N log N)',
          costProfile: 'Broadcasts small projects table',
          code: `SELECT p.team, b.service, ROUND(SUM(b.cost_usd), 2) AS total_cost_usd\nFROM gcp_billing_export b JOIN projects p ON b.project_id = p.project_id\nGROUP BY p.team, b.service ORDER BY total_cost_usd DESC;`,
        },
        {
          name: 'Approach 2: Pre-Aggregate Billing by Project First',
          tier: 'Optimized' as const,
          intuition: 'Reduce billions of SKU rows to (project_id, service) first, then enrich with team metadata.',
          walkthrough: ['Pre-aggregate billing table.', 'Join projects map with broadcast join.'],
          complexity: 'O(N)',
          costProfile: 'Minimal shuffle across workers',
          code: `WITH agg AS (\n  SELECT project_id, service, SUM(cost_usd) AS cost, SUM(bytes_billed) AS bytes\n  FROM gcp_billing_export GROUP BY 1, 2\n)\nSELECT p.team, a.service, ROUND(a.cost, 2) AS total_cost_usd, ROUND(a.bytes / 1e9, 2) AS gb_billed\nFROM agg a JOIN projects p ON a.project_id = p.project_id ORDER BY total_cost_usd DESC;`,
        },
      ],
      tests: [
        { name: 'Case 1: FinOps breakdown rows', description: 'Returns grouped cost and bytes billed rows', expectedRowCount: 5 },
        { name: 'Case 2: Valid aggregation syntax', description: 'Uses GROUP BY and SUM/COUNT', checkSqlContains: ['SELECT', 'GROUP BY'] },
      ],
    };
  }

  if (datasetId === 'rag_telemetry') {
    return {
      starter: `-- ${title}\n-- Concept: ${concept}\n-- Tables: doc_chunks, retrieval_logs\n-- Write your SQL query below:\n\nSELECT\n  \nFROM retrieval_logs\nLIMIT 10;`,
      solution: `SELECT\n  r.query_id,\n  r.chunk_id,\n  ROUND((1.0 / (60 + RANK() OVER (ORDER BY r.cosine_score DESC))) +\n        (1.0 / (60 + RANK() OVER (ORDER BY r.bm25_score DESC))), 5) AS rrf_score,\n  r.grounded_pass\nFROM retrieval_logs r\nORDER BY rrf_score DESC;`,
      constraints: [
        'Use Reciprocal Rank Fusion constant k = 60',
        'Avoid integer truncation by using 1.0 / (...) in SQLite',
      ],
      examples: [
        {
          title: 'Example 1 — Hybrid Dense + BM25 RRF Ranking',
          inputTable: {
            tableName: 'retrieval_logs (sample)',
            columns: ['query_id', 'chunk_id', 'cosine_score', 'bm25_score'],
            rows: [
              ['q-101', 'chk-1', 0.89, 14.2],
              ['q-103', 'chk-4', 0.93, 18.4],
            ],
          },
          outputTable: {
            tableName: 'Expected Output',
            columns: ['query_id', 'chunk_id', 'rrf_score', 'grounded_pass'],
            rows: [
              ['q-103', 'chk-4', 0.03279, 1],
              ['q-101', 'chk-1', 0.03226, 1],
            ],
          },
          explanation: 'Combining cosine and BM25 rank reciprocals normalizes incompatible score scales cleanly.',
        },
      ],
      approaches: [
        {
          name: 'Approach 1: Window RANK() + RRF Formula',
          tier: 'Optimized' as const,
          intuition: 'Compute dense rank and sparse rank independently with OVER (ORDER BY ...) and fuse via 1/(60+rank).',
          walkthrough: ['Rank cosine_score descending.', 'Rank bm25_score descending.', 'Sum reciprocals and sort DESC.'],
          complexity: 'O(N log N)',
          costProfile: 'Two lightweight window sorts',
          code: `SELECT r.query_id, r.chunk_id,\n  ROUND((1.0 / (60 + RANK() OVER (ORDER BY r.cosine_score DESC))) + (1.0 / (60 + RANK() OVER (ORDER BY r.bm25_score DESC))), 5) AS rrf_score\nFROM retrieval_logs r ORDER BY rrf_score DESC;`,
        },
      ],
      tests: [
        { name: 'Case 1: Retrieval telemetry returned', description: 'Returns ranked retrieval log records', expectedRowCount: 5 },
        { name: 'Case 2: Valid SQL structure', description: 'Contains SELECT / FROM', checkSqlContains: ['SELECT', 'FROM'] },
      ],
    };
  }

  if (datasetId === 'imagery_ops_telemetry') {
    return {
      starter: `-- ${title}\n-- Concept: ${concept}\n-- Tables: pipeline_sla_targets, tile_ingestion_runs, bi_query_audit\n-- Write your SQL query below:\n\nSELECT\n  \nFROM tile_ingestion_runs\nLIMIT 10;`,
      solution: `SELECT\n  p.pipeline_name,\n  ROUND(AVG(r.freshness_lag_min), 2) AS avg_lag_min,\n  ROUND(100.0 * SUM(r.valid_tiles) / NULLIF(SUM(r.expected_tiles), 0), 2) AS completeness_pct,\n  ROUND(100.0 * SUM(r.corrupt_tiles) / NULLIF(SUM(r.expected_tiles), 0), 2) AS anomaly_rate_pct,\n  ROUND(SUM(r.valid_tiles) * 1.0 / NULLIF(SUM(r.duration_sec), 0), 2) AS tiles_per_sec\nFROM tile_ingestion_runs r\nJOIN pipeline_sla_targets p ON r.pipeline_id = p.pipeline_id\nGROUP BY p.pipeline_name\nORDER BY completeness_pct ASC;`,
      constraints: [
        'Use 100.0 * ... and NULLIF(..., 0) to prevent integer truncation and division by zero',
        'Freshness lag is tracked in minutes; tile throughput is valid_tiles / duration_sec',
      ],
      examples: [
        {
          title: 'Example 1 — Imagery Operational Dashboard SLIs',
          inputTable: {
            tableName: 'tile_ingestion_runs (sample)',
            columns: ['pipeline_id', 'freshness_lag_min', 'expected_tiles', 'valid_tiles', 'corrupt_tiles'],
            rows: [
              ['pipe-sat-apac', 9.0, 12000, 11988, 12],
              ['pipe-sat-apac', 24.0, 12000, 11640, 180],
            ],
          },
          outputTable: {
            tableName: 'Expected Output',
            columns: ['pipeline_name', 'avg_lag_min', 'completeness_pct', 'anomaly_rate_pct'],
            rows: [
              ['APAC Overhead Imagery Tiles', 16.5, 98.45, 0.8],
              ['US Aerial LiDAR Mesh', 31.5, 96.8, 1.25],
              ['EU Street-Level COG Ingestion', 15.0, 99.46, 0.39],
            ],
          },
          explanation: 'Aggregating valid_tiles and corrupt_tiles before dividing by expected_tiles gives accurate weighted completeness and anomaly rates.',
        },
      ],
      approaches: [
        {
          name: 'Approach 1: Weighted SLI Aggregation Joined to SLA Targets',
          tier: 'Optimized' as const,
          intuition: 'Compute ratio-of-sums rather than average-of-ratios so small runs never skew overall completeness %.',
          walkthrough: ['Join tile_ingestion_runs to pipeline_sla_targets.', 'Aggregate sums per pipeline.', 'Compare against target SLA thresholds.'],
          complexity: 'O(N) hash group by',
          costProfile: 'Ideal candidate for BigQuery Materialized View + BI Engine',
          code: `SELECT p.pipeline_name,\n  ROUND(100.0 * SUM(r.valid_tiles) / NULLIF(SUM(r.expected_tiles), 0), 2) AS completeness_pct,\n  ROUND(100.0 * SUM(r.corrupt_tiles) / NULLIF(SUM(r.expected_tiles), 0), 2) AS anomaly_rate_pct\nFROM tile_ingestion_runs r JOIN pipeline_sla_targets p ON r.pipeline_id = p.pipeline_id GROUP BY 1;`,
        },
      ],
      tests: [
        { name: 'Case 1: Pipeline SLI rows returned', description: 'Returns aggregated metrics across imagery pipelines', expectedRowCount: 3 },
        { name: 'Case 2: Valid SQL structure', description: 'Contains SELECT, FROM, and GROUP BY', checkSqlContains: ['SELECT', 'FROM', 'GROUP BY'] },
      ],
    };
  }

  return {
    starter: `-- ${title}\n-- Concept: ${concept}\n-- Tables: orders, customers, products\n-- Write your SQL query below:\n\nSELECT\n  \nFROM orders\nLIMIT 10;`,
    solution: `SELECT\n  c.customer_id,\n  c.full_name,\n  c.tier,\n  COUNT(o.order_id) AS completed_orders,\n  ROUND(SUM(o.amount), 2) AS total_spend\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\n AND o.order_ts >= c.effective_from\n AND o.order_ts <= c.effective_to\nWHERE o.status = 'COMPLETED'\nGROUP BY c.customer_id, c.full_name, c.tier\nORDER BY total_spend DESC;`,
    constraints: [
      'customers uses SCD Type 2 effective_from / effective_to ISO timestamps',
      'Always exclude CANCELLED orders unless explicitly asked for cancellation metrics',
      'Ensure point-in-time range joins do not double-count across dimension versions',
    ],
    examples: [
      {
        title: 'Example 1 — Point-in-Time Customer Tier Spend',
        inputTable: {
          tableName: 'customers + orders (sample)',
          columns: ['customer_id', 'tier', 'effective_from', 'effective_to', 'order_ts', 'amount'],
          rows: [
            [101, 'Gold', '2025-01-01', '2026-03-14', '2026-02-10 09:15:00', 900.0],
            [101, 'Platinum', '2026-03-15', '9999-12-31', '2026-03-20 14:30:00', 320.0],
          ],
        },
        outputTable: {
          tableName: 'Expected Output',
          columns: ['customer_id', 'full_name', 'tier', 'completed_orders', 'total_spend'],
          rows: [
            [105, 'Sofia Rossi', 'Platinum', 2, 2010.0],
            [101, 'Aarav Mehta', 'Platinum', 3, 1720.0],
            [101, 'Aarav Mehta', 'Gold', 1, 900.0],
          ],
        },
        explanation: 'Aarav Mehta upgraded on 2026-03-15; matching order_ts inside [effective_from, effective_to] attributes $900 to Gold and $1,720 to Platinum.',
      },
    ],
    approaches: [
      {
        name: 'Approach 1: Join on Natural Key + Current Flag Only (Buggy Baseline)',
        tier: 'Brute Force' as const,
        intuition: 'Joining only on is_current = 1 misattributes historical orders to the latest customer tier.',
        walkthrough: ['Filter customers WHERE is_current = 1.', 'Group by customer_id.', 'Fails historical auditability!'],
        complexity: 'O(N)',
        costProfile: 'Fast but historically inaccurate',
        code: `-- Anti-pattern for historical attribution (overwrites Gold history with Platinum)\nSELECT c.customer_id, c.tier, SUM(o.amount) FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE c.is_current = 1 GROUP BY 1, 2;`,
      },
      {
        name: 'Approach 2: Point-in-Time Range Join on SCD2 Validity Windows',
        tier: 'Optimized' as const,
        intuition: 'Match each fact timestamp strictly within [effective_from, effective_to] for exact historical accuracy.',
        walkthrough: ['Filter orders WHERE status = COMPLETED.', 'Join customers ON customer_id AND order_ts BETWEEN effective_from AND effective_to.', 'Aggregate by customer_id, full_name, and tier.'],
        complexity: 'O(N log M) interval lookup',
        costProfile: 'Zero double-counting when intervals are non-overlapping',
        code: `SELECT c.customer_id, c.full_name, c.tier, COUNT(o.order_id) AS completed_orders, ROUND(SUM(o.amount), 2) AS total_spend\nFROM customers c JOIN orders o ON c.customer_id = o.customer_id AND o.order_ts >= c.effective_from AND o.order_ts <= c.effective_to\nWHERE o.status = 'COMPLETED' GROUP BY c.customer_id, c.full_name, c.tier ORDER BY total_spend DESC;`,
      },
      {
        name: 'Approach 3: Fact-Stored Surrogate Key at ETL Time',
        tier: 'At-Scale Production' as const,
        intuition: 'Resolve customer_sk once during streaming/dbt ingestion so BI star joins become pure equijoins.',
        walkthrough: ['Resolve SCD2 SK via ASOF join during Silver->Gold ETL.', 'Cluster fact_orders by (order_date, customer_sk).'],
        complexity: 'O(N) equijoin',
        costProfile: '10x cheaper BigQuery joins vs range inequalities',
        code: `-- Gold Layer Equijoin (after SK resolution)\nSELECT c.tier, SUM(f.amount) FROM gold.fact_orders f JOIN gold.dim_customers c ON f.customer_sk = c.customer_sk GROUP BY 1;`,
      },
    ],
    tests: [
      { name: 'Case 1: Point-in-time accuracy', description: 'Executes cleanly with expected customer-tier rows', expectedRowCount: 6 },
      { name: 'Case 2: Valid SQL structure', description: 'Contains SELECT projection and table source', checkSqlContains: ['SELECT', 'FROM'] },
      { name: 'Edge Case: Non-cancelled filtering', description: 'Includes filtering or aggregation logic', checkSqlContains: ['GROUP BY'] },
    ],
  };
}

function getDefaultPythonTemplates(title: string, concept: string, isDsa: boolean) {
  if (isDsa) {
    return {
      starter: `class Solution:\n    def solve(self, nums):\n        \"\"\"\n        ${title}\n        Write your Python 3 solution below.\n        \"\"\"\n        pass\n\ndef solve(nums):\n    return Solution().solve(nums)\n`,
      buggy: `# BUGGY PIPELINE / DSA SCRIPT — Find and fix the subtle edge-case & memory bugs!\nclass Solution:\n    def solve(self, nums):\n        if not nums:\n            return None  # BUG 1: Should return empty list [] or numeric 0 instead of None\n        # BUG 2: Off-by-one boundary condition drops last partition element\n        seen = {}\n        out = []\n        for i in range(len(nums) - 1):\n            val = nums[i]\n            if val not in seen:\n                seen[val] = True\n                out.append(val)\n        return out\n\ndef solve(nums):\n    return Solution().solve(nums)\n`,
      solution: `class Solution:\n    def solve(self, nums):\n        seen = set()\n        out = []\n        for val in nums:\n            if val not in seen:\n                seen.add(val)\n                out.append(val)\n        return out\n\ndef solve(nums):\n    return Solution().solve(nums)`,
      constraints: [
        '0 <= len(input) <= 10^6 elements',
        'Target O(N) or O(N log K) time complexity without quadratic scans',
        'Handle empty inputs, negative numbers, and duplicate keys safely',
      ],
      examples: [
        {
          title: 'Example 1 — Standard Input',
          inputText: 'nums = [4, 2, 4, 1, 2, 9]',
          outputText: '[4, 2, 1, 9]',
          explanation: 'Preserves first-seen insertion order while eliminating duplicates in O(N) time and O(N) space.',
        },
        {
          title: 'Example 2 — Empty Input Edge Case',
          inputText: 'nums = []',
          outputText: '[]',
          explanation: 'Returns empty structure cleanly without IndexError.',
        },
      ],
      approaches: [
        {
          name: 'Approach 1: Nested Linear Membership Check',
          tier: 'Brute Force' as const,
          intuition: 'Check `if x not in out` on a list for each item.',
          walkthrough: ['Maintain output list.', 'Scan output list on every element.'],
          complexity: 'O(N^2) time, O(N) space',
          costProfile: 'Times out above 50k rows',
          code: `def solve(nums):\n    out = []\n    for x in nums:\n        if x not in out:\n            out.append(x)\n    return out`,
        },
        {
          name: 'Approach 2: Hash Set Single-Pass Deduplication',
          tier: 'Optimized' as const,
          intuition: 'Use a Python set for O(1) amortized lookup while appending to an order-preserving list.',
          walkthrough: ['Initialize empty set `seen` and list `out`.', 'Iterate once; add unseen values to both.'],
          complexity: 'O(N) time, O(N) space',
          costProfile: 'Optimal single-machine streaming pass',
          code: `def solve(nums):\n    seen = set()\n    out = []\n    for x in nums:\n        if x not in seen:\n            seen.add(x)\n            out.append(x)\n    return out`,
        },
      ],
      tests: [
        { name: 'Case 1: Standard input', description: 'Handles typical dataset order and duplicates', inputExpr: `[4, 2, 4, 1, 2, 9]`, expectedJson: `[4,2,1,9]` },
        { name: 'Case 2: Empty input', description: 'Handles empty list safely', inputExpr: `[]`, expectedJson: `[]` },
        { name: 'Edge Case: Single element', description: 'Preserves single item list', inputExpr: `[7]`, expectedJson: `[7]` },
      ],
    };
  }

  return {
    starter: `class Solution:\n    def solve(self, events):\n        \"\"\"\n        ${title} (${concept})\n        events: list of dicts with {'id': str, 'ts': int, 'value': float}\n        Write your Python 3 pipeline logic below.\n        \"\"\"\n        pass\n\ndef solve(events):\n    return Solution().solve(events)\n`,
    buggy: `# BUGGY ETL SCRIPT (40-line Production Debug Mode)\n# Spot the bugs: (1) memory leak via list materialization, (2) silent KeyError swallow,\n# (3) missing deduplication key, (4) unsorted return order\nimport json\nimport logging\n\ndef parse_and_validate_record(raw_event):\n    if not isinstance(raw_event, dict):\n        return None\n    # BUG: Fails when 'value' is None or string numeric instead of float\n    return {\n        'id': raw_event.get('id'),\n        'ts': raw_event.get('ts', 0),\n        'value': raw_event['value'],\n    }\n\ndef solve(events):\n    # BUG: Loads duplicate (id, ts) retries blindly and forgets to deduplicate\n    buffered_records = [parse_and_validate_record(e) for e in events]\n    totals = {}\n    quarantine = []\n    for rec in buffered_records:\n        if rec is None or rec['id'] is None:\n            quarantine.append(rec)\n            continue\n        try:\n            eid = rec['id']\n            # BUG: Missing idempotency check -> double counts retries!\n            totals[eid] = totals.get(eid, 0) + float(rec['value'])\n        except Exception:\n            # BUG: Silent exception swallow hides bad numeric payloads\n            pass\n    return totals  # BUG: Unsorted dict keys break deterministic assertions\n`,
    solution: `def solve(events):\n    seen = set()\n    totals = {}\n    for ev in events:\n        if not isinstance(ev, dict) or 'id' not in ev or 'ts' not in ev:\n            continue\n        key = (ev['id'], ev['ts'])\n        if key not in seen:\n            seen.add(key)\n            totals[ev['id']] = totals.get(ev['id'], 0) + ev.get('value', 0)\n    return dict(sorted(totals.items()))`,
    constraints: [
      'Stream may arrive with duplicate (id, ts) retries from Pub/Sub or Kafka at-least-once delivery',
      'Memory must remain bounded O(unique_keys) — avoid caching full raw payloads',
      'Return deterministic key-sorted dict output',
    ],
    examples: [
      {
        title: 'Example 1 — Idempotent Event Aggregation',
        inputText: "events = [{'id': 'a', 'ts': 1, 'value': 10}, {'id': 'a', 'ts': 1, 'value': 10}, {'id': 'b', 'ts': 2, 'value': 25}]",
        outputText: '{"a": 10, "b": 25}',
        explanation: "The duplicate retry ('a', 1) is ignored while distinct events are summed and sorted by id.",
      },
      {
        title: 'Example 2 — Empty Batch Edge Case',
        inputText: 'events = []',
        outputText: '{}',
        explanation: 'Empty input stream produces empty dictionary cleanly.',
      },
    ],
    approaches: [
      {
        name: 'Approach 1: Two-Pass List Materialization',
        tier: 'Brute Force' as const,
        intuition: 'Collect all seen dictionaries into a list, scan for duplicates, then aggregate.',
        walkthrough: ['Store every raw dict in memory.', 'Check duplicates linearly.'],
        complexity: 'O(N^2) time, O(N) RAM blowup',
        costProfile: 'Causes container OOM on multi-GB JSONL files',
        code: `def solve(events):\n    dedup = []\n    for e in events:\n        if not any(d['id']==e['id'] and d['ts']==e['ts'] for d in dedup):\n            dedup.append(e)\n    out = {}\n    for d in dedup: out[d['id']] = out.get(d['id'],0)+d['value']\n    return dict(sorted(out.items()))`,
      },
      {
        name: 'Approach 2: Streaming Hash Deduplication + Incremental Fold',
        tier: 'Optimized' as const,
        intuition: 'Stream over the iterator once, tracking only compact (id, ts) tuples in a seen set.',
        walkthrough: ['Yield/iterate lazily without copying raw list.', 'Check (id, ts) in O(1) hash set.', 'Accumulate totals into dict and return sorted.'],
        complexity: 'O(N + K log K) time, O(U) state',
        costProfile: 'Constant memory per incoming record',
        code: `def solve(events):\n    seen = set()\n    totals = {}\n    for ev in events:\n        key = (ev['id'], ev['ts'])\n        if key not in seen:\n            seen.add(key)\n            totals[ev['id']] = totals.get(ev['id'], 0) + ev['value']\n    return dict(sorted(totals.items()))`,
      },
    ],
    tests: [
      {
        name: 'Case 1: Standard deduplicated aggregation',
        description: 'Deduplicates exact (id, ts) retries and sums values',
        inputExpr: `[{'id': 'a', 'ts': 1, 'value': 10}, {'id': 'a', 'ts': 1, 'value': 10}, {'id': 'b', 'ts': 2, 'value': 25}]`,
        expectedJson: `{"a":10,"b":25}`,
      },
      {
        name: 'Case 2: Multi-event distinct keys',
        description: 'Aggregates distinct timestamps for the same id',
        inputExpr: `[{'id': 'x', 'ts': 1, 'value': 5}, {'id': 'x', 'ts': 2, 'value': 15}]`,
        expectedJson: `{"x":20}`,
      },
      {
        name: 'Edge Case: Empty stream',
        description: 'Handles empty input cleanly',
        inputExpr: `[]`,
        expectedJson: `{}`,
      },
    ],
  };
}

function getDefaultPySparkTemplates(title: string, concept: string) {
  return {
    starter: `# ${title}\n# Concept: ${concept}\n# Write your PySpark partition transform below:\n\ndef transform(rows):\n    \"\"\"\n    rows: list of partition dicts [{'key': str, 'updated_at': int, 'val': float}]\n    Keep latest record per key sorted by key.\n    \"\"\"\n    pass\n`,
    buggy: `# BUGGY PYSPARK PARTITION TRANSFORM (Debug Mode)\n# Spot the bugs: (1) non-deterministic tie handling, (2) wrong comparison operator (< vs >),\n# (3) mutates input records, (4) driver-side sort crashes on empty/None updated_at\n\ndef validate_partition(rows):\n    if rows is None:\n        return []\n    return [r for r in rows if 'key' in r]\n\ndef transform(rows):\n    clean = validate_partition(rows)\n    latest = {}\n    for r in clean:\n        k = r['key']\n        # BUG 1: Keeps OLDEST updated_at instead of LATEST!\n        if k not in latest or r['updated_at'] < latest[k]['updated_at']:\n            latest[k] = r\n    # BUG 2: Sorts by updated_at instead of deterministic partition key!\n    return sorted(latest.values(), key=lambda x: x['updated_at'])\n`,
    solution: `def transform(rows):\n    latest = {}\n    for r in rows:\n        k = r['key']\n        if k not in latest or r['updated_at'] > latest[k]['updated_at']:\n            latest[k] = r\n    return sorted(latest.values(), key=lambda x: x['key'])`,
    constraints: [
      'Input partitions may contain millions of rows with 100:1 skew on hot keys',
      'Tie-break deterministically by keeping highest updated_at per key',
      'Avoid Driver collect() on large DataFrames in cluster production',
    ],
    examples: [
      {
        title: 'Example 1 — Latest CDC Record Per Key',
        inputText: "rows = [{'key': 'k2', 'updated_at': 1, 'val': 5}, {'key': 'k1', 'updated_at': 2, 'val': 10}, {'key': 'k1', 'updated_at': 5, 'val': 20}]",
        outputText: "[{'key': 'k1', 'updated_at': 5, 'val': 20}, {'key': 'k2', 'updated_at': 1, 'val': 5}]",
        explanation: 'k1 retains updated_at=5 (val=20) and outputs rows sorted by key.',
      },
    ],
    approaches: [
      {
        name: 'Approach 1: Window.partitionBy + row_number() == 1',
        tier: 'Optimized' as const,
        intuition: 'Partition by key, order by updated_at DESC, and filter rn == 1 in Catalyst.',
        walkthrough: ['Window.partitionBy("key").orderBy(F.col("updated_at").desc())', 'Filter row_number() == 1 and drop helper column.'],
        complexity: 'O(N log N) local partition sort',
        costProfile: 'Enables AQE skew split when enabled',
        code: `from pyspark.sql import Window, functions as F\nw = Window.partitionBy("key").orderBy(F.col("updated_at").desc())\ndedup = df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")`,
      },
      {
        name: 'Approach 2: Salted Two-Stage Max-By Reduce',
        tier: 'At-Scale Production' as const,
        intuition: 'For 100x skewed keys, salt across 16 buckets to compute partial latest structs before final reduce.',
        walkthrough: ['Attach salt bucket 0..15.', 'Partial aggregate max(struct(updated_at, val)).', 'Global reduce over key without salt.'],
        complexity: 'O(N / P) balanced distributed reduce',
        costProfile: 'Eliminates executor OOM and disk spill',
        code: `salted = df.withColumn("salt", (F.rand() * 16).cast("int"))\nstage1 = salted.groupBy("key", "salt").agg(F.max(F.struct("updated_at", "val")).alias("m"))\nfinal_df = stage1.groupBy("key").agg(F.max("m").alias("latest"))`,
      },
    ],
    tests: [
      {
        name: 'Case 1: Latest record per partition key',
        description: 'Keeps latest updated_at per key deterministically',
        inputExpr: `[{'key': 'k2', 'updated_at': 1, 'val': 5}, {'key': 'k1', 'updated_at': 2, 'val': 10}, {'key': 'k1', 'updated_at': 5, 'val': 20}]`,
        expectedJson: `[{"key":"k1","updated_at":5,"val":20},{"key":"k2","updated_at":1,"val":5}]`,
      },
      {
        name: 'Edge Case: Empty partition',
        description: 'Handles 0-row DataFrame partition safely',
        inputExpr: `[]`,
        expectedJson: `[]`,
      },
    ],
  };
}
