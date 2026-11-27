import { QuestStudyBriefing } from './questBriefingsQuests1to3';

export const QUEST_BRIEFINGS_4_TO_7: Record<string, QuestStudyBriefing> = {
  'q4-l1': {
    levelId: 'q4-l1',
    coreMentalModel:
      'Top-K candidate ranking finds the K highest-scoring documents or heavy hitters out of N items without sorting the entire N-element stream. Keeping a fixed-size Min-Heap of capacity K ensures the smallest candidate in the top-K sits at the root (`heap[0]`), letting any weaker candidate be rejected in O(1) and stronger candidates replace the root in O(log K).',
    whyGoogleCloudReliesOnIt:
      'Vertex AI RAG rerankers, BigQuery Vector Search Top-K filters, and real-time Dataflow heavy-hitter telemetry pipelines process millions of candidates per query—maintaining bounded O(K) memory per worker instead of buffering and sorting full streams.',
    exampleTitle: 'Streaming Top-3 Document Chunks by Relevance Score',
    exampleInput: `candidates = [("c1", 0.72), ("c2", 0.91), ("c3", 0.45), ("c4", 0.88), ("c5", 0.95)]
K = 3`,
    exampleLogic:
      'Maintain a Min-Heap of (score, doc_id):\n- Push c1, c2, c3 -> min root is (0.45, c3)\n- See c4 (0.88 > 0.45) -> heapreplace -> min root becomes (0.72, c1)\n- See c5 (0.95 > 0.72) -> heapreplace -> min root becomes (0.88, c4)',
    exampleOutput: `Top-3 = [("c5", 0.95), ("c2", 0.91), ("c4", 0.88)] in O(N log K) time, O(K) memory`,
    implementationSteps: [
      {
        step: 'Aggregate frequencies first if ranking Top-K frequent keys',
        detail: 'Use `collections.Counter` to collapse duplicate keys in O(N) before feeding `(count, key)` pairs into the size-K min-heap.',
      },
      {
        step: 'Use a Min-Heap (NOT a Max-Heap) for Top-K Largest',
        detail: 'Evicting the smallest element in the top-K window requires `heap[0]` to be the minimum of the K winners.',
        codeSnippet: 'if len(heap) < k:\n    heapq.heappush(heap, (score, key))\nelif score > heap[0][0]:\n    heapq.heapreplace(heap, (score, key))',
      },
      {
        step: 'Define deterministic tie-breakers on equal scores',
        detail: 'Include secondary sort keys cleanly (or invert string comparisons carefully) if interviewers require lexicographical tie-breaking.',
      },
    ],
    clarifyingQuestions: [
      'Do ties in score/frequency break arbitrarily or deterministically (e.g., lexicographically smallest ID)?',
      'What is the ratio of K to N (does Bucket Sort or Quickselect beat Heap when K is large)?',
      'Are scores arriving in a single static list or an unbounded distributed stream (Count-Min Sketch)?',
    ],
    solvingStrategy: {
      baseline: 'Sort all N items descending in O(N log N) and return `[:k]`.',
      optimal: 'Hash-count in O(N) + bounded size-K Min-Heap in O(N log K) (or Bucket Sort by frequency in O(N) when ranking integer counts <= N).',
      tradeOffs: 'Bucket Sort hits strict O(N) for frequency counts, whereas a size-K Min-Heap generalizes to arbitrary floating-point cosine/RRF scores with O(K) memory.',
    },
    commonTraps: [
      'Confusing Min-Heap vs Max-Heap: putting all N items in a Max-Heap still costs O(N) memory instead of O(K).',
      'Forgetting `k <= 0` or `len(unique) < k` edge cases.',
      'Mutating heap tuples with uncomparable dict objects when scores tie (`TypeError: < not supported between dict and dict`).',
    ],
  },

  'q4-l2': {
    levelId: 'q4-l2',
    coreMentalModel:
      'Naive fixed-character chunking cuts mid-sentence and strips away parent section context (turning "Run step 3 before failover" into an orphan vector). Semantic chunking splits along structural boundaries (Markdown headings, paragraphs), attaches parent breadcrumb metadata, and keeps a 10–15% overlap window across split edges.',
    whyGoogleCloudReliesOnIt:
      'RAG accuracy on GCP runbooks, LookML schemas, and BigQuery docs hinges more on chunk boundary hygiene and ACL metadata tags than swapping embedding models.',
    exampleTitle: 'Heading-Aware Chunking with Overlap & Metadata',
    exampleInput: `doc = "## Dataflow Watermarks\\nWatermarks track event-time...\\n## Dead-Letter Queues\\nRoute poison pills..."
max_tokens = 120, overlap = 20`,
    exampleLogic:
      '1) Split on `##` headings first so distinct operational sections never bleed together.\n2) Only when a section > max_tokens, slide a window of 120 tokens with 20-token stride overlap.\n3) Prepend `section_path` & `acl_groups` onto every chunk payload.',
    exampleOutput: `Chunk 1: {text: "[Dataflow Watermarks] ...", doc_id: "runbook-9", acl: ["de-team"]}
Chunk 2: {text: "[Dead-Letter Queues] ...", doc_id: "runbook-9", acl: ["de-team"]}`,
    implementationSteps: [
      {
        step: 'Split hierarchically: headings -> paragraphs -> sentences -> tokens',
        detail: 'Preserve natural logical units before ever falling back to hard token/character slicing.',
      },
      {
        step: 'Inject structural breadcrumbs into the embedded text',
        detail: 'Prepending `Document > Section` inside the chunk ensures dense embeddings capture parent context.',
      },
      {
        step: 'Attach deterministic `chunk_hash` and `acl_principals` metadata',
        detail: 'Hashing normalized chunk text lets incremental ingestion skip unchanged chunks during re-indexing.',
      },
    ],
    clarifyingQuestions: [
      'Are source documents structured Markdown/HTML/PDF tables or unstructured call transcripts?',
      'Is chunk sizing measured in characters, whitespace words, or exact BPE tokens?',
      'What happens when a single paragraph or code block exceeds `max_chunk_size`?',
    ],
    solvingStrategy: {
      baseline: 'Slice raw string every 500 chars with `text[i:i+500]`—destroys words, tables, and SQL blocks.',
      optimal: 'Recursive boundary-aware splitter (headers -> blank lines -> sentences) with sliding overlap + parent heading prefix + content-hash deduplication.',
      tradeOffs: 'Smaller chunks (256 tokens) boost dense precision; larger chunks (512–1024 tokens) or parent-document retrieval preserve multi-step SQL/code context for Gemini.',
    },
    commonTraps: [
      'Overlap >= chunk_size causing an infinite `while` loop (`step = chunk_size - overlap <= 0`)!',
      'Splitting Markdown tables or SQL code fences down the middle without keeping header rows.',
      'Dropping ACL/document source metadata during chunking, creating security leaks in multi-tenant RAG.',
    ],
  },

  'q4-l3': {
    levelId: 'q4-l3',
    coreMentalModel:
      'Training-serving skew occurs when offline training features (computed in PySpark/BigQuery SQL) subtly diverge from online inference features (computed in Python/Go microservices)—for example, different NULL defaults, timezone handling, or point-in-time leakage. Prevent skew by sharing ONE canonical feature definition and enforcing point-in-time (`ASOF`) joins.',
    whyGoogleCloudReliesOnIt:
      'Vertex AI Feature Store pairs offline BigQuery historical snapshots with low-latency Bigtable online serving so GenAI ranking models and fraud pipelines never drift silently in production.',
    exampleTitle: 'Detecting Silent Training-Serving Feature Drift',
    exampleInput: `Offline PySpark training: avg_spend_7d = COALESCE(SUM(amt)/7.0, 0.0)
Online microservice:      avg_spend_7d = SUM(amt)/COUNT(orders)  # BUG: wrong denominator + NaN on 0 orders!`,
    exampleLogic:
      'Log online feature vectors served at inference time, join back to offline BigQuery `ASOF` ground-truth features on `(entity_id, request_ts)`, and trigger PSI/KS drift alerts when parity diverges > 1e-4.',
    exampleOutput: `Parity audit flags denominator mismatch before corrupting model precision.`,
    implementationSteps: [
      {
        step: 'Use point-in-time `ASOF` / `event_ts <= label_ts` joins for training data',
        detail: 'Never join tomorrow’s updated customer feature row onto yesterday’s prediction event (target leakage!).',
      },
      {
        step: 'Materialize both offline and online stores from ONE Feature View',
        detail: 'Use Vertex AI Feature Store / Feast so BigQuery batch backfills and online serving share identical transformations.',
      },
      {
        step: 'Monitor serving distributions with Feature Skew & Drift alerts',
        detail: 'Compare logged inference payloads against training baseline histograms via Population Stability Index (PSI).',
      },
    ],
    clarifyingQuestions: [
      'Are features real-time streaming aggregates (rolling 5-min clicks) or daily batch snapshots?',
      'What online lookup p99 latency SLO does inference require (<10ms Bigtable vs <100ms)?',
      'How do we backfill new features historically without leaking future labels?',
    ],
    solvingStrategy: {
      baseline: 'Maintain separate SQL pipelines for training and Python logic for inference—guarantees subtle drift over time.',
      optimal: 'Single declarative feature registry -> BigQuery offline store (`ASOF` point-in-time joins) -> Vertex AI Feature Store / Bigtable online sync + inference logging parity checks.',
      tradeOffs: 'Streaming online feature updates cut staleness to seconds but increase Dataflow/Bigtable write cost compared to scheduled BigQuery-to-Bigtable batch syncs.',
    },
    commonTraps: [
      'Data leakage: joining features using `CURRENT_TIMESTAMP` or `is_current = TRUE` instead of `feature_ts <= label_ts`.',
      'Inconsistent `NULL` / `NaN` / timezone (`UTC` vs local) handling between SQL and Python.',
      'Never logging actual served feature vectors to verify training-serving parity.',
    ],
  },

  'q4-l4': {
    levelId: 'q4-l4',
    coreMentalModel:
      'Dense vector search excels at semantic synonyms ("out-of-memory executor" -> "heap spill") while sparse lexical search (BM25 / full-text) excels at exact identifiers (`ERR-504`, `BigQuery_Write_API`, table names). **Reciprocal Rank Fusion (RRF)** combines both ranked lists cleanly without fragile score normalization using `SUM(1.0 / (k + rank_i))` (typically `k = 60`).',
    whyGoogleCloudReliesOnIt:
      'BigQuery `VECTOR_SEARCH` paired with BigQuery `SEARCH` (inverted index) and RRF SQL runs hybrid enterprise RAG directly inside the warehouse—respecting SQL `WHERE` ACL predicates in one governed query.',
    exampleTitle: 'Reciprocal Rank Fusion (k=60) in SQL',
    exampleInput: `Doc A: dense_rank=1, bm25_rank=10  -> 1/61 + 1/70 = 0.0307
Doc B: dense_rank=4, bm25_rank=2   -> 1/64 + 1/62 = 0.0318`,
    exampleLogic:
      'Compute independent `ROW_NUMBER()` ranks for Vector Search and BM25 search, FULL OUTER JOIN on `doc_id`, apply `COALESCE(1.0 / (60 + r_vec), 0) + COALESCE(1.0 / (60 + r_bm25), 0)`, and sort descending.',
    exampleOutput: `Doc B wins (strong on BOTH signals) while exact-ID matches missing from dense vectors still surface cleanly!`,
    implementationSteps: [
      {
        step: 'Run Vector Search and Lexical Search as parallel CTEs',
        detail: 'Always push tenant/ACL filters into BOTH CTEs before ranking (pre-filtering) so unauthorized chunks never burn Top-K slots.',
      },
      {
        step: 'Join with FULL OUTER JOIN on chunk_id',
        detail: 'A document appearing in ONLY BM25 (exact error code) or ONLY Vector (paraphrase) must still survive with `COALESCE(..., 0.0)`.',
        codeSnippet: 'COALESCE(1.0 / (60 + v.rk), 0.0) + COALESCE(1.0 / (60 + l.rk), 0.0) AS rrf_score',
      },
      {
        step: 'Guard tie-breaking and NULL ranks deterministically',
        detail: 'Use `ORDER BY rrf_score DESC, chunk_id ASC LIMIT 10` so downstream LLM prompts get reproducible grounding.',
      },
    ],
    clarifyingQuestions: [
      'Do dense cosine similarities and BM25 scores share comparable scales? (No—hence RRF ranks beat raw weighted sums!)',
      'Should ACL / tenant permission filtering happen BEFORE Top-K retrieval or AFTER?',
      'What happens when a candidate appears in only one of the two search branches?',
    ],
    solvingStrategy: {
      baseline: 'Normalize raw cosine + BM25 scores with min-max scaling and sum—fragile whenever query result distributions shift.',
      optimal: 'Pre-filtered Hybrid Search CTEs + `FULL OUTER JOIN` + Reciprocal Rank Fusion (`1 / (60 + rank)`) + optional cross-encoder reranker on Top-20.',
      tradeOffs: 'RRF is parameter-free and lightning-fast in SQL; adding a Vertex AI Ranking API cross-encoder over the top 20 RRF hits adds ~150ms latency for maximum precision.',
    },
    commonTraps: [
      'Using `INNER JOIN` instead of `FULL OUTER JOIN` between dense and sparse CTEs—drops exact keyword matches!',
      'Filtering ACL permissions *after* `LIMIT 10` (leaves the user with 0 results if the top 10 belonged to another tenant).',
      'Forgetting `COALESCE(..., 0)` so `NULL + 0.016` evaluates to `NULL`!',
    ],
  },

  'q4-l5': {
    levelId: 'q4-l5',
    coreMentalModel:
      'Production enterprise RAG is a data engineering pipeline first: incremental CDC ingestion from GCS/Confluence/Drive -> heading-aware chunking -> Vertex AI `text-embedding-005` batching -> BigQuery / Vertex AI Vector Search (ScaNN) with metadata pre-filtering -> grounded Gemini generation -> automated RAGAS/Vertex Eval feedback loops.',
    whyGoogleCloudReliesOnIt:
      'Clients struggle moving RAG demos into production due to stale embeddings, cross-tenant data leaks, and unmeasured hallucinations. Google Cloud Consulting architects combine BigQuery Governance + Vertex AI Search/Vector Search cleanly.',
    exampleTitle: 'ACL-Governed Incremental RAG Architecture',
    exampleInput: `Corpus: 4M enterprise PDFs/tickets across 200 client orgs; updates 50k docs/day`,
    exampleLogic:
      '1) Eventarc triggers Dataflow on GCS changes; compute `chunk_sha256` diff against BigQuery `chunk_state`.\n2) Re-embed ONLY changed chunks via Vertex AI Batch Embeddings.\n3) Upsert vectors + `allowed_groups` into ScaNN/BigQuery Vector index.\n4) Query enforces `WHERE org_id = @caller_org` BEFORE vector scoring.',
    exampleOutput: `Zero stale ACL leaks, 92% fewer embedding API calls on daily refreshes, <400ms p95 retrieval.`,
    implementationSteps: [
      {
        step: 'Hash documents/chunks so unchanged text is never re-embedded',
        detail: 'Incremental content-hash diffing slashes Vertex AI embedding bills during nightly refreshes.',
      },
      {
        step: 'Enforce Zero-Trust ACL pre-filtering in the retrieval layer',
        detail: 'Pass signed user `tenant_id` / IAM group claims from the API gateway—never trust client-supplied filter strings.',
      },
      {
        step: 'Close the loop with Groundedness & Context Recall evals',
        detail: 'Track faithfulness, citation overlap, and zero-hit fallback telemetry using Vertex AI GenAI Evaluation Service.',
      },
    ],
    clarifyingQuestions: [
      'How strict are multi-tenant isolation requirements (shared index with metadata filter vs per-tenant index/VPC-SC)?',
      'What is the document freshness SLA after a file is edited or permissions are revoked?',
      'Are queries pure Q&A or analytical aggregations over structured tables + unstructured docs?',
    ],
    solvingStrategy: {
      baseline: 'Cron job nightly re-chunking all PDFs into a single unpartitioned vector DB without ACL checks.',
      optimal: 'Event-driven incremental chunk-hash diffing -> Vertex AI Embeddings -> ScaNN / BigQuery Hybrid Vector+BM25 with mandatory ACL pre-filtering -> Gemini grounded citations + automated golden-set CI evals.',
      tradeOffs: 'BigQuery `VECTOR_SEARCH` gives unified SQL governance and zero extra infrastructure; Vertex AI Vector Search (ScaNN) wins for <20ms latency at >50M vectors and high QPS.',
    },
    commonTraps: [
      'Re-embedding the entire corpus every night instead of delta hashing.',
      'Revoking a user’s Drive/GCS permission while leaving stale chunks searchable without live ACL sync.',
      'Evaluating RAG purely by vibes instead of measuring retrieval recall@K separately from generation faithfulness.',
    ],
  },

  'q4-l6': {
    levelId: 'q4-l6',
    coreMentalModel:
      'Multimodal extraction pipelines combine structured schemas (`response_schema` JSON enforcement) with Gemini vision/document understanding to parse complex PDFs, engineering diagrams, and satellite imagery into typed warehouse tables—routing low-confidence extractions to human-in-the-loop review.',
    whyGoogleCloudReliesOnIt:
      'Consulting teams automate invoice auditing, regulatory PDF extraction, and overhead imagery anomaly triage by feeding GCS objects to Gemini + Document AI inside Dataflow/Cloud Run and writing validated rows directly to BigQuery.',
    exampleTitle: 'Structured Multimodal Telemetry & Anomaly Pipeline',
    exampleInput: `Input: 100k daily aerial roof/solar inspection crops + PDF inspection forms in GCS`,
    exampleLogic:
      '1) Cheap deterministic check / Cloud Vision pre-filter skips blank/corrupt frames.\n2) Gemini Flash with strict JSON `responseSchema` extracts `{damage_class, confidence, bounding_notes}`.\n3) Confidence < 0.80 routes to Cloud Tasks / Vertex Labeling human review; >= 0.80 lands in BigQuery.',
    exampleOutput: `94% straight-through automation with strict JSON schema guarantees and zero silent hallucinated columns.`,
    implementationSteps: [
      {
        step: 'Enforce strict JSON Schema (`responseSchema`) + Pydantic validation',
        detail: 'Never parse freeform prose with regex; enforce typed enums, bounds, and required fields.',
      },
      {
        step: 'Tier models by difficulty (Flash first -> Pro escalation)',
        detail: 'Route 90% clean images/docs through fast low-cost `gemini-2.5-flash` and escalate ambiguous low-confidence cases to `gemini-2.5-pro`.',
      },
      {
        step: 'Separate pass-through confidence thresholds from deterministic DQ checks',
        detail: 'Cross-check extracted totals/coordinates against arithmetic and spatial sanity rules before committing to Gold tables.',
      },
    ],
    clarifyingQuestions: [
      'What throughput (docs/sec) and latency tier (real-time interactive vs async batch) are required?',
      'What is the cost of a false negative (missed anomaly) vs false positive (human review escalation)?',
      'Are inputs multi-page 100-page PDFs (needing Document AI layout chunking) or single high-res images?',
    ],
    solvingStrategy: {
      baseline: 'Send every raw file synchronously to the largest model without schema enforcement or confidence routing.',
      optimal: 'Async Pub/Sub -> Cloud Run/Dataflow batching -> pre-filter QC -> Gemini Flash (`responseSchema`) -> confidence-gated escalation (Pro / Human Review) -> BigQuery + audit lineage.',
      tradeOffs: 'Batch API / async Pub/Sub sacrifices instant UI response for 50% lower Gemini inference cost and smooth quota pacing.',
    },
    commonTraps: [
      'Letting unvalidated LLM JSON break downstream BigQuery schema loads instead of validating + DLQ.',
      'Passing raw 4K/8K uncompressed rasters instead of right-sized tiled crops or GCS URI references.',
      'Not tracking model version + prompt hash alongside extracted rows for reproducibility.',
    ],
  },

  'q4-l7': {
    levelId: 'q4-l7',
    coreMentalModel:
      'Spatial and imagery data has silent failure modes that standard SQL `NOT NULL` checks miss: **Null Island `(0.0, 0.0)`** default coords, swapped `(lat, lon)` vs `(lon, lat)` axes, self-intersecting invalid polygons, missing EPSG/CRS tags, and 100% cloud-occluded frames. Enforce a circuit-breaker DQ gate before promoting Bronze tiles to Silver/Gold.',
    whyGoogleCloudReliesOnIt:
      'One silent coordinate swap (`lat` stored in `lon`) puts Bengaluru telemetry in the Indian Ocean. Automated Dataplex / Great Expectations / SQL topology circuit breakers protect downstream ML training sets and executive maps.',
    exampleTitle: 'Automated Geospatial DQ Gate & Quarantine',
    exampleInput: `Incoming tile batch:
- Row 1: lon=77.59, lat=12.97, cloud_pct=8%   -> PASS
- Row 2: lon=0.0, lat=0.0, cloud_pct=12%     -> FAIL (Null Island trap!)
- Row 3: lon=12.97, lat=77.59, cloud_pct=4%  -> FAIL (lat/lon swapped? or out-of-region!)`,
    exampleLogic:
      'Run automated DQ assertions on staging partition:\n1) Reject `(lon=0 AND lat=0)`\n2) Check `lat BETWEEN -90 AND 90` & region bounding box\n3) Verify `ST_ISVALID(footprint)` / zero self-intersection\n4) Quarantine failed rows to `dq_quarantine` and block Gold publish if failure rate > 2%.',
    exampleOutput: `Corrupt batch halted automatically before poisoning production BigQuery GIS tables & Looker maps.`,
    implementationSteps: [
      {
        step: 'Check semantic domain bounds, not just NULLs',
        detail: 'Explicitly catch `(0, 0)`, `abs(lat) > 90`, `cloud_cover > threshold`, and zero-area degenerate polygons.',
      },
      {
        step: 'Validate polygon winding order & topology (`ST_ISVALID` / `make_valid`)',
        detail: 'Self-intersecting polygons cause BigQuery `ST_INTERSECTS` errors mid-query if uncleaned at ingestion.',
      },
      {
        step: 'Use Write-Audit-Publish (WAP) pattern',
        detail: 'Write to a staging partition/branch, run automated Dataplex DQ + anomaly assertions, and atomically publish ONLY if green.',
      },
    ],
    clarifyingQuestions: [
      'Should corrupt records trigger a hard pipeline halt (circuit breaker) or partial row-level quarantine?',
      'Which CRS/projection (WGS84 `EPSG:4326` vs local UTM) is the canonical Gold standard?',
      'How do we alert upstream ground/sensor teams when silent coordinate drift starts?',
    ],
    solvingStrategy: {
      baseline: 'Run ad-hoc manual SQL checks after stakeholders report blank maps on Looker.',
      optimal: 'Write-Audit-Publish staging -> automated Dataplex/dbt geospatial assertions (Null Island, CRS, `ST_ISVALID`, volume baseline) -> row-level quarantine table + circuit breaker threshold + auto-alert.',
      tradeOffs: 'Strict hard-halt circuit breakers protect 100% of Gold dashboards from bad numbers, while soft row-quarantine keeps 99% healthy imagery flowing when 0.5% tiles fail.',
    },
    commonTraps: [
      'Checking only `lat IS NOT NULL` while `(0.0, 0.0)` and `NaN` slip straight into production.',
      'Assuming GeoJSON `(lon, lat)` order matches GPS SDK `(lat, lon)` order without asserting regional bounds.',
      'Fixing invalid polygons silently without logging metadata so upstream camera calibration issues go unnoticed.',
    ],
  },

  'q5-l1': {
    levelId: 'q5-l1',
    coreMentalModel:
      'Pipelines frequently fail *silently* (emitting 30% of normal rows without throwing a single error). Catch silent drops by comparing today’s volume against a **7-day trailing moving average** (`AVG(cnt) OVER (ORDER BY day ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)`)—strictly excluding `CURRENT ROW` so today’s outage doesn’t dilute its own baseline!',
    whyGoogleCloudReliesOnIt:
      'DataOps observability in BigQuery relies on SQL-native trailing baselines rather than static thresholds (`cnt < 1000`), automatically adapting to organic growth and weekday/weekend seasonality.',
    exampleTitle: '7-Day Trailing Baseline Excluding Current Day',
    exampleInput: `Daily tile counts: Mon..Sun ~10,000/day; Today (Mon2) = 4,800 (silent upstream drop!)`,
    exampleLogic:
      'Compute `baseline_7d = AVG(cnt) OVER (PARTITION BY region ORDER BY dt ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)`.\nCompute `drop_pct = (baseline_7d - cnt) / NULLIF(baseline_7d, 0)`.\nFlag `WHERE drop_pct > 0.40`.',
    exampleOutput: `baseline_7d = 10,000, drop_pct = 0.52 (52% > 40%) -> ANOMALY ALERT FIRED!`,
    implementationSteps: [
      {
        step: 'Exclude CURRENT ROW from the trailing baseline window',
        detail: 'Use `ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING` (never `CURRENT ROW`) so a zero-drop day does not drag down its own baseline.',
        codeSnippet: 'AVG(daily_cnt) OVER (\n  PARTITION BY region_id\n  ORDER BY dt\n  ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING\n)',
      },
      {
        step: 'Guard division by zero and cold-start day 1',
        detail: 'Wrap denominator in `NULLIF(baseline_7d, 0)` and check `COUNT(*) OVER (... 7 PRECEDING AND 1 PRECEDING) >= 3` so brand-new partitions don’t false-alarm.',
      },
      {
        step: 'Respect calendar gaps vs physical row gaps',
        detail: 'If a day had 0 rows and was omitted from the aggregate table, `ROWS BETWEEN 7 PRECEDING` reaches further back than 7 calendar days—spine with a date calendar first!',
      },
    ],
    clarifyingQuestions: [
      'Are missing/zero-count dates guaranteed to appear as `0` rows in the daily table, or can whole dates be absent?',
      'Does traffic have strong day-of-week seasonality (comparing vs trailing 4 same-weekdays vs 7-day average)?',
      'What minimum historical days / baseline volume is needed before alerting to suppress noisy small regions?',
    ],
    solvingStrategy: {
      baseline: 'Hardcoded threshold `WHERE row_count < 5000`—breaks immediately as data grows or on weekends.',
      optimal: 'Date-spined daily counts + `AVG() OVER (... ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)` (or same-weekday 4-week rolling baseline) + `NULLIF` guard + `QUALIFY` / outer alert filter.',
      tradeOffs: '7-day trailing average adapts fast to trends, while same-weekday trailing 4-week average eliminates weekend dip false positives.',
    },
    commonTraps: [
      'Using `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`—including today in the average masks a 45% drop!',
      'Not spining missing dates (if yesterday crashed with 0 rows, `ROWS BETWEEN` skips it completely).',
      'Zero-division crashes when a new region launches.',
    ],
  },

  'q5-l2': {
    levelId: 'q5-l2',
    coreMentalModel:
      'Executive Imagery Ops SLO dashboards distill raw pipeline logs into three crisp operational KPIs: **Completeness %** (`captured_tiles / expected_tiles`), **Freshness Lag** (`TIMESTAMP_DIFF(published_ts, capture_ts, MINUTE)` p95), and **SLO Breach Flag** (`lag_min > sla_target OR completeness < 0.99`).',
    whyGoogleCloudReliesOnIt:
      'Consulting engagements live and die by agreed SLAs/SLOs. Translating noisy Dataflow/GCS telemetry into clean BigQuery SLO tables empowers engineering directors and client VPs to spot regional bottlenecks immediately.',
    exampleTitle: 'Regional Imagery Completeness & Freshness SLO Calculation',
    exampleInput: `Region APAC: expected=1000 tiles, delivered=965, p95_lag=28m (SLO: >=99% complete, <=30m lag)`,
    exampleLogic:
      'completeness_pct = ROUND(100.0 * delivered / NULLIF(expected, 0), 2) -> 96.50%\nis_slo_breach = (completeness_pct < 99.0 OR p95_lag > 30) -> TRUE (completeness miss!)',
    exampleOutput: `Region APAC flagged BREACH (96.50% < 99.0% target) while freshness remained nominal (28m <= 30m).`,
    implementationSteps: [
      {
        step: 'Compute ratios using floating-point numerator (`100.0 * ...`)',
        detail: 'Avoid integer division truncation (`965 / 1000 == 0` in SQLite/Postgres!) by multiplying by `100.0` or casting `FLOAT64` first.',
      },
      {
        step: 'Aggregate at the clean regional/daily grain before applying `HAVING` or outer status flags',
        detail: 'Compute `SUM(delivered)` and `SUM(expected)` first—NEVER average pre-computed percentages across sub-regions (Simpson’s paradox)!',
      },
      {
        step: 'Surface clear human-readable breach reasons',
        detail: 'Distinguish `COMPLETENESS_BREACH`, `LATENCY_BREACH`, and `HEALTHY` so on-call engineers know whether to check ingest drops or Dataflow worker lag.',
      },
    ],
    clarifyingQuestions: [
      'Should completeness % be weighted by total expected tiles across a region (correct!) or unweighted average of sub-zones?',
      'Are missing/failed tiles omitted from the delivery table (requiring `LEFT JOIN` from the expected flight-plan schedule)?',
      'Are freshness timestamps guaranteed UTC and free of clock-skew negative diffs?',
    ],
    solvingStrategy: {
      baseline: 'Compute `AVG(tile_pct)` across zones—mathematically wrong when zones differ in tile count.',
      optimal: '`LEFT JOIN` expected flight-plan schedule to delivered catalog -> aggregate sums/quantiles at region grain -> compute `100.0 * delivered / NULLIF(expected, 0)` -> explicit SLO status classification.',
      tradeOffs: 'Pre-aggregating hourly/daily SLO summary tables in BigQuery keeps Looker dashboards instant even over billions of tile logs.',
    },
    commonTraps: [
      'Averaging pre-computed percentages instead of summing numerators and denominators (`SUM(delivered) / SUM(expected)`).',
      'Integer division returning `0` in SQLite/strict SQL engines when forgetting `* 100.0`.',
      'Inner-joining expected schedules with deliveries and silently ignoring regions with 0 deliveries!',
    ],
  },

  'q5-l3': {
    levelId: 'q5-l3',
    coreMentalModel:
      'A **Semantic Layer (LookML)** acts as the single governed source of truth for KPI definitions (`gross_margin`, `tile_completeness_pct`, `active_slas`) between BigQuery and every BI chart. By declaring explicit primary keys, join relationships (`many_to_one`), and symmetric aggregates, Looker prevents join fan-out metric inflation automatically.',
    whyGoogleCloudReliesOnIt:
      'Clients often have 5 teams showing 5 different numbers for "Monthly Revenue" or "SLA Breach Rate" in Looker/Tableau. Modeling a conformed KPI Star Schema + LookML semantic layer eliminates metric drift and prepares tables for BigQuery BI Engine.',
    exampleTitle: 'Preventing Fan-Out Inflation in Conformed Semantic Views',
    exampleInput: `orders (1 row, $100) --[1:N]--> order_items (3 rows, sum=$100)
Naive SQL: SELECT SUM(o.order_total) FROM orders o JOIN order_items oi ON ...`,
    exampleLogic:
      'Naive join repeats `order_total = $100` across 3 item rows -> reports $300 instead of $100!\nLookML Semantic Layer declares `primary_key: order_id` + `relationship: one_to_many`, triggering symmetric aggregate deduplication (or separate fact grains).',
    exampleOutput: `SUM(order_total) = $100 AND SUM(item_price) = $100 accurately from one Explore!`,
    implementationSteps: [
      {
        step: 'Separate fact tables cleanly by grain (`fct_tile_captures` vs `fct_sla_daily`)',
        detail: 'Never mash two incompatible grains into one wide table; link conformed dimensions (`dim_region`, `dim_date`, `dim_sensor`).',
      },
      {
        step: 'Declare explicit primary keys & join cardinalities in semantic models',
        detail: 'Symmetric aggregates in LookML rely on an exact unique `primary_key` on every joined view.',
      },
      {
        step: 'Avoid complex non-additive ratios at the leaf row level',
        detail: 'Expose base additive measures (`total_tiles`, `healthy_tiles`) and compute ratios (`healthy / total`) at the aggregated measure layer.',
      },
    ],
    clarifyingQuestions: [
      'Which conformed dimensions (`date`, `region`, `customer_tier`) must slice across multiple fact processes?',
      'Will business users explore ad-hoc combinations in Looker, or consume pre-aggregated BigQuery Materialized Views?',
      'Are there row-level security requirements (`access_filter` per client org) enforced in the semantic layer?',
    ],
    solvingStrategy: {
      baseline: 'Write bespoke standalone SQL queries per Looker dashboard tile—leads to 10 inconsistent definitions of the same KPI.',
      optimal: 'Conformed Kimball Star Schema in BigQuery (clustered/partitioned) -> LookML Semantic Layer with primary keys, symmetric aggregates, and BigQuery Materialized Views for hot KPI grains.',
      tradeOffs: 'Centralized LookML governance adds brief PR review discipline for metric changes, preventing executive board-meeting discrepancies.',
    },
    commonTraps: [
      'Omitting `primary_key` in LookML views -> silently breaks symmetric aggregates and inflates sums!',
      'Joining two Fact tables directly together (chasm trap) instead of drilling across Conformed Dimensions.',
      'Pre-computing percentages inside a fact table column where downstream `SUM`/`AVG` is invalid.',
    ],
  },

  'q5-l4': {
    levelId: 'q5-l4',
    coreMentalModel:
      'BigQuery **Materialized Views (MVs)** automatically pre-aggregate incremental base-table appends and use **smart tuning** so queries hitting the raw table get transparently rewritten to the tiny MV. Pairing MVs with **BigQuery BI Engine** (in-memory vectorized column cache) delivers <200ms Looker responses—IF the query avoids unsupported SQL patterns that break BI Engine fallback.',
    whyGoogleCloudReliesOnIt:
      'Clients turn on BI Engine expecting instant Looker loads, only to see 80% of dashboard tiles fall back to slow BigQuery slot scans because of non-deterministic functions, unsupported regexes, or unindexed joins.',
    exampleTitle: 'Diagnosing BI Engine Fallback & MV Rewrite Coverage',
    exampleInput: `Dashboard queries hitting raw 8TB fct_imagery_events:
Query A: SELECT region, COUNT(*) FROM fct_imagery_events WHERE dt >= '2026-03-01' GROUP BY 1 (BI Engine HIT: 45ms)
Query B: SELECT REGEXP_EXTRACT(uri, ...), COUNT(DISTINCT tile_id) ... (BI Engine MISS -> 14s slot scan!)`,
    exampleLogic:
      'Audit `INFORMATION_SCHEMA.JOBS_BY_PROJECT` -> inspect `bi_engine_statistics.bi_engine_mode` (`FULL` vs `PARTIAL` vs `DISABLED`) and `bi_engine_reasons`.\nPre-compute regex/distinct counts in an incremental MV or curated Gold mart so Looker stays 100% in `FULL` BI Engine acceleration.',
    exampleOutput: `p95 Looker tile latency drops from 14.2s -> 180ms with 90% fewer BigQuery slots burned.`,
    implementationSteps: [
      {
        step: 'Query `INFORMATION_SCHEMA.JOBS` for `bi_engine_statistics`',
        detail: 'Measure actual `FULL` acceleration % vs fallback reasons per Looker dashboard/user.',
      },
      {
        step: 'Design Materialized Views compatible with BigQuery Smart Tuning',
        detail: 'Stick to supported MV aggregates (`SUM`, `COUNT`, `MIN`, `MAX`, `APPROX_COUNT_DISTINCT`) without `LEFT JOIN` or `WINDOW` inside the MV itself.',
      },
      {
        step: 'Size BI Engine RAM reservation to hot Gold columns, not raw Bronze',
        detail: 'Cache ONLY the curated Gold mart & MVs needed by dashboards rather than bloating BI Engine memory with raw JSON payloads.',
      },
    ],
    clarifyingQuestions: [
      'What query freshness lag is acceptable (real-time base-table delta merge on MV vs scheduled hourly Gold refresh)?',
      'Which BigQuery SQL features in Looker (`COUNT(DISTINCT)`, `JSON_VALUE`, cross-region joins) are causing BI Engine fallbacks?',
      'What BI Engine memory capacity (GB) fits the working-set Gold tables?',
    ],
    solvingStrategy: {
      baseline: 'Throw massive BI Engine GB reservations or On-Demand queries at raw unaggregated tables.',
      optimal: 'Audit `INFORMATION_SCHEMA.JOBS` `bi_engine_statistics` -> fix fallback expressions -> add incremental Smart-Tuned MVs -> right-size BI Engine memory on hot Gold tables.',
      tradeOffs: 'MVs automatically stay fresh on base appends with zero pipeline orchestration, though complex multi-table joins still require scheduled Dataform/dbt Gold rollups.',
    },
    commonTraps: [
      'Putting `LEFT JOIN` or `ROW_NUMBER()` inside a BigQuery Materialized View (unsupported—fails creation or disables incremental refresh).',
      'Never checking `bi_engine_statistics` and assuming BI Engine is accelerating queries when it silently fell back to `DISABLED`.',
      'Leaving BI Engine turned on in the wrong GCP region from the BigQuery dataset.',
    ],
  },

  'q5-l5': {
    levelId: 'q5-l5',
    coreMentalModel:
      'An executive Ops Health Plane combines high-level SLA scorecards (Completeness %, p95 Freshness, Cost/TB) with instant drill-down paths from global KPI -> region -> failing Dataflow/pipeline job—backed by Looker + BigQuery BI Engine + Materialized Views so opening the morning board view never triggers slow cold slot queues.',
    whyGoogleCloudReliesOnIt:
      'Google Cloud Consulting teams build operational command planes for CDOs and SRE leads overseeing petabyte imagery & retail fleets—balancing executive simplicity with root-cause drill-through.',
    exampleTitle: '3-Tier Executive Ops Dashboard & Drill Path',
    exampleInput: `Persona 1: VP Ops needs 1-screen morning RAG status (Global SLO 99.4%, 1 region amber)
Persona 2: On-call DE clicks amber region -> sees failing Dataflow job ID & DLQ count`,
    exampleLogic:
      'Tier 1 (BI Engine MV): Daily/Hourly summary cubes (<200ms load, 3 KPIs + regional map).\nTier 2 (Clustered Gold): Pipeline run & SLO breach table.\nTier 3 (BigQuery Partitioned Detail): Individual DLQ error payloads & job trace links.',
    exampleOutput: `VP loads dashboard in 190ms; DE isolates bad upstream feed in 2 clicks without scanning 50 TB.`,
    implementationSteps: [
      {
        step: 'Enforce strict 3-tier aggregate drill-down (Summary MV -> Run Gold -> Detail)',
        detail: 'Keep default dashboard landing filters hitting pre-aggregated MVs in BI Engine, never raw event tables.',
      },
      {
        step: 'Enable Looker Aggregate Awareness + Datagroups tied to ETL completion',
        detail: 'Bust Looker cache ONLY when the upstream Dataform/Airflow watermark advances—preventing redundant BigQuery queries.',
      },
      {
        step: 'Surface SLA freshness timestamps visibly on the dashboard',
        detail: 'Executives must immediately see "Data fresh as of 06:00 UTC" so stale caches are never mistaken for live zero-breach status.',
      },
    ],
    clarifyingQuestions: [
      'Who are the distinct personas (VP morning pulse vs SRE minute-by-minute triage) and their acceptable data freshness?',
      'What peak concurrent viewers hit the dashboard (e.g., 500 analysts Monday 9 AM)?',
      'Should alerts fire proactively to Slack/PagerDuty when SLOs breach, rather than waiting for someone to open Looker?',
    ],
    solvingStrategy: {
      baseline: 'Connect Looker directly to raw Bronze event logs with 20 unindexed tiles refreshing every 5 minutes.',
      optimal: '3-tier BigQuery Gold + Smart-Tuned MVs -> BI Engine sub-second cache -> Looker Aggregate Awareness + ETL-synced Datagroups + proactive Cloud Monitoring SLO alerts.',
      tradeOffs: 'Pre-aggregated MVs + Aggregate Awareness require thoughtful schema design upfront, paying off with <250ms loads even under 500 concurrent Monday-morning viewers.',
    },
    commonTraps: [
      'Setting 5-minute auto-refresh on executive dashboards scanning multi-TB tables (burns huge BigQuery slot budgets 24/7).',
      'Putting 15+ dense charts on a single Looker dashboard causing 15 parallel queries per page load.',
      'No visible "Last Successful Pipeline Refresh" indicator.',
    ],
  },

  'q5-l6': {
    levelId: 'q5-l6',
    coreMentalModel:
      'When BigQuery Materialized View background refreshes fail (e.g., base schema evolution or slot starvation) or interactive Looker bursts exhaust baseline Enterprise Editions slots, a **self-healing BI ops plane** detects stale `last_refresh_time` metadata, isolates BI queries onto dedicated `QUERY` slot reservations with autoscaling headroom, and triggers automated MV rebuild/fallback routing.',
    whyGoogleCloudReliesOnIt:
      'Mission-critical Looker dashboards should never freeze because an ad-hoc Data Science backfill saturated shared BigQuery slots or a Materialized View stalled.',
    exampleTitle: 'Reservation Isolation + Automated MV Stale-Refresh Recovery',
    exampleInput: `Incident: Heavy backfill job consumes 100% shared slots; Looker dashboard MV staleness hits 45 mins.`,
    exampleLogic:
      '1) Assign Looker service account to dedicated `bi-interactive` BigQuery Editions reservation (e.g., 200 baseline + 800 autoscale slots), isolated from `batch-etl` reservation.\n2) Monitor `INFORMATION_SCHEMA.MATERIALIZED_VIEWS` (`last_refresh_time` + `last_refresh_status`).\n3) Cloud Function/Workflow triggers `BQ.REFRESH_MATERIALIZED_VIEW` or swaps LookML view alias to pre-built snapshot fallback if staleness > SLA.',
    exampleOutput: `Interactive Looker p95 stays <400ms even while a 40 TB backfill saturates the batch reservation.`,
    implementationSteps: [
      {
        step: 'Isolate Interactive BI vs Batch ETL Reservations in BigQuery Editions',
        detail: 'Separate project/service-account assignments so heavy Spark/SQL backfills never starve Looker dashboards.',
      },
      {
        step: 'Monitor `INFORMATION_SCHEMA.MATERIALIZED_VIEWS` staleness & errors',
        detail: 'Alert and auto-retry `CALL BQ.REFRESH_MATERIALIZED_VIEW(...)` if `last_refresh_status` records transient quota errors.',
      },
      {
        step: 'Configure graceful fallback views & Looker Datagroup circuit breakers',
        detail: 'Freeze cache invalidation if the upstream pipeline failed, rather than wiping a valid hourly cache with empty partial data.',
      },
    ],
    clarifyingQuestions: [
      'Are BigQuery workloads currently sharing one flat reservation or On-Demand pool?',
      'What maximum staleness threshold triggers automated MV refresh or fallback switching?',
      'What is the budget cap on Editions autoscaling slots during Monday morning BI bursts?',
    ],
    solvingStrategy: {
      baseline: 'Run all ETL and BI inside a single shared project/reservation and wait for Looker users to report timeouts.',
      optimal: 'Workload-isolated BigQuery Editions reservations (`bi-interactive` with autoscale cap vs `batch-etl`) + BI Engine + `INFORMATION_SCHEMA.MATERIALIZED_VIEWS` watchdog + automated refresh/fallback switch.',
      tradeOffs: 'Dedicated interactive baseline slots reserve steady capacity (paying slightly more during idle nights unless `baseline=0` with pure autoscaling) in exchange for ironclad executive SLA protection.',
    },
    commonTraps: [
      'Putting ETL transformations and Looker BI users in the exact same BigQuery slot reservation with no `max_slots` cap.',
      'Letting Looker cache refresh on a dumb wall-clock cron even when the ETL load failed (wipes good data with stale/partial data!).',
      'Ignoring MV refresh error statuses until base tables drift out of sync.',
    ],
  },

  'q6-l1': {
    levelId: 'q6-l1',
    coreMentalModel:
      'Columnar PII redaction transforms sensitive fields (`email`, `ssn`, `phone`, `ip`) deterministically based on caller privilege tier (`FULL`, `MASKED`, `HASHED`) without altering table schema—preserving joinability via salted SHA-256 tokenization while scrubbing raw PII before data leaves secure boundaries.',
    whyGoogleCloudReliesOnIt:
      'Consulting engagements in healthcare (HIPAA), banking (PCI-DSS), and India DPDP / EU GDPR require deterministic redaction in Python/Dataflow ingestion filters AND BigQuery Dynamic Data Masking policy tags.',
    exampleTitle: 'Deterministic Salted Tokenization + Partial Masking',
    exampleInput: `record = {"user_id": "u1", "email": "ananya@bank.in", "pan": "ABCDE1234F", "tier": "Gold"}
policy = {"email": "mask_email", "pan": "redact"}`,
    exampleLogic:
      '- `email`: keep first char + domain -> `"a***@bank.in"` (or HMAC-SHA256 with KMS secret salt if join key needed).\n- `pan`: replace with `"[REDACTED]"`.\n- `tier`: untouched.',
    exampleOutput: `{"user_id": "u1", "email": "a***@bank.in", "pan": "[REDACTED]", "tier": "Gold"}`,
    implementationSteps: [
      {
        step: 'Handle NULL / empty / malformed strings gracefully',
        detail: 'Never crash on `None` emails or missing `@` symbols; return `None` for NULLs and fallback mask for malformed strings.',
      },
      {
        step: 'Use HMAC-SHA256 with a KMS-rotated secret pepper—NEVER plain unsalted SHA-256',
        detail: 'Unsalted SHA-256 of phone numbers or PANs can be reversed via rainbow tables in seconds!',
      },
      {
        step: 'Avoid mutating caller input dictionaries in-place',
        detail: 'Return sanitized copies so concurrent pipeline branches or audit loggers remain predictable.',
      },
    ],
    clarifyingQuestions: [
      'Must redacted PII remain joinable across tables (requiring keyed HMAC/FPE tokenization) or purely obscured?',
      'How should `None`/empty/malformed PII values behave (pass through `None` vs replace with sentinel)?',
      'Are nested dicts/lists possible inside the columnar payload?',
    ],
    solvingStrategy: {
      baseline: 'Drop entire columns or replace every character with `"***"`—breaks analytics joins and email-domain grouping.',
      optimal: 'Policy-driven field dispatcher: partial mask (preserving domain/last-4), HMAC-SHA256 keyed tokenization (join-safe), and NULL-safe schema preservation.',
      tradeOffs: 'HMAC tokenization enables cross-table analytics without exposing plaintext, while irreversibly blocking plaintext recovery unless KMS-managed Format-Preserving Encryption (Cloud DLP FPE) is used.',
    },
    commonTraps: [
      'Using plain `hashlib.sha256(phone)` without a secret key/salt (trivially brute-forced!).',
      'Crashing with `AttributeError` when a nullable PII column contains `None`.',
      'Mutating input dicts in-place during multi-branch pipeline execution.',
    ],
  },

  'q6-l2': {
    levelId: 'q6-l2',
    coreMentalModel:
      'At enterprise scale (thousands of tables), manual column-by-column security fails immediately as new columns arrive. Automate PII discovery with **Cloud DLP (Sensitive Data Protection)** profiling, emit findings to **Dataplex Data Catalog**, and attach **BigQuery Policy Tags** (`Fine-Grained Reader` vs `Masked Reader`) so access control updates automatically.',
    whyGoogleCloudReliesOnIt:
      'Banking and healthcare GCP landings must prove zero unmasked PII exposure across thousands of BigQuery tables during compliance audits without blocking analysts from querying safe aggregate columns.',
    exampleTitle: 'Automated Cloud DLP -> Dataplex -> BigQuery Dynamic Masking',
    exampleInput: `New column "contact_info" lands in BigQuery Silver table containing 92% Indian Aadhaar / email patterns.`,
    exampleLogic:
      '1) Cloud DLP scheduled discovery scans sample partitions -> detects `EMAIL_ADDRESS` / `INDIA_AADHAAR_NUMBER`.\n2) Cloud Function / Dataplex governance tags column in Data Catalog taxonomy.\n3) BigQuery binds Policy Tag -> Analysts see `SHA256` hash or `****`; Compliance Lead (`Fine-Grained Reader`) sees plaintext.',
    exampleOutput: `Zero manual spreadsheets; new PII columns are masked automatically before analysts run queries.`,
    implementationSteps: [
      {
        step: 'Design a clean Dataplex Policy Tag Taxonomy',
        detail: 'Keep 3–4 practical sensitivity tiers (`High-PII-Restricted`, `Medium-PII-Masked`, `Internal-Clear`) rather than 50 confusing tags.',
      },
      {
        step: 'Run Cloud DLP Discovery Profiling + Ingestion Redaction',
        detail: 'De-identify toxic PII (like raw credit card CVVs) BEFORE GCS/BigQuery storage, and mask analytical PII (email/phone) dynamically via BigQuery Policy Tags.',
      },
      {
        step: 'Pair Column Policy Tags with Row-Level Access Policies (`CREATE ROW ACCESS POLICY`)',
        detail: 'Restrict regional analysts to their own country rows while masking sensitive columns in the same query.',
      },
    ],
    clarifyingQuestions: [
      'Should toxic PII (SSNs, CVVs) be scrubbed at ingestion before landing in Bronze, or masked dynamically at query time?',
      'Do analysts need deterministic hashes/last-4 digits for joins, or full NULL/default masking?',
      'How quickly must newly created tables/columns be scanned and protected?',
    ],
    solvingStrategy: {
      baseline: 'Create dozens of duplicate authorized views (`vw_orders_masked`, `vw_orders_full`) manually whenever a column changes.',
      optimal: 'Cloud DLP continuous profiling -> Dataplex Taxonomy Policy Tags -> BigQuery Dynamic Data Masking rules + Row Access Policies (one physical table, dynamic role-based views).',
      tradeOffs: 'Dynamic Data Masking eliminates view sprawl and duplicate storage, while pre-storage DLP de-identification in Dataflow is still mandatory for ultra-sensitive PCI/HIPAA data.',
    },
    commonTraps: [
      'Relying ONLY on manual Authorized Views across 500 tables (unmaintainable schema drift!).',
      'Forgetting that `Owner`/`Editor` primitive IAM roles bypass fine-grained hygiene—enforce least-privilege custom/predefined roles.',
      'Running full-table DLP scans daily instead of sampling new partitions (massive DLP inspection cost!).',
    ],
  },

  'q6-l3': {
    levelId: 'q6-l3',
    coreMentalModel:
      'IAM answers **"Who can call this API?"**, whereas **VPC Service Controls (VPC-SC)** answers **"Can data leave this trusted GCP project perimeter—even with stolen credentials?"**. Pairing least-privilege Service Accounts, VPC-SC perimeters (blocking `gsutil cp` / `bq extract` to external personal GCP projects), and **CMEK (Cloud KMS)** gives defense-in-depth.',
    whyGoogleCloudReliesOnIt:
      'Regulated banking and government Google Cloud Consulting deployments mandate VPC-SC perimeters and CMEK customer-controlled revocation before a single byte of production data touches GCS or BigQuery.',
    exampleTitle: 'Stopping Credential Exfiltration with VPC-SC + CMEK',
    exampleInput: `Threat: Compromised analyst laptop steals SA key or OAuth token and runs \`bq extract\` to attacker's personal GCS bucket.`,
    exampleLogic:
      '1) IAM alone might allow `bigquery.jobs.create` + read!\n2) VPC-SC Perimeter wraps Prod BigQuery & GCS: egress rule denies writes to ANY GCS bucket outside the corporate perimeter.\n3) CMEK encrypts data at rest with KMS key owned by Security Project; Security can revoke key access instantly.',
    exampleOutput: `Exfiltration attempt blocked at Google network boundary (VPC-SC Violation) and logged to Security Command Center.`,
    implementationSteps: [
      {
        step: 'Eliminate long-lived JSON Service Account keys',
        detail: 'Use Workload Identity Federation (for GitHub/AWS/on-prem) and attached service accounts—never downloaded `.json` keys.',
      },
      {
        step: 'Enforce VPC-SC in Dry-Run mode first, then Enforced mode',
        detail: 'Audit dry-run violation logs across Dataflow workers, Looker egress IPs, and Cloud Composer before enforcing so legitimate pipelines never break.',
      },
      {
        step: 'Centralize CMEK keys in a dedicated KMS Security Project',
        detail: 'Separate key admins (`cloudkms.admin`) from data admins (`bigquery.admin`) for true separation of duties.',
      },
    ],
    clarifyingQuestions: [
      'Do external SaaS tools (Looker, Fivetran, dbt Cloud) or cross-region transfers need explicit VPC-SC Ingress/Egress rules?',
      'Must CMEK keys use Cloud HSM / EKM (External Key Manager) for regulatory compliance?',
      'Which identities are human analysts vs CI/CD automation vs Dataflow runtime workers?',
    ],
    solvingStrategy: {
      baseline: 'Grant broad `roles/editor` + GCS uniform bucket access and rely solely on IAM.',
      optimal: 'Least-privilege IAM + Workload Identity (zero SA JSON keys) + VPC-SC perimeter (staged via dry-run) + centralized CMEK + Org Policy constraints (`iam.disableServiceAccountKeyCreation`).',
      tradeOffs: 'VPC-SC requires careful ingress/egress allowlisting for third-party SaaS and dry-run testing, but it is the ONLY control that blocks exfiltration via stolen credentials.',
    },
    commonTraps: [
      'Turning on VPC-SC in Enforced mode immediately without Dry-Run testing—breaks Dataflow, Composer, and Looker overnight!',
      'Putting CMEK keys inside the same project where Data Engineers have `Owner`/`Editor` permissions (violates separation of duties).',
      'Forgetting cross-project BigQuery authorized datasets or VPC-SC bridges for shared Gold analytics.',
    ],
  },

  'q6-l4': {
    levelId: 'q6-l4',
    coreMentalModel:
      'Executing GDPR / DPDP "Right to be Forgotten" across an immutable lakehouse (GCS Parquet/Iceberg + BigQuery + Bigtable + Vertex Vector Search) cannot be a blind daily `DELETE FROM` scan—it causes massive table rewrites and misses downstream backups/vectors. Solve it via **crypto-shredding** (per-subject/cohort encryption keys) OR batched **Lakehouse Delete + Compaction + Lineage Manifest Audits**.',
    whyGoogleCloudReliesOnIt:
      'Under EU GDPR (30-day SLA) and India DPDP Act, enterprises must prove verifiable subject deletion across analytics tables, ML embeddings, and cold GCS archives without bankrupting BigQuery/Spark compute.',
    exampleTitle: 'Batched GDPR Erasure Orchestrator Across BigQuery, Iceberg & Vectors',
    exampleInput: `Daily erasure queue: 4,200 user_ids across 120 TB BigQuery + BigLake Iceberg + Vertex Vector Search`,
    exampleLogic:
      '1) Consolidate daily requests into a `gdpr_erasure_queue` control table (never run 4,200 single-row DMLs!).\n2) Execute ONE batched `MERGE / DELETE` per clustered table (`CLUSTER BY user_id`).\n3) Propagate delete IDs to Bigtable & Vertex Vector Search index.\n4) Run Iceberg `expire_snapshots` + BigQuery Time-Travel expiry check + write signed immutable Audit Receipt.',
    exampleOutput: `All 4,200 subjects purged in 1 single batched pass (<4 mins), verified with cryptographic audit proof.`,
    implementationSteps: [
      {
        step: 'Batch deletions daily/weekly instead of per-request DML',
        detail: 'BigQuery and Iceberg suffer quota & write-amplification spikes on thousands of individual `DELETE WHERE user_id = X` calls.',
      },
      {
        step: 'Cluster large tables by `user_id` (or apply Crypto-Shredding for immutable archives)',
        detail: 'Clustering lets batched `DELETE` touch only relevant storage blocks; crypto-shredding destroys per-user KMS keys so historical immutable backups become unreadable instantly.',
      },
      {
        step: 'Cover derived stores: Vector Indexes, Feature Store, Logs, & Snapshots',
        detail: 'Track downstream data lineage in Dataplex so user PII in RAG embeddings and Bigtable online caches is purged alongside the warehouse.',
      },
    ],
    clarifyingQuestions: [
      'What is the statutory completion SLA (e.g., 24 hours vs 30 days—allows daily batching)?',
      'Must historical immutable backups / BigQuery 7-day Time Travel also respect erasure (crypto-shredding vs snapshot expiry)?',
      'Are non-PII anonymized aggregate metrics (`daily_country_revenue`) retained cleanly after stripping `user_id`?',
    ],
    solvingStrategy: {
      baseline: 'Fire an immediate `DELETE FROM big_table WHERE user_id = @id` per user request—throttles BigQuery DML concurrency limits and costs a fortune.',
      optimal: 'Lineage-driven Erasure DAG: daily batched `gdpr_delete_queue` -> clustered BigQuery/Iceberg MoR deletes -> Vector/Bigtable API purge -> snapshot compaction + optional Crypto-Shredding for cold archives + immutable Compliance Audit Log.',
      tradeOffs: 'Crypto-shredding makes archival backup erasure instantaneous, at the cost of per-subject key management complexity (often best for regulated cold archives, paired with batched MoR deletes in active Gold tables).',
    },
    commonTraps: [
      'Forgetting BigQuery 7-day Time Travel or Iceberg snapshots still hold deleted rows until retention expires!',
      'Deleting from the warehouse while leaving user text inside RAG Vector Search chunks or Cloud Logging.',
      'Running 1 DML statement per user instead of batching via `WHERE user_id IN (SELECT user_id FROM batch_queue)`.',
    ],
  },

  'q6-l5': {
    levelId: 'q6-l5',
    coreMentalModel:
      'BigQuery **Editions Autoscaling** charges per slot-hour in 1-minute minimums rounded to 100-slot increments. Optimal FinOps balances **Baseline committed slots** (for steady 24/7 floor utilization—cheaper per slot) + **Autoscaling burst ceiling** (`max_slots` for spiky ETL/BI peaks) + **Workload Isolation** (`labels` & per-team reservations) so runaway queries never blow the budget.',
    whyGoogleCloudReliesOnIt:
      'Moving clients from On-Demand ($6.25/TB) to poorly tuned Editions autoscaling can actually *increase* their bill if baseline is too low/high or unpartitioned scans spin up 2,000 slots unnecessarily.',
    exampleTitle: 'Right-Sizing Baseline + Autoscaling Slots',
    exampleInput: `Telemetry: 24/7 steady floor = 300 slots; 9 AM–11 AM burst = 1,100 slots; 1 rogue ad-hoc query spiked 2,000 slots.`,
    exampleLogic:
      '1) Set 1-year/3-year committed Baseline = 300 slots (steady floor discount).\n2) Set Autoscaling `max_slots = 1,200` on `bi-prod` reservation.\n3) Cap `ad-hoc-sandbox` reservation at `max_slots = 200` + `maximum_bytes_billed` guardrail + enforce job `labels` (`team`, `pipeline`) for Looker FinOps chargeback.',
    exampleOutput: `38% lower monthly BigQuery spend with zero interactive BI starvation and full per-team cost attribution.`,
    implementationSteps: [
      {
        step: 'Analyze `INFORMATION_SCHEMA.JOBS_BY_PROJECT` hourly slot utilization (p50 vs p95)',
        detail: 'Size Baseline slots to steady ~p50/floor usage (not peak!) and let Editions Autoscaling handle transient peaks.',
      },
      {
        step: 'Isolate predictable production pipelines from unpredictable ad-hoc exploration',
        detail: 'Put Data Scientists/ad-hoc users in a capped reservation with `maximum_bytes_billed` or `idle_slot_sharing` enabled.',
      },
      {
        step: 'Mandate job/table labels (`cost_center`, `env`, `dag_id`) for chargeback',
        detail: 'Track cost per business query/pipeline in Looker using `INFORMATION_SCHEMA.JOBS` + Cloud Billing export.',
      },
    ],
    clarifyingQuestions: [
      'Is the workload steady 24/7, bursty (morning BI + nightly batch), or sparse (<20% slot utilization where On-Demand wins)?',
      'Which teams share reservations, and can idle slots be shared across them (`ignore_idle_slots = false`)?',
      'Do we need Enterprise vs Enterprise Plus (CMEK/DR/Compliance) Edition features?',
    ],
    solvingStrategy: {
      baseline: 'Leave everything on On-Demand or set a giant static reservation sized for worst-case peak (wasting 70% capacity at night).',
      optimal: 'First optimize SQL/partitioning/clustering -> baseline commitment at steady floor + workload-isolated Editions reservations with `max_slots` + idle slot sharing + `INFORMATION_SCHEMA` FinOps dashboard.',
      tradeOffs: 'Autoscaling saves paying for idle night slots, whereas baseline commitments offer steep 20–40% unit discounts for continuous 24/7 streaming/ETL floors.',
    },
    commonTraps: [
      'Switching to BigQuery Editions BEFORE fixing `SELECT *` and missing partition filters (you still pay for wasted slots!).',
      'Disabling idle-slot sharing across reservations, causing one reservation to autoscale/pay while another sits idle.',
      'Forgetting the 1-minute minimum / 100-slot step billing behavior of Editions autoscaling.',
    ],
  },

  'q6-l6': {
    levelId: 'q6-l6',
    coreMentalModel:
      'True multi-region Active-Active DR minimizes BOTH downtime (RTO/RPO) AND cross-region egress/carbon waste by placing **dual-region / multi-region GCS & BigQuery DR replicas** intentionally—keeping heavy Bronze/Silver compute inside ONE primary low-carbon region (`asia-south1` / `us-central1`) and replicating ONLY curated Gold tables & state asynchronously unless zero-RPO active-active writes are mandatory.',
    whyGoogleCloudReliesOnIt:
      'Blindly replicating 5 PB of raw Bronze logs across continents doubles storage, explodes GCP cross-region egress charges, and bloats carbon footprint. Google Cloud Consulting designs tiered DR aligned to real RPO/RTO classes.',
    exampleTitle: 'Tiered Multi-Region DR Without Cross-Region Bronze Egress',
    exampleInput: `Estate: 400 TB Bronze raw logs + 18 TB Gold critical warehouse + Pub/Sub Global Ingestion
Requirements: Gold RPO < 15 min, RTO < 30 min; Bronze RPO = 24h`,
    exampleLogic:
      '- **Tier 1 (Gold OLAP)**: BigQuery Cross-Region Dataset Replication (`asia-south1` -> `asia-south2`) + BigQuery Managed DR failover.\n- **Tier 2 (Serving/State)**: Cloud Spanner / Global Pub/Sub multi-region topic.\n- **Tier 3 (Bronze)**: Dual-region GCS Turbo Replication only for 7-day hot landing; cold archive stays single-region low-carbon.',
    exampleOutput: `Meets <15m Gold RPO while cutting cross-region replication egress & carbon footprint by 85%.`,
    implementationSteps: [
      {
        step: 'Classify datasets by Tier (Tier-0/1 Active-Active vs Tier-2 Warm Standby vs Tier-3 Cold Rebuild)',
        detail: 'Never apply expensive synchronous/multi-region replication uniformly across disposable Bronze staging tables.',
      },
      {
        step: 'Keep compute co-located with storage region',
        detail: 'Deploy Dataflow/Dataproc workers in the exact same region as GCS/BigQuery to eliminate hidden cross-region egress bills.',
      },
      {
        step: 'Automate quarterly GameDay DR failover drills via Terraform',
        detail: 'An untested DR plan is wishful thinking—verify DNS/Looker connection switching and Pub/Sub replay end-to-end.',
      },
    ],
    clarifyingQuestions: [
      'What are the exact RPO (data loss tolerance) and RTO (recovery time) per dataset tier?',
      'Are there strict data residency laws (e.g., India DPDP / EU GDPR forbidding cross-border replication)?',
      'What is the carbon-intensity / FinOps constraint on replicating raw staging vs Gold marts?',
    ],
    solvingStrategy: {
      baseline: 'Mirror every Bronze, Silver, and Gold bucket and spin up hot standby Dataflow clusters 24/7 in two regions—doubles cost and emissions.',
      optimal: 'Tiered DR: BigQuery Cross-Region Replication for Gold + Global/Regional Pub/Sub + Terraform/Infrastructure-as-Code warm compute spin-up + co-located low-carbon primary region for Bronze.',
      tradeOffs: 'Warm-standby compute (spinning up Dataflow/Dataproc via Terraform on failover) adds ~10–15 min RTO while saving ~95% of idle dual-cluster compute cost and carbon.',
    },
    commonTraps: [
      'Running Dataflow in `us-east1` reading a GCS bucket in `asia-south1` (silent massive cross-region egress!).',
      'Replicating across countries without checking data sovereignty/residency rules.',
      'Replicating storage without replicating IAM/CMEK keys/Dataform pipelines needed to actually run in the DR region.',
    ],
  },

  'q7-l1': {
    levelId: 'q7-l1',
    coreMentalModel:
      'In the first 2 minutes of an ambiguous Google Cloud Consulting client call, NEVER jump straight into naming GCP products ("Use Dataflow + Bigtable!"). Instead, **reframe vague wishes into measurable constraints** across 4 axes: (1) Latency SLO & Persona, (2) Data Volume & Growth, (3) Correctness/Compliance/DR, and (4) TCO Budget Tier.',
    whyGoogleCloudReliesOnIt:
      'Google Cloud Consultants face Retail/Banking VPs demanding "real-time AI everything yesterday." Reframing "real-time" into Gold/Silver/Bronze SLA tiers often saves the client 70% in infrastructure cost while building immediate executive trust.',
    exampleTitle: '2-Minute Discovery Reframing Script',
    exampleInput: `Client VP: "We want all 40 legacy batch dashboards and ML models running in real-time sub-second streaming by Q3!"`,
    exampleLogic:
      '1) Acknowledge business goal ("Faster inventory & promo decisions").\n2) Ask 4 surgical questions: Which decisions actually need <5s latency vs 15-min micro-batch? What is daily TB volume & peak burst? Any PII/residency rules? Target monthly FinOps envelope?\n3) Propose a 2-tier architecture (Hot <5s path for fraud/stockouts; 15-min micro-batch for BI).',
    exampleOutput: `VP realizes only 2 of 40 workflows need true <5s streaming—cutting project TCO by 65% and accelerating Q3 launch.`,
    implementationSteps: [
      {
        step: 'Open by anchoring on business outcome, not tech stack',
        detail: '"Before we pick Pub/Sub vs batch, what specific user or executive decision breaks if data is 15 minutes old instead of 1 second?"',
      },
      {
        step: 'Quantify Scale, Skew, Freshness, and Compliance in 60 seconds',
        detail: 'Pin down GB/TB per day, peak multiplier, PII/GDPR boundaries, and existing team skillsets (SQL vs Java/Python).',
      },
      {
        step: 'Propose 2–3 concrete TCO/Latency tiers with an immediate recommendation',
        detail: 'Give the VP a Gold (<5s), Silver (15m), and Bronze (daily) option with clear cost/complexity deltas.',
      },
    ],
    clarifyingQuestions: [
      'Which specific operational decisions lose revenue if freshness is 15 minutes vs 1 second?',
      'What is the current engineering team’s operational maturity (SQL/dbt vs Apache Beam/Spark SRE)?',
      'What hard compliance, data residency, or legacy cutover freeze windows constrain the roadmap?',
    ],
    solvingStrategy: {
      baseline: 'Agree blindly with "real-time everything" and design an over-engineered Kafka + Flink + Spanner stack for 40 daily dashboards.',
      optimal: 'Structured 4-axis Discovery -> Separate true hot-path (<5s) from warm micro-batch (5–15m) -> Present tiered TCO/SLA trade-off matrix -> Recommend pragmatic Phase-1 quick win.',
      tradeOffs: 'Sub-second streaming costs 3–5x more engineering & operational complexity than 15-minute micro-batch; reserve streaming strictly where business ROI justifies it.',
    },
    commonTraps: [
      'Product-dropping (`Pub/Sub! Dataflow! Vertex!`) in the first 30 seconds before understanding the business problem.',
      'Treating all 40 dashboards identically instead of tiering latency SLAs.',
      'Ignoring team operational ownership after Google Cloud Consulting hands over the platform.',
    ],
  },

  'q7-l2': {
    levelId: 'q7-l2',
    coreMentalModel:
      'When defending architecture choices to a skeptical CFO or Principal Engineer, frame every option in a **3-column Trade-Off Matrix** (Migration Strategy, Monthly TCO / Egress Impact, Operational Risk / Rollback Time). Clearly contrast **Dual-Write at Source** vs **Shadow-Run CDC/Batch Mirroring** with quantitative numbers.',
    whyGoogleCloudReliesOnIt:
      'Consulting interviews test executive communication: can you calmly justify why temporary dual-run infrastructure cost is tiny compared to an unverified cutover outage, while still optimizing egress and carbon?',
    exampleTitle: 'Dual-Write vs Shadow-Run CFO Defense Matrix',
    exampleInput: `CFO objection: "Running legacy Hadoop AND BigQuery simultaneously for 3 weeks doubles our bill—just switch Friday night!"`,
    exampleLogic:
      'Quantify: 3 weeks dual-run shadow compute = ~$18k, zero customer risk, 1-minute rollback.\nBig-bang Friday cutover failure = 48h P1 regulatory penalty + $400k+ revenue/rework loss.\nMitigate dual-run spend via GCS Autoclass + Editions autoscaling (`max_slots` cap) + automated 21-day sunset trigger.',
    exampleOutput: `CFO approves 21-day shadow-run with hard sunset date and slot cap.`,
    implementationSteps: [
      {
        step: 'Validate the CFO’s cost/sustainability concern explicitly first',
        detail: 'Never dismiss budget pressure; anchor on total risk-adjusted cost (TCO + outage blast radius).',
      },
      {
        step: 'Contrast Dual-Write (producer sends twice) vs Shadow-Run CDC (zero producer risk)',
        detail: 'Show that CDC/log-tailing shadow runs avoid touching brittle legacy application code while validating 100% parity.',
      },
      {
        step: 'Attach hard FinOps guardrails & sunset milestones',
        detail: 'Time-box dual-run to 14–21 days with automated Data Validation Tool (DVT) pass criteria triggering immediate legacy decommission.',
      },
    ],
    clarifyingQuestions: [
      'Can legacy app producers safely dual-write without doubling tail latency, or must we tap logs/CDC passively?',
      'What is the hourly/daily business cost of inaccurate financial/regulatory numbers after cutover?',
      'Which region and storage lifecycle tier keeps dual-run egress and carbon impact lowest?',
    ],
    solvingStrategy: {
      baseline: 'Either cave to a risky big-bang cutover OR insist on open-ended dual-running with zero cost caps.',
      optimal: 'Risk-adjusted TCO comparison + passive CDC shadow-run (minimal producer blast radius) + strict 14–21 day sunset criteria + automated DVT parity gate + instant view-pointer rollback.',
      tradeOffs: 'Dual-writing at the application layer avoids CDC lag but risks partial-write inconsistency between two networks; passive CDC/PubSub shadow-run isolates producer stability.',
    },
    commonTraps: [
      'Using vague adjectives ("safer", "better") instead of concrete dollar, latency, and rollback-minute estimates.',
      'Forgetting cross-cloud/on-prem egress charges and Interconnect bandwidth ceilings during dual-run.',
      'Lacking an explicit sunset criteria/date to shut off the legacy system.',
    ],
  },

  'q7-l3': {
    levelId: 'q7-l3',
    coreMentalModel:
      'A production **Shadow-Run Cutover Runbook** defines deterministic parity gates before switching traffic: (1) Row-count & partition completeness parity, (2) Numeric aggregate checksums (`SUM`, `AVG`, `NULL` counts), (3) Sampled/full row-hash diffing (`FARM_FINGERPRINT` / `SHA256`), and (4) A **pre-tested <60-second rollback toggle** (LookML/BigQuery View pointer swap).',
    whyGoogleCloudReliesOnIt:
      'Senior consultants don’t just design pipelines—they own the midnight cutover checklist so zero financial or operational dashboards go blind during migration.',
    exampleTitle: 'Deterministic Row-Hash Diff & Sub-Minute Rollback Gate',
    exampleInput: `Shadow tables: legacy_hive.fct_orders vs bq_prod.fct_orders (10 TB/day)`,
    exampleLogic:
      '1) Normalize types/timezones/float precision (round to 4 decimals, UTC).\n2) Compare per-partition `COUNT(*)`, `SUM(amount)`, and `BIT_XOR(FARM_FINGERPRINT(CONCAT(...)))` via Google Data Validation Tool (DVT).\n3) Expose downstream consumers via `vw_fct_orders` pointer -> atomic swap; keep legacy shadow warm 7 days for instant view flip back.',
    exampleOutput: `Zero schema surprises, mathematical proof of 100% parity, and instant 15-second rollback safety.`,
    implementationSteps: [
      {
        step: 'Normalize floating-point, rounding, and NULL formatting before hashing',
        detail: 'Tiny dialect diffs (`2.50` vs `2.5`, trailing spaces, timezone offsets) cause false hash mismatches unless canonicalized.',
      },
      {
        step: 'Use associative `BIT_XOR(FARM_FINGERPRINT(...))` for O(N) distributed parity',
        detail: 'XORing row hashes per hourly partition proves row-by-row equality without shipping 10 TB across the wire to compare!',
      },
      {
        step: 'Decouple BI consumers behind a thin View/DNS abstraction layer',
        detail: 'Swapping `CREATE OR REPLACE VIEW` gives a sub-minute atomic cutover and sub-minute rollback.',
      },
    ],
    clarifyingQuestions: [
      'What floating-point precision or timezone semantic differences exist between legacy Hive/Teradata and BigQuery?',
      'Are upstream late-arriving updates frozen during the final cutover validation window?',
      'How long must legacy remain warm in read-only / shadow mode after cutover before final decommission?',
    ],
    solvingStrategy: {
      baseline: 'Compare total `SELECT COUNT(*)` manually on a few sample days and flip DNS.',
      optimal: '3-tier DVT parity (counts -> KPI aggregates -> canonicalized `BIT_XOR(FARM_FINGERPRINT)` per partition) + atomic View/DNS cutover + 7-day warm rollback window.',
      tradeOffs: 'Running full row-hash validation adds one scan pass per shadow partition, which is negligible compared to catching silent rounding or timezone bugs before executive sign-off.',
    },
    commonTraps: [
      'Comparing ONLY `COUNT(*)` (passes even when `amount` or `customer_id` columns are shifted or NULLed!).',
      'Cutting over BI tools by rewriting 200 connection strings manually instead of swapping one central View/Connection alias.',
      'Decommissioning the legacy cluster the same night as cutover without a 7-day rollback soak.',
    ],
  },

  'q7-l4': {
    levelId: 'q7-l4',
    coreMentalModel:
      'An end-to-end Google Cloud Consulting whiteboard unifies all 6 previous Quests into ONE coherent control & data plane: **Ingestion (Pub/Sub + Dataflow + DLQ)** -> **Storage/Lakehouse (GCS COGs + BigLake Iceberg + BigQuery GIS/Star Schema)** -> **GenAI & Automated DQ (Dataplex + Gemini Multimodal + Vertex RAG)** -> **BI Ops (Materialized Views + BI Engine + Looker)** -> **Governance & FinOps (VPC-SC + CMEK + DLP + Editions Slots)**.',
    whyGoogleCloudReliesOnIt:
      'Staff/Consulting bar-raiser interviews expect you to connect ingestion, modeling, AI, security, observability, and cost onto one whiteboard while explicitly calling out failure modes and trade-offs at every boundary.',
    exampleTitle: 'Unified Google Cloud Consulting & Imagery Blueprint',
    exampleInput: `Prompt: Design the next-gen data & AI platform for a global logistics & aerial imagery enterprise (10+ TB/day streams + 5 PB/month imagery + executive Looker + GenAI ops copilot).`,
    exampleLogic:
      '1) Clarify 4 axes (SLAs, volumes, residency, TCO).\n2) Draw Ingestion/Stream/Imagery Plane (GCS COGs + Pub/Sub + Dataflow + DLQ).\n3) Draw Lakehouse/Warehouse Plane (BigQuery GIS + SCD2 Star Schema + BigLake Iceberg).\n4) Layer Automated DQ & GenAI (WAP Dataplex DQ + Hybrid BigQuery/Vertex RAG).\n5) Wrap Governance, BI Ops & FinOps (VPC-SC, CMEK, BI Engine + Looker, Editions Reservations).',
    exampleOutput: `Cohesive 5-layer architecture with clear data contracts, failure isolation, and quantified FinOps levers.`,
    implementationSteps: [
      {
        step: 'Pace the 45-minute whiteboard systematically',
        detail: '5 min Clarify & SLOs -> 15 min End-to-End Core Flow -> 15 min Deep Dive (bottlenecks/skew/DQ/RAG) -> 10 min Security, FinOps & Trade-Offs.',
      },
      {
        step: 'Keep binary pixels in GCS COGs and metadata/features in BigQuery',
        detail: 'Explicitly explain why separating heavy blobs from relational/vector metadata saves orders of magnitude in cost.',
      },
      {
        step: 'Design every arrow with a failure mode (DLQ, WAP quarantine, circuit breaker)',
        detail: 'Staff engineers design for partial failures, schema drift, and replay—not just the happy path.',
      },
    ],
    clarifyingQuestions: [
      'Which business path is truly latency-critical (<5s streaming) vs warm micro-batch (15m) vs daily analytical?',
      'Which compliance frameworks (GDPR, DPDP, HIPAA, VPC-SC) and multi-region residency boundaries apply?',
      'Are there legacy estates (Flume/Hadoop/Teradata) requiring phased shadow-run cutover?',
    ],
    solvingStrategy: {
      baseline: 'Draw generic boxes ("Kafka -> Spark -> DB -> Dashboard") without GCP-native specifics, schemas, DQ gates, or FinOps controls.',
      optimal: 'Structured 5-layer GCP Consulting blueprint connecting Ingestion/DLQ, COG/BigQuery GIS & Kimball modeling, Hybrid RAG/DQ, BI Engine Looker Ops, and VPC-SC/Editions FinOps.',
      tradeOffs: 'Every layer highlights one deliberate trade-off (e.g., Streaming vs Micro-batch cost, CoW vs MoR compaction, BI Engine vs Slot autoscale).',
    },
    commonTraps: [
      'Jumping straight into drawing boxes without clarifying volumes, latency SLAs, or compliance first.',
      'Leaving out Data Quality gates, Dead-Letter Queues, Governance (VPC-SC/DLP), and FinOps until prompted.',
      'Putting raw binary satellite imagery inside BigQuery or forgetting skew/backpressure.',
    ],
  },

  'q7-l5': {
    levelId: 'q7-l5',
    coreMentalModel:
      'Google Googleyness & Leadership rounds grade structured behavioral evidence using **CARL** (**Context**, **Action**, **Result**, **Learning**). Unlike generic STAR, the **L (Learning / Reflection)** proves Staff-level humility, growth mindset, and systemic engineering ownership—showing what architectural or organizational guardrail you changed so the failure never recurred.',
    whyGoogleCloudReliesOnIt:
      'Consulting Data Engineers advise skeptical client VPs and lead multi-team cutovers. Interviewers probe conflict resolution, navigating ambiguity, saying "no" to risky shortcuts with data, and learning from production incidents.',
    exampleTitle: 'High-Signal CARL Story Structure (90–120 Seconds)',
    exampleInput: `Prompt: "Tell me about a time a stakeholder pushed for an unrealistic deadline or risky migration shortcut."`,
    exampleLogic:
      '- **Context (15s)**: 10+ TB/day Flume migration; client VP pushed for single-weekend cutover.\n- **Action (45s)**: Quantified P1 blast radius, built automated DVT shadow parity + 21-day sunset cap.\n- **Result (15s)**: Zero-loss cutover, 78% faster ingestion, VP became executive sponsor.\n- **Learning (15s)**: Realized I should bring InfoSec/FinOps into day-1 discovery instead of UAT.',
    exampleOutput: `Concise 2-minute story packed with metrics, "I" (not "we") ownership, and genuine reflection.`,
    implementationSteps: [
      {
        step: 'Prepare 3+ versatile CARL stories covering distinct themes',
        detail: 'Cover: (1) Ambiguity & Discovery Reframing, (2) High-Stakes Production Rescue / Skew / Latency Fix, (3) Stakeholder Conflict / Saying No with Data.',
      },
      {
        step: 'Use "I" for your actions and quantify Results',
        detail: 'Replace vague "we improved speed" with concrete metrics ("cut runtime from 3.2h to 14m, -61% scan cost").',
      },
      {
        step: 'Never fake a flaw in the Learning ("I worked too hard")',
        detail: 'Share a real engineering/process lesson and the concrete systemic change you implemented afterward.',
      },
    ],
    clarifyingQuestions: [
      'Before answering a behavioral prompt, confirm scope: "Would you like me to focus on the technical trade-off or how I aligned the skeptical stakeholders?"',
      'Keep initial delivery under 2 minutes so the interviewer has room to probe deep into your decisions.',
    ],
    solvingStrategy: {
      baseline: 'Ramble for 6 minutes using "we" without metrics or clear personal ownership.',
      optimal: 'Crisp 90–120s CARL narrative stored in your CARL Story Bank with quantified business/technical results and a systemic Learning.',
      tradeOffs: 'Have both a 90-second executive version and deep technical drill-down details (exact SQL/partition keys/SLA numbers) ready when probed.',
    },
    commonTraps: [
      'Saying "we decided..." throughout the whole story—interviewers cannot verify YOUR individual contribution.',
      'Skipping the Learning/Reflection or giving a cliché non-answer.',
      'Bad-mouthing clients or teammates instead of demonstrating empathetic stakeholder alignment.',
    ],
  },

  'q7-l6': {
    levelId: 'q7-l6',
    coreMentalModel:
      'Mock #41 simulates a Principal Engineer probing a live **10+ TB/day Flume + Hadoop cutover to Pub/Sub, Dataflow, and BigQuery**. Expect aggressive curveballs: Interconnect saturation during backfill, poison-pill schema drift, skew on hot keys, and proving zero-loss parity under regulatory scrutiny.',
    whyGoogleCloudReliesOnIt:
      'Bar-raiser mock rounds stress-test whether your theoretical knowledge holds up when an interviewer interrupts with a live SEV-1 constraint or challenges your cost/latency assumptions.',
    exampleTitle: 'Handling a Principal Engineer Curveball on Mock #41',
    exampleInput: `Interviewer curveball: "What if Cloud Interconnect saturates at 8 PM when historical HDFS DistCp overlaps live Flume traffic?"`,
    exampleLogic:
      'Respond cleanly in 3 steps: (1) Throttle historical DistCp/Transfer Service bandwidth during peak business hours via QoS/scheduling, (2) Prioritize live Pub/Sub delta stream with 7-day Pub/Sub backlog buffer, (3) Deduplicate overlap window in BigQuery/Dataflow via deterministic event keys.',
    exampleOutput: `Live stream SLA stays <5s while historical backfill catches up automatically off-peak with zero duplicate rows.`,
    implementationSteps: [
      {
        step: 'Start Round 1 with the GCA Gate (ask 3 clarifying questions before designing)',
        detail: 'Confirm daily volume + peak burst rate, Interconnect capacity, duplicate tolerance, and rollback SLA.',
      },
      {
        step: 'Explicitly address Storage Write API + DLQ + DVT parity',
        detail: 'Hit every production reliability pillar proactively before the interviewer has to drag it out of you.',
      },
      {
        step: 'Speak clearly and structure trade-offs quantitatively',
        detail: 'Use Voice Mode or structured bullet notes with exact BigQuery/Dataflow terminology.',
      },
    ],
    clarifyingQuestions: [
      'What is the dedicated Interconnect / Cloud VPN bandwidth ceiling relative to 10+ TB/day live + historical backfill?',
      'Are upstream producers idempotent with a deterministic `event_id`, or must Dataflow synthesize hash keys?',
      'What is the maximum tolerable cutover freeze vs shadow parity window?',
    ],
    solvingStrategy: {
      baseline: 'Describe a basic diagram and freeze when probed on backpressure, Interconnect throttling, or schema drift.',
      optimal: 'Clarify SLOs -> Dual-write/CDC Pub/Sub bridge -> Dataflow + DLQ + Storage Write API -> Interconnect-paced backfill -> DVT `BIT_XOR` hash parity + instant View rollback.',
      tradeOffs: 'Explain clearly why Storage Write API Committed/Pending mode beats legacy `insertAll` on both exactly-once safety and 10x lower cost.',
    },
    commonTraps: [
      'Skipping clarifying questions and jumping straight to solutioning.',
      'Forgetting backfill network saturation vs live traffic contention.',
      'Giving hand-wavy answers on how you PROVE zero data loss before shutting off Flume.',
    ],
  },

  'q7-l7': {
    levelId: 'q7-l7',
    coreMentalModel:
      'Mock #42 combines **Overhead Imagery Pipeline Operations** with **Looker + BigQuery BI Engine Tuning** and **Googleyness collaboration**. Expect deep probes on COG range reads, S2 spatial clustering, BI Engine fallback causes (`INFORMATION_SCHEMA.JOBS`), and handling cross-team executive SLA escalations.',
    whyGoogleCloudReliesOnIt:
      'Consultants bridging Geospatial/Imagery pipelines with executive Looker BI layers must speak fluently across both storage internals (COG/S2) and BI acceleration (MVs/BI Engine/LookML symmetric aggregates).',
    exampleTitle: 'Connecting Imagery SLOs to BI Engine Performance',
    exampleInput: `Interviewer probe: "Our VP says the Imagery Ops Looker dashboard takes 18 seconds to load even though we bought 50 GB of BI Engine!"`,
    exampleLogic:
      'Walk through triage: (1) Check `INFORMATION_SCHEMA.JOBS` `bi_engine_statistics` for `DISABLED`/`PARTIAL` fallback reasons, (2) Replace `ST_DISTANCE`/heavy `REGEXP`/distinct counts in live LookML tiles with Smart-Tuned Materialized Views or pre-computed Gold mart tables, (3) Bind Looker Datagroups to pipeline completion rather than 5-min crons.',
    exampleOutput: `Root cause isolated in minutes; Looker p95 drops from 18s to <250ms.`,
    implementationSteps: [
      {
        step: 'Anchor imagery pipeline around GCS COGs + BigQuery GIS `GEOGRAPHY` clustering',
        detail: 'Keep raw pixels in GCS, spatial metadata + S2 indices in BigQuery.',
      },
      {
        step: 'Connect SLO metrics (Completeness, p95 Freshness, Cloud QC) to conformed LookML',
        detail: 'Avoid averaging pre-computed percentages and declare explicit primary keys in LookML.',
      },
      {
        step: 'Deliver 1 crisp CARL story when prompted on executive escalation',
        detail: 'Show calm transparency when an SLA slips and how you built automated upstream circuit breakers afterward.',
      },
    ],
    clarifyingQuestions: [
      'Are users viewing dynamic spatial tile polygons on Looker maps or pre-aggregated regional SLO scorecards?',
      'Is the BigQuery dataset in the exact same region as the BI Engine reservation?',
      'What freshness latency is acceptable for the Looker operational dashboard?',
    ],
    solvingStrategy: {
      baseline: 'Suggest increasing BigQuery slots or upgrading BI Engine RAM without checking why queries fell back.',
      optimal: 'Inspect `bi_engine_statistics` -> eliminate unsupported SQL/regex/unclustered spatial predicates -> layer Smart-Tuned MVs + Looker Aggregate Awareness + Datagroup watermark sync.',
      tradeOffs: 'Balancing real-time freshness (MVs over base partitions) vs complex multi-way Looker joins (pre-joined Gold mart refreshed by Dataform).',
    },
    commonTraps: [
      'Assuming BI Engine accelerates every SQL query automatically without auditing fallback reasons.',
      'Storing satellite rasters inside BigQuery or querying unclustered `ST_DISTANCE` filters.',
      'Averaging daily completeness % across regions instead of weighting by expected tile counts.',
    ],
  },

  'q7-l8': {
    levelId: 'q7-l8',
    coreMentalModel:
      'Mock #43 evaluates **Ambiguous Client Discovery**, **Retail VP TCO Optimization**, and **Linked BigQuery SQL + Dimensional Modeling** under shifting requirements. Expect the interviewer to change constraints mid-round (e.g., adding GDPR residency or slashing budget by 40%) to test adaptability and modeling rigor.',
    whyGoogleCloudReliesOnIt:
      'Client requirements evolve constantly mid-engagement. Google Cloud Consulting hires engineers who adapt star schemas, SCD Type 2 bounds, and FinOps tiers gracefully without losing composure.',
    exampleTitle: 'Adapting Mid-Interview to a 40% Budget Cut Curveball',
    exampleInput: `Mid-interview twist: "The Retail CFO just cut our GCP budget by 40%—how do you adjust your design?"`,
    exampleLogic:
      'Respond cleanly: (1) Shift non-urgent BI feeds from <5s streaming to 15-min micro-batch/Dataform runs, (2) Replace raw Bronze cross-region replication with single-region GCS Autoclass + partitioned/clustered Gold, (3) Enforce `require_partition_filter` + BigQuery Editions baseline/autoscale workload isolation.',
    exampleOutput: `Hits the 40% FinOps target while protecting the 1–2 truly mission-critical real-time workflows.`,
    implementationSteps: [
      {
        step: 'Lead with 2-minute Discovery reframing before choosing tools',
        detail: 'Tier workloads into Hot (<5s), Warm (15m), and Cold (daily) right away.',
      },
      {
        step: 'Lock down Fact Grain & SCD Type 2 half-open validity SQL cleanly',
        detail: 'Watch `NULL` `effective_to` bounds, `LEFT JOIN UNNEST` on repeated structs, and `QUALIFY` tie-breaks.',
      },
      {
        step: 'Quantify every FinOps lever when challenged on TCO',
        detail: 'Show exactly which levers cut cost without sacrificing data integrity.',
      },
    ],
    clarifyingQuestions: [
      'Which workflows genuinely generate ROI at <5s latency vs 15-min or hourly micro-batch?',
      'What historical point-in-time attribution requirements govern the star schema (SCD2 vs Type 1)?',
      'Which cost levers are negotiable (freshness SLA, raw retention days, multi-region Bronze)?',
    ],
    solvingStrategy: {
      baseline: 'Defend one rigid architecture regardless of budget changes, or slash Data Quality/Governance to save money.',
      optimal: 'SLA-tiered architecture + clean Kimball Star Schema (SCD2/Type 4 + BigQuery `ARRAY<STRUCT>` where appropriate) + surgical FinOps levers (micro-batch tiering, GCS Autoclass, sargable partitioning, Editions caps).',
      tradeOffs: 'Never cut Security/DQ to hit a budget target—trade freshness latency and archival storage tiers instead.',
    },
    commonTraps: [
      'Cutting Data Quality or PII Governance when asked to lower TCO (immediate red flag!).',
      'Writing `CROSS JOIN UNNEST` or unguarded `effective_to` NULL comparisons in the linked SQL round.',
      'Getting defensive when the interviewer changes requirements mid-way.',
    ],
  },

  'q7-l9': {
    levelId: 'q7-l9',
    coreMentalModel:
      'Mock #50 is the **Flagship 6-Round Google Bengaluru Hiring Committee (HC) Simulation** targeting a **Strong Hire** bar across GCA (General Cognitive Ability), RRK (Role-Related Knowledge), Leadership, and Googleyness. Treat every round deliberately: clarify first, deliver structured trade-offs, write bug-free SQL/Python, and finish with high-impact CARL reflections.',
    whyGoogleCloudReliesOnIt:
      'Google Hiring Committees look for *consistent* signal across all 4 rubric pillars—one brilliant system design cannot rescue a candidate who ignores clarifying questions, fails NULL edge cases in SQL, or lacks concrete Leadership ownership.',
    exampleTitle: 'Strong-Hire Execution Checklist Across All 6 Rounds',
    exampleInput: `6-Round HC Loop: Discovery -> Python/DSA -> BigQuery SQL/Modeling -> Geospatial/Streaming System Design -> GenAI/Governance -> Googleyness & CARL`,
    exampleLogic:
      'Maintain a repeatable rhythm in every round:\n1) Clarify & state assumptions (2–3 min).\n2) Outline baseline -> optimal plan before coding/drawing.\n3) Check edge cases (`NULL`, `0`, empty, skew, late events, ACLs).\n4) Summarize cost, latency, and operational trade-offs unprompted.',
    exampleOutput: `Balanced >=85/100 across GCA, RRK, Leadership, and Googleyness -> Strong Hire HC packet.`,
    implementationSteps: [
      {
        step: 'Do not skip the GCA clarifying gate in any technical round',
        detail: 'Interviewers explicitly score how well you structure ambiguity before executing.',
      },
      {
        step: 'Connect all 7 Quest domains naturally in design & behavioral probes',
        detail: 'Mention COG/S2 imagery, Dataflow/DLQ, Kimball SCD2, Hybrid RAG/DQ, BI Engine Ops, and VPC-SC/Editions FinOps where relevant.',
      },
      {
        step: 'Close with crisp self-assessment & concrete learnings',
        detail: 'Demonstrate Staff-level calm, intellectual honesty, and client empathy throughout.',
      },
    ],
    clarifyingQuestions: [
      'Confirm target scale, latency SLA, compliance perimeter, and success metric at the start of every round.',
      'Verify expected output columns, NULL semantics, and tie-breaking before writing SQL or Python.',
    ],
    solvingStrategy: {
      baseline: 'Rush straight into code or architecture boxes hoping to look fast, then backtrack repeatedly on edge cases.',
      optimal: 'Disciplined 4-step loop in every round: Clarify -> Structure Plan -> Execute Cleanly (with edge-case guards) -> Defend Cost/Scale/Reliability Trade-Offs.',
      tradeOffs: 'Taking 90 seconds upfront to align on constraints saves 10 minutes of dead-end refactoring later—and directly lifts GCA + Leadership scores.',
    },
    commonTraps: [
      'Going silent while thinking—narrate your mental model and trade-offs out loud.',
      'Leaving edge cases (`NULL`, empty input, skew, late watermarks, VPC-SC dry-run) unmentioned.',
      'Giving generic "we" behavioral answers without individual metrics or genuine Learnings.',
    ],
  },
};
