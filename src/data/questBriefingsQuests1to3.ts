export interface QuestStudyBriefing {
  levelId: string;
  coreMentalModel: string;
  whyGoogleCloudReliesOnIt: string;
  exampleTitle: string;
  exampleInput: string;
  exampleLogic: string;
  exampleOutput: string;
  implementationSteps: Array<{
    step: string;
    detail: string;
    codeSnippet?: string;
  }>;
  clarifyingQuestions: string[];
  solvingStrategy: {
    baseline: string;
    optimal: string;
    tradeOffs: string;
  };
  commonTraps: string[];
}

export const QUEST_BRIEFINGS_1_TO_3: Record<string, QuestStudyBriefing> = {
  'q1-l1': {
    levelId: 'q1-l1',
    coreMentalModel:
      'Treat a 2D satellite scene or raster mosaic as an implicit undirected graph where every valid pixel/tile cell connects to its 4-neighbor (or 8-neighbor) orthogonals. Connected-component flood fill (BFS/DFS) groups fragmented cloud masks or active tiles into contiguous Areas of Interest (AOIs) in a single O(R * C) pass.',
    whyGoogleCloudReliesOnIt:
      'Overhead imagery ingestion receives millions of sparse raster tiles daily. Detecting contiguous valid footprints before writing BigQuery GEOGRAPHY polygons or merging GeoTIFF strips eliminates redundant small-object I/O and keeps tile catalogs compact.',
    exampleTitle: 'Connected Imagery Tile Footprints on a 4x5 Grid',
    exampleInput: `tile_grid = [
  [1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1]
]  # 1 = cloudless tile, 0 = cloud-occluded`,
    exampleLogic:
      'Iterate cells (r, c). When tile_grid[r][c] == 1, increment region_count and launch an iterative queue (BFS) marking all 4-connected neighbors as visited (0 or visited set).',
    exampleOutput: `Region A: {(0,0),(0,1),(1,0)}  (3 tiles)
Region B: {(1,3),(1,4),(2,2),(2,3)}  (4 tiles)
Region C: {(3,4)}  (1 isolated tile)
-> Total contiguous AOI mosaics = 3`,
    implementationSteps: [
      {
        step: 'Guard empty or malformed grids',
        detail: 'Return 0 immediately when rows == 0 or cols == 0, and avoid mutating input in-place if downstream callers inspect raw tile flags.',
        codeSnippet: 'if not grid or not grid[0]: return 0\nR, C = len(grid), len(grid[0])',
      },
      {
        step: 'Prefer iterative BFS over deep recursion',
        detail: 'Large satellite scenes (e.g., 10,000 x 10,000) will blow Python’s 1,000-frame recursion limit with DFS; use collections.deque.',
        codeSnippet: 'q = deque([(r, c)])\nvisited.add((r, c))',
      },
      {
        step: 'Sweep 4-directional deltas cleanly',
        detail: 'Mark cells visited AT ENQUEUE TIME rather than at dequeue time to avoid duplicate queue insertions and memory spikes.',
        codeSnippet: 'for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n    nr, nc = cr + dr, cc + dc',
      },
    ],
    clarifyingQuestions: [
      'Are diagonal tile corners considered connected (8-directional) or strictly edge-adjacent (4-directional)?',
      'Can I mark visited cells in-place on the input grid, or must the original raster matrix stay immutable?',
      'What are the maximum grid dimensions R and C (does recursive DFS risk RecursionError)?',
    ],
    solvingStrategy: {
      baseline: 'Union-Find over all R * C cells scanning edges repeatedly—works, but adds parent/rank array overhead when a simple pass suffices.',
      optimal: 'Single O(R * C) outer scan paired with iterative BFS using a deque; each cell enters the queue at most once.',
      tradeOffs: 'In-place mutation achieves O(min(R, C)) BFS queue space vs O(R * C) for a separate visited set—mention this explicitly.',
    },
    commonTraps: [
      'Marking a cell visited AFTER popping from the queue instead of BEFORE pushing (causes exponential duplicate pushes).',
      'Using recursive DFS on grids larger than ~32x32 in Python interviews.',
      'Forgetting empty-row / ragged-grid boundary checks.',
    ],
  },

  'q1-l2': {
    levelId: 'q1-l2',
    coreMentalModel:
      'Spatial proximity queries (K-nearest ground stations, candidate tile centroids, or bounding boxes) avoid sorting all N coordinates by maintaining a bounded Max-Heap of size K. Any candidate farther than the heap root is pruned in O(1) before expensive spherical Haversine or polygon intersection checks run.',
    whyGoogleCloudReliesOnIt:
      'When Dataflow workers enrich millions of telemetry pings against satellite footprints or BigQuery GIS layers, exact polygon containment is CPU-heavy. A cheap bounding-box / squared-Euclidean K-heap filter eliminates 99% of candidates first.',
    exampleTitle: 'Top-K Nearest Aerial Tiles Without Square Roots',
    exampleInput: `tiles = [(3, 4), (1, 1), (-2, 5), (0, 2)]  # (dx, dy) from AOI center
K = 2`,
    exampleLogic:
      'Compute squared distance d2 = dx*dx + dy*dy (monotonic, avoids float sqrt). Push (-d2, x, y) into a min-heap (simulating max-heap); pop whenever len(heap) > K.',
    exampleOutput: `Heap after (3,4) [d2=25], (1,1) [d2=2] -> size 2
(-2,5) [d2=29] > root 25 -> pruned immediately
(0,2) [d2=4] < root 25 -> push & pop 25
Result: [(1, 1), (0, 2)]`,
    implementationSteps: [
      {
        step: 'Use squared distance to stay exact',
        detail: 'Avoiding math.sqrt preserves exact integer ordering and eliminates floating-point precision drift.',
        codeSnippet: 'dist_sq = dx * dx + dy * dy',
      },
      {
        step: 'Keep heap size pinned to K',
        detail: 'Push negative distance into Python heapq so the largest of the K smallest distances sits at heap[0].',
        codeSnippet: 'heapq.heappush(heap, (-dist_sq, pt))\nif len(heap) > k: heapq.heappop(heap)',
      },
      {
        step: 'Pre-filter with bounding boxes for real polygons',
        detail: 'In GIS pipelines, check (min_x <= px <= max_x and min_y <= py <= max_y) before running ST_CONTAINS.',
      },
    ],
    clarifyingQuestions: [
      'Is K much smaller than total points N, or can N fit in memory for Quickselect?',
      'Are tie distances allowed in any order, or must ties break deterministically by tile ID?',
      'Are coordinates planar (Euclidean) or geographic lat/lon requiring Haversine / S2 distance?',
    ],
    solvingStrategy: {
      baseline: 'Sort all N points by distance in O(N log N) time and slice [:K].',
      optimal: 'Bounded size-K max-heap runs in O(N log K) time and O(K) memory—streaming-friendly when N does not fit in RAM.',
      tradeOffs: 'Quickselect gives O(N) average time but mutates the array and degrades to O(N^2) worst case; size-K heap is streaming-safe.',
    },
    commonTraps: [
      'Using a min-heap of all N items (O(N log N) space) instead of bounding the heap to size K.',
      'Forgetting k <= 0 edge cases or k > len(points).',
      'Comparing lat/lon degrees with Euclidean distance near the poles without cosine-latitude scaling.',
    ],
  },

  'q1-l3': {
    levelId: 'q1-l3',
    coreMentalModel:
      'Cloud object stores (GCS/S3) and Parquet/BigLake engines suffer severe metadata overhead from the "small files problem" (listing 100,000 tiny 200KB shards takes longer than reading 10GB). Greedy bin-packing (First-Fit Decreasing or streaming batch coalescing) compacts shards up to an optimal 128MB–256MB target block size.',
    whyGoogleCloudReliesOnIt:
      'Satellite ground passes emit thousands of small per-strip metadata JSONs and tile chips. Compacting them into ~128MB Parquet/ORC objects slashes GCS Class A/B list calls, stabilizes Dataflow worker throughput, and unlocks BigQuery external table speed.',
    exampleTitle: 'Compacting Variable Tile Metadata Shards into 128MB Objects',
    exampleInput: `shard_sizes_mb = [48, 82, 35, 90, 40]
target_max_mb = 128`,
    exampleLogic:
      'Sort descending (FFD): [90, 82, 48, 40, 35]. Pack each shard into the first open bin with remaining capacity >= shard_size; otherwise open a new 128MB bin.',
    exampleOutput: `Bin 1: [90, 35] -> 125 MB
Bin 2: [82, 40] -> 122 MB
Bin 3: [48]     -> 48 MB
Total GCS objects reduced from 5 -> 3 (zero oversized files)`,
    implementationSteps: [
      {
        step: 'Reject or split oversized single items',
        detail: 'Check whether a single tile exceeds max_bin_mb; if allowed, place it in its own bin or split along row groups.',
      },
      {
        step: 'Sort descending for offline compaction (FFD)',
        detail: 'Sorting largest-first prevents small fragments from wasting the tail capacity of fresh bins.',
        codeSnippet: 'for size in sorted(shards, reverse=True): ...',
      },
      {
        step: 'Track remaining bin capacities cleanly',
        detail: 'Use a list of remaining capacities (or segment tree / sorted structure at huge bin counts) and validate sum invariants.',
      },
    ],
    clarifyingQuestions: [
      'Must shard ordering be preserved (streaming next-fit) or can we reorder shards (First-Fit Decreasing)?',
      'Can any single input shard exceed the 128MB bin cap?',
      'Are we optimizing minimum number of output GCS files or minimum variance across parallel worker partitions?',
    ],
    solvingStrategy: {
      baseline: 'Next-Fit greedy: keep adding to current bin until full, then open a new bin—O(N) time and streaming-safe, though slightly more bins.',
      optimal: 'First-Fit Decreasing (sort descending + place in first fitting bin, or binary search/min-heap on bin load for balanced partitions).',
      tradeOffs: 'Bin packing is NP-hard globally; FFD guarantees at most ~11/9 * OPT + 6/9 bins in O(N log N) while staying dead simple to maintain.',
    },
    commonTraps: [
      'Off-by-one >= vs > when checking remaining bin capacity.',
      'Creating empty bins or dropping zero-byte shards silently without tracking manifest counts.',
      'In real Spark/Dataflow, forgetting that gzip/bz2 is non-splittable whereas Parquet row groups inside 128–256MB files are splittable.',
    ],
  },

  'q1-l4': {
    levelId: 'q1-l4',
    coreMentalModel:
      'Cloud-Optimized GeoTIFF (COG) arranges pixels into internal 512x512 tiled blocks plus precomputed overview pyramids, putting the Image File Directory (IFD) header at byte 0. Clients issue HTTP Range GET requests to fetch ONLY the exact byte offsets covering a viewport instead of downloading a 40GB full raster.',
    whyGoogleCloudReliesOnIt:
      'Google Cloud overhead imagery pipelines serve petabytes from GCS directly to Vertex AI vision models, Earth Engine, and Web map tiles. Pairing COG byte-range reads with Z-order (Morton) Parquet spatial catalogs lets queries skip 99% of cold metadata.',
    exampleTitle: 'HTTP Range Read vs Full GeoTIFF Download',
    exampleInput: `Scene: 20GB raw strip GeoTIFF on gs://geo-lake/2026/scene_09.tif
Request: Extract 1024x1024 crop over Bengaluru airport`,
    exampleLogic:
      '1) Convert strip TIFF -> COG (`gdal_translate -of COG`, internal 512x512 DEFLATE/LZW tiles + overviews).\n2) Query Parquet catalog ordered by Morton Z-curve to locate scene URI.\n3) Read IFD header (first 16KB), resolve tile byte offsets, fetch 4 internal tiles via HTTP Range.',
    exampleOutput: `Raw GeoTIFF I/O: 20,000 MB downloaded, ~45s latency
COG + Z-Order Catalog: 3.4 MB range-read, ~85ms latency (99.98% I/O pruned)`,
    implementationSteps: [
      {
        step: 'Enforce COG internal tiling & overviews at ingest',
        detail: 'Always tile (512x512) and build 2x/4x/8x pyramids so zoom-out previews never scan full-resolution pixels.',
      },
      {
        step: 'Index tile footprints with Z-order / Hilbert keys',
        detail: 'Store (tile_uri, bbox_minx..maxy, morton_z, epsg_code, cloud_pct) in Z-ordered Parquet / BigLake Iceberg.',
      },
      {
        step: 'Place GCS bucket co-located with Dataflow / Vertex AI',
        detail: 'Keep single-region or dual-region alignment so HTTP Range reads stay inside free/fast internal backbone.',
      },
    ],
    clarifyingQuestions: [
      'Are consumers reading zoomed-out mosaics (requiring overview pyramids) or full-resolution ML patches?',
      'What compression (DEFLATE, ZSTD, LERC, JPEG-YCbCr) fits the spectral bands without breaking lossless analytical accuracy?',
      'How many concurrent HTTP Range requests per second will hit the GCS prefix?',
    ],
    solvingStrategy: {
      baseline: 'Store raw strip GeoTIFFs in GCS and download whole scenes onto Dataflow local SSD before cropping.',
      optimal: 'Convert to COG at ingestion, catalog bounding boxes in Z-ordered BigLake/Parquet + BigQuery GIS, and stream sub-tile byte ranges.',
      tradeOffs: 'COG creation adds ~15–20% one-time ingestion CPU and ~15% storage for overviews, but slashes downstream ML/UI egress & read latency by 100x+.',
    },
    commonTraps: [
      'Forgetting internal tiling or putting IFD headers at the END of the TIFF (breaks single-trip range reads).',
      'Using sequential tile IDs in GCS object names that trigger prefix hotspots under 10k+ QPS.',
      'Reprojecting pixels repeatedly on read instead of standardizing CRS (e.g., EPSG:4326 or UTM zones) during silver curation.',
    ],
  },

  'q1-l5': {
    levelId: 'q1-l5',
    coreMentalModel:
      'Polygons cannot be equality-joined directly with hash tables. S2 (hierarchical spherical Hilbert quadtree) and H3 (hexagonal grid) tessellate curved polygons into integer cell IDs at fixed resolutions—turning an O(N * M) geometric point-in-polygon check into a blazing-fast O(N) hash equijoin.',
    whyGoogleCloudReliesOnIt:
      'Google’s S2 geometry library underpins BigQuery GIS, Google Maps, and satellite tile indexing. Covering irregular AOIs with compact S2 cell ranges (Level 10–15) lets distributed SQL/Beam jobs join billions of pings without cross-join memory explosions.',
    exampleTitle: 'S2 Cell Covering Turning Polygon Join into Equijoin',
    exampleInput: `AOI Polygon: Koramangala Flood Zone (irregular 12-vertex shape)
Ping Table: 500M GPS/tile centroids (lat, lon)`,
    exampleLogic:
      '1) Index every ping once: s2_cell_14 = S2_CELLIDFROMPOINT(ST_GEOGPOINT(lon, lat), 14).\n2) Cover AOI polygon with compact S2 cells (parents at levels 11–14) & explode.\n3) Equijoin on exact S2 cell prefix, THEN run ST_CONTAINS only on boundary cells (not interior cells!).',
    exampleOutput: `Naive ST_CONTAINS cross-check: 500M polygon checks -> 42 mins
S2 Covering + Interior Flag:
  - Interior S2 cells -> instant accept (0 geometry math)
  - Boundary S2 cells -> exact ST_CONTAINS on 1.8% rows -> 19 seconds`,
    implementationSteps: [
      {
        step: 'Separate interior vs boundary covering cells',
        detail: 'Tag S2 cells fully inside the polygon as is_interior = TRUE so downstream joins skip expensive vertex checks entirely.',
      },
      {
        step: 'Match S2 granularity to typical AOI size',
        detail: 'Level 13 (~1.2 km²) or 14 (~0.3 km²) prevents massive cell explosion for huge regions while keeping boundary false positives tiny.',
      },
      {
        step: 'Combine with R-Tree for variable local bounding boxes',
        detail: 'Inside Python/Dataflow workers, bulk-load STRtree (R-Tree) over tile bounding boxes before testing shapely polygon containment.',
      },
    ],
    clarifyingQuestions: [
      'Are polygons mostly tiny (building footprints) or continental (country borders), or mixed scales?',
      'Is approximate cell containment acceptable for dashboards, or is exact polygon boundary accuracy mandatory?',
      'Do polygons overlap heavily (requiring multi-match fan-out) or partition cleanly?',
    ],
    solvingStrategy: {
      baseline: 'Loop or cross-join points against polygons calling ST_CONTAINS on every pair—O(P * G * V) and fails at scale.',
      optimal: 'Hierarchical S2/H3 cell covering with parent-prefix equijoin + interior-cell short-circuit + exact ST_CONTAINS only on edge cells.',
      tradeOffs: 'Finer S2 levels reduce false-positive boundary checks but inflate the exploded covering table size; multi-resolution coverings balance both.',
    },
    commonTraps: [
      'Exploding a continental polygon at S2 Level 18 (produces tens of millions of cells and OOMs the join).',
      'Ignoring antimeridian (+/-180 deg) wrap-around when storing naive lat/lon bounding boxes instead of spherical S2 cells.',
      'Not deduplicating pings if a hierarchical parent+child covering is stored carelessly.',
    ],
  },

  'q1-l6': {
    levelId: 'q1-l6',
    coreMentalModel:
      'BigQuery internally indexes `GEOGRAPHY` columns with S2 cell coverings when clustered (`CLUSTER BY geog_col`). Grouping co-located geometries into the same Capacitor storage blocks lets BigQuery’s spatial join planner prune 95%+ of blocks before evaluating `ST_INTERSECTS` or `ST_DWITHIN`.',
    whyGoogleCloudReliesOnIt:
      'Consultants frequently rescue BigQuery GIS queries scanning tens of terabytes and burning thousands of slots. Simply clustering on the GEOGRAPHY column (or S2 prefix + GEOGRAPHY) and removing UDFs/non-sargable wrappers collapses slot time by 10–50x.',
    exampleTitle: 'Clustering + Bounding Pre-Filter in BigQuery GIS',
    exampleInput: `CREATE TABLE geo.imagery_tiles (
  tile_id STRING, capture_date DATE, footprint GEOGRAPHY
) PARTITION BY capture_date CLUSTER BY footprint;`,
    exampleLogic:
      'Bad: JOIN on ST_DISTANCE(a.pt, b.pt) < 500 (forces nested broadcast/cross-join).\nGood: JOIN on ST_DWITHIN(a.pt, b.pt, 500) + cluster both tables on GEOGRAPHY + filter partition date first.',
    exampleOutput: `Unclustered ST_DISTANCE < 500: 14.2 TB shuffled, 18m 40s (Slot Exhaustion)
Clustered ST_DWITHIN + Partition Filter: 48 GB scanned, 11s`,
    implementationSteps: [
      {
        step: 'Partition by event/capture date, cluster by GEOGRAPHY',
        detail: 'Always place temporal partition pruning first, then CLUSTER BY footprint/point so Capacitor sorts blocks along the S2 Hilbert curve.',
        codeSnippet: 'PARTITION BY DATE(capture_ts)\nCLUSTER BY tile_geog',
      },
      {
        step: 'Replace ST_DISTANCE < X with ST_DWITHIN',
        detail: 'BigQuery’s spatial join optimizer ONLY triggers S2 index acceleration for ST_INTERSECTS, ST_CONTAINS, ST_WITHIN, and ST_DWITHIN.',
      },
      {
        step: 'Avoid wrapping GEOGRAPHY in ST_ASTEXT or custom JS UDFs inside ON',
        detail: 'Any transformation in the JOIN predicate blinds the query planner and forces a full cross-join.',
      },
    ],
    clarifyingQuestions: [
      'Are geometries points, small polygons (parcels/tiles), or massive multi-polygons (oceans/states)?',
      'What is the temporal window of typical joins (last 24h vs full multi-year history)?',
      'Are queries running on On-Demand ($/TB scanned) or Editions slot autoscaling?',
    ],
    solvingStrategy: {
      baseline: 'Unclustered table with `ST_DISTANCE(a.geog, b.geog) <= R`—triggers O(N*M) nested-loop evaluation.',
      optimal: 'Partition by date + `CLUSTER BY geog` + sargable `ST_DWITHIN`/`ST_INTERSECTS` + `ST_SIMPLIFY` for overly dense vertices on oversized polygons.',
      tradeOffs: 'Clustering adds zero query cost and minimal background re-clustering, whereas storing pre-exploded S2 integer columns trades ~15% storage for multi-engine compatibility (Spark + BigQuery).',
    },
    commonTraps: [
      'Writing `WHERE ST_DISTANCE(a, b) < 1000` instead of `ST_DWITHIN(a, b, 1000)`—the #1 BigQuery GIS optimizer killer.',
      'Leaving massive 500k-vertex coastlines unsimplified during joins (kills CPU per candidate pair).',
      'Mixing planar EPSG:3857 assumptions with geodesic WGS84 GEOGRAPHY types.',
    ],
  },

  'q1-l7': {
    levelId: 'q1-l7',
    coreMentalModel:
      'In Apache Beam / Cloud Dataflow, serialization between workers (shuffle/DoFn boundaries) dominates CPU when passing bloated text formats like GeoJSON strings or Python dicts. Binary formats (WKB, Protobuf, Apache Arrow) paired with `setup()`-cached reprojection transformers cut worker CPU and shuffle bytes by 5–10x.',
    whyGoogleCloudReliesOnIt:
      'At petabyte imagery scale, reconstructing `pyproj.Transformer` per element or serializing GeoJSON across Dataflow stages silently burns 70% of Compute Engine vCPU spend. Consulting engineers tune coders, DoFn lifecycle hooks, and fusion barriers.',
    exampleTitle: 'GeoJSON Pickle vs WKB + DoFn setup() Caching',
    exampleInput: `Stream: 2M satellite tile metadata + polygon elements/min in Dataflow Python`,
    exampleLogic:
      'Slow: Re-create CRS transformer inside `process(element)` and emit GeoJSON strings.\nFast: Initialize `pyproj.Transformer` once in `DoFn.setup()`, pass compact WKB bytes via a typed Beam Coder, and batch-write Parquet/Arrow row groups.',
    exampleOutput: `Per-element Transformer + GeoJSON: 120 n1-standard-8 workers, 68% CPU in pickle/JSON
Cached setup() + WKB Coder + Arrow batch: 22 workers (-81% Dataflow cost)`,
    implementationSteps: [
      {
        step: 'Cache heavy native/C++ objects in DoFn.setup()',
        detail: 'Instantiate CRS reprojectors, GDAL pools, and ML session clients once per worker process inside setup() or start_bundle().',
      },
      {
        step: 'Use compact binary coders (WKB / Protobuf / Row)',
        detail: 'Never shuffle verbose GeoJSON text across GroupByKey boundaries; serialize geometries as WKB bytes.',
      },
      {
        step: 'Break harmful step fusion when fan-out explodes',
        detail: 'Insert `Reshuffle()` after tiling 1 giant satellite scene into 4,096 sub-chips so downstream processing spreads across all workers.',
      },
    ],
    clarifyingQuestions: [
      'Are Dataflow workers running Python SDK (GIL/pickle bound) or Java/Beam SQL with custom transforms?',
      'Is the pipeline bottlenecked on GCS network read, CRS math CPU, or shuffle serialization?',
      'Do individual scenes fan out into thousands of chips (risking straggler fusion)?',
    ],
    solvingStrategy: {
      baseline: 'Single `ParDo` reading whole scenes, parsing GeoJSON with Python dicts, and writing individual small PNG/TIFF objects.',
      optimal: 'DoFn `setup()` resource reuse + WKB/Arrow binary serialization + explicit `Reshuffle` after 1->N tile splitting + Runner v2 + Dataflow Prime.',
      tradeOffs: 'Adding a `Reshuffle` introduces one lightweight shuffle hop, which is overwhelmingly worthwhile when 1 scene fans out into >500 tiles.',
    },
    commonTraps: [
      'Creating `pyproj.Transformer.from_crs(...)` inside `DoFn.process()`—runs tens of millions of redundant C-library initializations.',
      'Not closing GDAL/rasterio dataset handles on exceptions (leaks worker RAM until OOM kill).',
      'Forgetting `--experiments=use_runner_v2` / Python custom container dependencies for GDAL.',
    ],
  },

  'q1-l8': {
    levelId: 'q1-l8',
    coreMentalModel:
      'A petabyte-scale (5 PB/month) overhead imagery platform decouples heavy binary raster pixels (stored as COGs in GCS) from lightweight spatiotemporal metadata (stored in BigLake/BigQuery GIS). Event-driven ingestion triggers idempotent quality gates, S2 indexing, and automated reprocessing queues.',
    whyGoogleCloudReliesOnIt:
      'This is the flagship Google Cloud Consulting Data Engineer scenario: tying GCS Object Notifications, Pub/Sub, Cloud Dataflow, BigQuery GIS, Vertex AI cloud-masking, and Looker SLA dashboards into one resilient, cost-bounded architecture.',
    exampleTitle: '5 PB/Month Satellite Ingestion Pipeline Blueprint',
    exampleInput: `Daily arrival: ~170 TB/day raw Level-1B strips across 12 ground stations
SLOs: <15 min catalog availability, <5% cloud-occluded false positives`,
    exampleLogic:
      'Ground Station -> GCS Landing -> Eventarc/Pub/Sub -> Dataflow (COG conversion + cloud-cover QC + S2/BBox extraction) -> Binary COGs to GCS Curated + Metadata to BigQuery Storage Write API (partitioned by date, clustered by S2/GEOGRAPHY).',
    exampleOutput: `Zero pixel bytes ever touch BigQuery!
Catalog queries scan MBs instead of PBs, while Vertex AI & Earth Engine range-read COGs directly from GCS.`,
    implementationSteps: [
      {
        step: 'Separate Binary Plane (GCS COGs) from Metadata Plane (BigQuery)',
        detail: 'Never store raw multi-band imagery blobs in BigQuery; store gs:// URIs, S2 cell coverings, CRS, and band stats.',
      },
      {
        step: 'Ingest via Eventarc -> Pub/Sub -> Dataflow',
        detail: 'Use dead-letter topics for corrupt headers/bad CRS and deterministic file-hash idempotency keys.',
      },
      {
        step: 'Automate Lifecycle Tiering & FinOps',
        detail: 'Move raw L1B strips to Archive after 30 days once COG Silver passes QC checksums.',
      },
    ],
    clarifyingQuestions: [
      'What are the latency SLOs from ground-station landing to catalog discoverability and ML inference readiness?',
      'Do consumers need multi-region active serving, or can compute stay co-located in one primary GCS region?',
      'Must raw Level-1B strips be retained forever for regulatory re-calibration, or purged after COG promotion?',
    ],
    solvingStrategy: {
      baseline: 'Cron-triggered batch Spark jobs listing landing buckets every 6 hours and copying raw TIFFs.',
      optimal: 'Event-driven GCS -> Pub/Sub -> Dataflow Prime (COG + QC + S2 index) -> GCS Curated + BigQuery GIS Storage Write API + DLQ + GCS Autoclass.',
      tradeOffs: 'Streaming ingestion meets <15 min SLA, while bundling small telemetry shards and GCS Autoclass keeps monthly TCO predictable at 5 PB/month.',
    },
    commonTraps: [
      'Listing massive GCS buckets (`gsutil ls` / glob) on a cron schedule—O(N) API cost and minutes of lag.',
      'Storing imagery pixels inside BigQuery or relational DBs.',
      'Missing automated cloud-cover / Null Island `(0,0)` / invalid polygon topology quarantine checks.',
    ],
  },

  'q2-l1': {
    levelId: 'q2-l1',
    coreMentalModel:
      'A sliding window rate limiter bounds burst traffic per tenant/API key by keeping a monotonic timestamp deque (or token bucket) per key and evicting entries older than `now - window_size` before evaluating capacity.',
    whyGoogleCloudReliesOnIt:
      'Ingestion gateways sitting in front of Pub/Sub, Cloud Run, or legacy Flume collectors must throttle noisy clients before downstream Dataflow workers saturate and trigger cascading backpressure.',
    exampleTitle: 'Sliding Window Limiter (Max 3 Requests / 10 Seconds)',
    exampleInput: `window = 10s, limit = 3
Events for key='sensor-42': t=1, t=4, t=7, t=9, t=12`,
    exampleLogic:
      'At t=9: active deque=[1, 4, 7] (len 3 == limit) -> REJECT.\nAt t=12: evict timestamps <= 12-10=2 (drops 1), deque=[4, 7] (len 2 < 3) -> ALLOW & append 12.',
    exampleOutput: `[True, True, True, False, True]`,
    implementationSteps: [
      {
        step: 'Store per-key monotonic timestamps in collections.deque',
        detail: 'Appending right and popping expired timestamps left runs in amortized O(1) per request.',
        codeSnippet: 'while q and q[0] <= now - window:\n    q.popleft()',
      },
      {
        step: 'Guard thread-safety & stale-key memory leaks',
        detail: 'In multi-threaded Python services, protect per-key buckets with locks and periodically prune idle empty keys.',
      },
      {
        step: 'Compare Sliding Window Log vs Token Bucket',
        detail: 'Sliding Log is exact at high memory O(limit * keys); Token Bucket / Sliding Window Counter is O(1) memory per key.',
      },
    ],
    clarifyingQuestions: [
      'Is strict exact sliding window required, or is a fixed/approximate counter (Token Bucket) acceptable for O(1) memory?',
      'Are requests guaranteed monotonically ordered by timestamp, or can out-of-order timestamps arrive?',
      'Is this single-process thread-safe or distributed across Cloud Run instances (requiring Redis/Memorystore Lua)?',
    ],
    solvingStrategy: {
      baseline: 'Fixed time-bucket counter (`int(ts // window)`)—O(1) space, but allows 2x burst right across bucket boundaries.',
      optimal: 'Per-key `deque` evicting expired timestamps in amortized O(1) time (or Redis ZSET / Sliding Counter in distributed fleets).',
      tradeOffs: 'Deque uses O(limit) memory per active key; for millions of high-limit keys, weighted two-bucket Sliding Counter cuts memory to O(1).',
    },
    commonTraps: [
      'Boundary confusion: `<= now - window` vs `< now - window` (check inclusive vs exclusive window semantics!).',
      'Counting rejected requests inside the deque (only accepted requests should consume quota).',
      'Unbounded dictionary growth from one-off client IDs never evicted.',
    ],
  },

  'q2-l2': {
    levelId: 'q2-l2',
    coreMentalModel:
      'I/O-bound ingestion (fetching thousands of GCS manifests, HTTP tile headers, or REST APIs) wastes 95% of wall-clock time waiting on sockets when run sequentially. Python `asyncio` paired with an `asyncio.Semaphore(max_concurrency)` overlaps network waits on a single event loop while capping open sockets and worker RAM.',
    whyGoogleCloudReliesOnIt:
      'Consulting ingestion bridges pulling telemetry from external SaaS APIs or validating thousands of cloud storage manifests in Cloud Run / Dataflow must saturate network throughput without triggering HTTP 429 rate limits or OOM crashes.',
    exampleTitle: 'Bounded Asyncio Batch Fetcher with Semaphore',
    exampleInput: `urls = 500 tile metadata endpoints (avg 120ms latency each)
max_concurrent = 25`,
    exampleLogic:
      'Sequential: 500 * 0.12s = 60.0s.\nUnbounded gather(): opens 500 sockets simultaneously -> socket exhaustion / 429s.\nBounded Semaphore(25) + exponential backoff: 20 waves * 0.12s = ~2.4s safely.',
    exampleOutput: `25x speedup with capped memory & zero FD exhaustion`,
    implementationSteps: [
      {
        step: 'Wrap coroutines with asyncio.Semaphore',
        detail: 'Acquire the semaphore right around the network I/O call—not around post-processing—so slots free immediately.',
        codeSnippet: 'async with sem:\n    return await fetch_with_retry(session, item)',
      },
      {
        step: 'Never call blocking time.sleep() or requests.get() inside async def',
        detail: 'Blocking calls freeze the entire event loop; use `await asyncio.sleep()` and async clients (aiohttp/httpx) or `asyncio.to_thread()`.',
      },
      {
        step: 'Handle per-task failures with return_exceptions=True or TaskGroup',
        detail: 'Route transient errors to bounded retries with jitter and failed items to a structured error list / DLQ.',
      },
    ],
    clarifyingQuestions: [
      'Are tasks purely I/O-bound (HTTP/GCS) or CPU-heavy (decompressing rasters, needing ProcessPoolExecutor)?',
      'Must output order match input order (`asyncio.gather`) or stream fastest-first (`asyncio.as_completed`)?',
      'What retry budget and rate-limit cap does the upstream endpoint enforce?',
    ],
    solvingStrategy: {
      baseline: 'Sequential `for` loop—simple and safe, but O(N * latency) wall time.',
      optimal: '`asyncio.Semaphore(M)` + `asyncio.gather` (or bounded worker queue pulling from `asyncio.Queue` when N > 100k tasks to avoid allocating 100k coroutine objects upfront).',
      tradeOffs: '`gather` over 1M items allocates 1M tasks in RAM; a fixed pool of M worker coroutines reading an `asyncio.Queue` keeps memory O(M).',
    },
    commonTraps: [
      'Calling blocking `time.sleep()` inside an `async` function.',
      'Launching unbounded `asyncio.gather(*[fetch(x) for x in 100_000_items])` and crashing with `Too many open files`.',
      'Swallowing exceptions silently instead of propagating or dead-lettering them.',
    ],
  },

  'q2-l3': {
    levelId: 'q2-l3',
    coreMentalModel:
      'At-least-once streaming buses (Pub/Sub, Kafka) deliver duplicate events on network retries. True idempotent deduplication tracks `seen_ids` alongside `event_ts` inside a bounded watermark window `(watermark - allowed_lateness)` and evicts expired keys via a min-heap/ordered dict so memory stays O(active_window).',
    whyGoogleCloudReliesOnIt:
      'Dataflow streaming pipelines and custom Python microservices handling 10M+ events/day must avoid both double-counting revenue/impressions AND unbounded state maps that crash workers after 48 hours.',
    exampleTitle: 'Bounded Watermark Deduplicator',
    exampleInput: `allowed_lateness = 5s
Stream: (id="e1", ts=10), (id="e2", ts=12), (id="e1", ts=13), (id="e3", ts=20), (id="e1", ts=21)`,
    exampleLogic:
      'Maintain watermark = max_seen_ts - allowed_lateness.\n- At ts=13: e1 still in active dict -> DROP duplicate.\n- At ts=20: watermark advances to 15 -> evict (e1@10, e2@12) from heap & dict!',
    exampleOutput: `Accepted: [e1@10, e2@12, e3@20, e1@21] (note: e1@21 outside window or treated as expired key)`,
    implementationSteps: [
      {
        step: 'Track max event-time seen to advance watermark monotonically',
        detail: 'Never let the watermark move backward when an older late event arrives.',
        codeSnippet: 'max_ts = max(max_ts, ts)\nwatermark = max_ts - allowed_lateness',
      },
      {
        step: 'Pair a HashSet/Dict for O(1) lookup with a Min-Heap for O(log N) expiry',
        detail: 'Pop expired `(expire_ts, event_id)` entries from the heap while `heap[0][0] < watermark` and delete from dict.',
      },
      {
        step: 'Handle late events past the watermark explicitly',
        detail: 'Drop or route events with `ts < watermark` to a late-data side output / DLQ rather than silently polluting current state.',
      },
    ],
    clarifyingQuestions: [
      'Are we deduplicating by `event_id` globally forever or within a sliding `allowed_lateness` window?',
      'When a message arrives older than the watermark, should it be dropped or routed to a late-event side output?',
      'If two duplicates have different payloads, do we keep first-seen or latest `ingestion_ts`?',
    ],
    solvingStrategy: {
      baseline: 'Unbounded `seen = set()`—O(1) lookup, but leaks RAM until OOM in long-running streaming jobs.',
      optimal: 'Dict `{event_id: ts}` + Min-Heap `(ts, event_id)` (or OrderedDict if timestamps are monotonic) evicting keys below `max_ts - lateness`.',
      tradeOffs: 'Exact in-memory set gives 0% false positives within window; at multi-billion key scale, combine Bloom/Roaring filters or Bigtable/Dataflow ValueState with TTL.',
    },
    commonTraps: [
      'Deleting an ID prematurely when a newer duplicate updated its timestamp in the dict but an older entry remained in the heap.',
      'Advancing watermark using wall-clock processing time instead of event time (breaks backfill replays!).',
      'Letting watermark regress when an out-of-order event arrives.',
    ],
  },

  'q2-l4': {
    levelId: 'q2-l4',
    coreMentalModel:
      'Schema drift (renamed fields, missing required keys, type coercion errors) will poison an entire streaming pipeline if one bad message crashes the worker and triggers infinite Pub/Sub redelivery loops. Bind a Schema Registry at ingestion and route failed validations immediately to a Dead-Letter Queue (DLQ) with error context.',
    whyGoogleCloudReliesOnIt:
      'Enterprise clients onboard dozens of upstream apps into Pub/Sub -> Dataflow. One unguarded `JSONDecodeError` or missing column without a DLQ causes 100% consumer lag across healthy events.',
    exampleTitle: 'Try/Except Tuple-Tag DLQ Pattern in Pub/Sub + Dataflow',
    exampleInput: `Msg 1: {"order_id": "A1", "amount": 42.50}  (valid)
Msg 2: {"order_id": "A2", "amount": "FREE"} (type mismatch)`,
    exampleLogic:
      'Wrap parser in Dataflow `DoFn` using `pvalue.TaggedOutput("dlq", {payload, error_msg, topic, ingest_ts})`.\n- Main output -> BigQuery Storage Write API (exactly-once)\n- DLQ output -> GCS Parquet + Pub/Sub alert topic',
    exampleOutput: `Valid stream stays green (<2s latency); Msg 2 quarantined cleanly with stacktrace for replay.`,
    implementationSteps: [
      {
        step: 'Attach Pub/Sub Schema Registry (Avro / Protobuf)',
        detail: 'Reject breaking changes at publish time when possible, and enforce backward-compatible additive nullable fields.',
      },
      {
        step: 'Implement Dataflow TaggedOutput DLQ for soft parsing errors',
        detail: 'Never drop exceptions silently or let unhandled exceptions crash the bundle; emit structured error metadata.',
      },
      {
        step: 'Enable Pub/Sub Dead-Letter Topic + Max Delivery Attempts',
        detail: 'Set `max_delivery_attempts = 5` at the subscription layer as a secondary safety net against worker OOM poison pills.',
      },
    ],
    clarifyingQuestions: [
      'Are upstream producers able to enforce Avro/Protobuf schemas at publish time, or are payloads raw JSON?',
      'Does a schema change (e.g., adding a new column) need automatic BigQuery schema evolution or strict quarantine?',
      'Do dead-lettered messages need an automated replay workflow back into the main pipeline once fixed?',
    ],
    solvingStrategy: {
      baseline: 'Log failed messages to Cloud Logging and skip—loses payload data and makes replay impossible.',
      optimal: 'Pub/Sub Schema Registry + Dataflow `TaggedOutput` DLQ to GCS/BigQuery `quarantine_dlq` + subscription `dead-letter-topic` fallback + replay DAG.',
      tradeOffs: 'Strict publish-time rejection protects downstream stability immediately, whereas accept-all + Dataflow DLQ avoids dropping revenue events from buggy client SDKs.',
    },
    commonTraps: [
      'Infinite retry loops on poison-pill messages causing slot/worker billing spikes.',
      'Writing DLQ records without original raw bytes, partition key, or failure reason (un-replayable!).',
      'Missing Pub/Sub `exactly-once` or Storage Write API deterministic `insertId` when replaying DLQ batches.',
    ],
  },

  'q2-l5': {
    levelId: 'q2-l5',
    coreMentalModel:
      'In Spark Structured Streaming and Apache Beam, event-time watermarks (`withWatermark("event_ts", "10 minutes")`) tell the engine when a window’s state can be safely finalized and garbage-collected from RocksDB/JVM memory.',
    whyGoogleCloudReliesOnIt:
      'Consulting teams migrate legacy batch jobs into stateful streaming pipelines (Dataproc PySpark / Dataflow). Misconfigured watermarks either drop valid delayed mobile events OR keep state forever until executors crash.',
    exampleTitle: 'PySpark Watermark + dropDuplicates State Bounding',
    exampleInput: `withWatermark("event_ts", "15 minutes")
Events: (id=1, 10:00), (id=2, 10:18), (id=1, 10:01) [late 17m!]`,
    exampleLogic:
      'At 10:18, Watermark = 10:18 - 15m = 10:03.\n1) State for id=1 (10:00 < 10:03) is eligible for eviction.\n2) Incoming (id=1, 10:01) is older than 10:03 watermark -> safely ignored/dropped without inflating state.',
    exampleOutput: `State store holds ONLY the trailing 15 minutes of keys; memory stays flat 24/7.`,
    implementationSteps: [
      {
        step: 'Call withWatermark() BEFORE dropDuplicates() or groupBy()',
        detail: 'Spark only binds watermark eviction to stateful operators when `withWatermark` precedes the stateful call AND `event_ts` is included in `dropDuplicates(["event_id", "event_ts"])` or window.',
        codeSnippet: 'df.withWatermark("event_ts", "15 minutes")\n  .dropDuplicates(["event_id", "event_ts"])',
      },
      {
        step: 'Enable RocksDB state store for multi-million key state',
        detail: 'Set `spark.sql.streaming.stateStore.providerClass` to RocksDBStateStore so state spills cleanly out of JVM heap.',
      },
      {
        step: 'Audit outputMode (Append vs Update vs Complete)',
        detail: 'Watermarks only finalize and purge windowed aggregations properly in Append or Update mode—Complete retains all keys forever.',
      },
    ],
    clarifyingQuestions: [
      'What is the p99 arrival delay of mobile/IoT events (dictates watermark threshold)?',
      'What happens to late events arriving after the watermark (silent drop vs DLQ audit table)?',
      'How many distinct keys live inside one watermark window (JVM heap vs RocksDB)?',
    ],
    solvingStrategy: {
      baseline: '`dropDuplicates(["event_id"])` without watermark—works in batch, OOMs in streaming because Spark must remember every ID ever seen.',
      optimal: '`withWatermark("event_ts", delay).dropDuplicates(["event_id", "event_ts"])` (or `mapGroupsWithState` with timeout + RocksDB) + late-event side channel if auditability is required.',
      tradeOffs: 'Wider watermarks capture more late data at the cost of larger state size and delayed final Append emissions.',
    },
    commonTraps: [
      'Calling `dropDuplicates(["event_id"])` without `"event_ts"` in the dedup columns—Spark cannot evict state without the watermark column!',
      'Using `OutputMode("complete")` with stateful streaming and wondering why state grows unboundedly.',
      'Choosing `processingTime` instead of `eventTime` during backfills.',
    ],
  },

  'q2-l6': {
    levelId: 'q2-l6',
    coreMentalModel:
      'Distributed shuffles hash-partition rows by join/group key. When 1 hot key (e.g., `merchant_id = NULL` or a top retailer) holds 40% of rows, 199 executors finish in 10 seconds while 1 executor stalls for hours and OOMs. Fix it by broadcasting small tables (`F.broadcast`) or salting hot keys across K random buckets.',
    whyGoogleCloudReliesOnIt:
      'In both PySpark (Dataproc) and BigQuery, partition skew is the #1 root cause of missed batch SLAs. Two-stage salted aggregation and skewed-join salting rescue 10+ TB retail and telemetry pipelines.',
    exampleTitle: '2-Stage Salted GroupBy vs Skewed Single Shuffle',
    exampleInput: `transactions: 500M rows, 45% have merchant_id = 'MEGA_STORE'
Single groupBy("merchant_id").sum("amt") -> 1 task processes 225M rows -> OOM`,
    exampleLogic:
      'Stage 1: Add `salt = floor(rand() * 16)` -> groupBy(merchant_id, salt) -> 16 tasks each handle ~14M rows.\nStage 2: Strip salt -> groupBy(merchant_id).sum(partial_sum) -> instant tiny final reduce!',
    exampleOutput: `Runtime drops from 58 min (OOM retries) to 1m 40s with uniform task histograms.`,
    implementationSteps: [
      {
        step: 'Diagnose skew via Spark UI Stage Summary (Max vs Median task duration/bytes)',
        detail: 'If Max task time >> 10x Median task time, you have data skew—never blindly add more executors.',
      },
      {
        step: 'Broadcast small dimensions first (<100MB)',
        detail: 'Eliminate shuffle completely on star-schema dimension joins using `F.broadcast(dim_df)`.',
        codeSnippet: 'fact.join(F.broadcast(dim), "merchant_id")',
      },
      {
        step: 'Salt only skewed keys (or enable AQE skewJoin)',
        detail: 'For large-to-large joins, explode the smaller side K times `(0..K-1)` and append random salt `(0..K-1)` on the large side, isolating NULLs first.',
      },
    ],
    clarifyingQuestions: [
      'Is this a join (large-small vs large-large) or a high-cardinality aggregation?',
      'Are hot keys known ahead of time (e.g., NULLs or top 5 merchants) or dynamic per run?',
      'Are we running Spark 3+ with Adaptive Query Execution (`spark.sql.adaptive.skewJoin.enabled`)?',
    ],
    solvingStrategy: {
      baseline: 'Increase `spark.sql.shuffle.partitions` and executor memory—does NOT fix single-key skew because all rows for one key still land in one partition.',
      optimal: 'Filter/handle NULLs separately, use `F.broadcast()` for small tables, and apply 2-stage salting (aggregations) or salted explode + AQE skewJoin (large joins).',
      tradeOffs: 'Full-table salting explodes the right-hand side K times; selective salting (salting only top-N hot keys) avoids multiplying non-skewed keys.',
    },
    commonTraps: [
      'Thinking increasing `repartition(2000)` fixes a single hot key—hash(hot_key) % 2000 still hits 1 partition!',
      'Not filtering `NULL` join keys before an inner/left join (all NULLs concentrate on one task).',
      'Exploding a 50GB right-hand table by salt=20 without checking memory/network cost.',
    ],
  },

  'q2-l7': {
    levelId: 'q2-l7',
    coreMentalModel:
      'Legacy Apache Flume agent topologies suffer from fragile JVM disk channels, single-host bottlenecks, and brittle HDFS small-file sinks. Modernizing to Cloud Pub/Sub -> Cloud Dataflow -> BigQuery Storage Write API replaces pull/file-channel coupling with elastic autoscaling, schema contracts, and exactly-once streaming writes.',
    whyGoogleCloudReliesOnIt:
      'Migrating on-prem Hadoop/Flume (10+ TB/day) estates to GCP without dropping regulatory events is one of the highest-frequency Google Cloud Consulting engagement patterns.',
    exampleTitle: 'Zero-Loss Flume Dual-Write Migration Pattern',
    exampleInput: `Legacy: App Logs -> Flume Tier-1 -> Flume Collector -> HDFS Parquet (10 TB/day)
Requirement: Zero-downtime cutover to BigQuery`,
    exampleLogic:
      'Phase 1: Enable dual-sink on Flume (HDFS + Cloud Pub/Sub connector) OR mirror edge producers to Pub/Sub.\nPhase 2: Run Dataflow Streaming (schema validation + DLQ + Storage Write API) into BigQuery shadow tables.\nPhase 3: Run daily row-count & hash reconciliation parity checks for 14 days, then flip BI views and retire Flume.',
    exampleOutput: `End-to-end ingestion lag drops from 45m HDFS batch to <5s BigQuery availability with 100% parity proof.`,
    implementationSteps: [
      {
        step: 'Decouple edge producers via Pub/Sub (avoid big-bang cutover)',
        detail: 'Introduce Pub/Sub retention (7 days) so Dataflow restarts or schema fixes replay cleanly without losing edge events.',
      },
      {
        step: 'Use BigQuery Storage Write API in Committed/Pending stream mode',
        detail: 'Achieve exactly-once semantics and ~10x lower cost than legacy `tabledata.insertAll` streaming inserts.',
      },
      {
        step: 'Build automated dual-run reconciliation before decommissioning Flume',
        detail: 'Compare hourly record counts, null rates, and numeric checksums between HDFS Hive and BigQuery.',
      },
    ],
    clarifyingQuestions: [
      'Can upstream log producers switch to Pub/Sub SDK/Fluent Bit directly, or must Flume act as a temporary bridge?',
      'What are the network constraints (Cloud Interconnect / VPN bandwidth, VPC-SC, regional residency)?',
      'How strict is duplicate tolerance (exactly-once Storage Write API vs at-least-once + downstream MERGE)?',
    ],
    solvingStrategy: {
      baseline: 'DistCp raw HDFS files to GCS every hour and load via `bq load`—keeps Flume bottlenecks alive and fails real-time SLAs.',
      optimal: 'Dual-write to Pub/Sub -> Dataflow Prime (schema validation, dedup, DLQ) -> BigQuery Storage Write API + GCS Cold Parquet archive + automated shadow-run reconciliation.',
      tradeOffs: 'Dual-writing temporarily doubles ingress compute/egress during the 2-week validation window, which is tiny compared to the risk of an unverified big-bang cutover.',
    },
    commonTraps: [
      'Recommending legacy `insertAll` streaming API instead of BigQuery Storage Write API.',
      'Forgetting on-prem-to-GCP Interconnect bandwidth caps during historical HDFS backfill + live peak.',
      'Decommissioning Flume without a 7-day instant rollback switch and reconciliation proof.',
    ],
  },

  'q3-l1': {
    levelId: 'q3-l1',
    coreMentalModel:
      'Hash-based key probing maps natural business keys to surrogate keys or hash buckets in O(1) expected time. Under the hood, hash joins build an in-memory hash table on the smaller build side and probe row-by-row from the large stream side—understanding collision/bucket mechanics reveals why key cardinality and skew dictate join speed.',
    whyGoogleCloudReliesOnIt:
      'Dimensional star-schema ETL resolves millions of natural keys (`customer_uuid`) against surrogate keys (`customer_sk`) every batch run. Clean hash-map probing avoids O(N * M) nested scans.',
    exampleTitle: 'O(1) Surrogate Key Lookup & Bucket Probing',
    exampleInput: `dim_lookup = {"CUST-101": 5001, "CUST-204": 5002}
fact_stream = [("ORD-1", "CUST-101"), ("ORD-2", "CUST-999")]`,
    exampleLogic:
      'Build hash index over dimension NK -> SK in O(D). Probe each fact row in O(1); route unmatched NKs ("CUST-999") to late-arriving unknown SK (-1) rather than dropping revenue facts!',
    exampleOutput: `[("ORD-1", 5001), ("ORD-2", -1)]  # Zero dropped facts`,
    implementationSteps: [
      {
        step: 'Handle hash collisions and key normalization deterministically',
        detail: 'Strip/normalize case or composite keys consistently before hashing so build and probe keys match.',
      },
      {
        step: 'Assign an explicit Unknown/Inferred SK (-1) for missing keys',
        detail: 'In Kimball warehouses, never let an inner join drop a valid financial transaction because the dimension arrived late.',
      },
      {
        step: 'Verify build-side memory footprint fits comfortably',
        detail: 'Always build the hash table on the SMALLER dataset (dimension), probing from the LARGE dataset (fact).',
      },
    ],
    clarifyingQuestions: [
      'Can duplicate keys exist in the lookup table, or is the mapping strictly 1:1?',
      'How should missing/unmatched keys be handled (return None/-1 vs raise error)?',
      'What is the expected key count (single-node dict vs distributed partitioned hash join)?',
    ],
    solvingStrategy: {
      baseline: 'Linear scan or nested loop for every lookup—O(N * M) time.',
      optimal: 'Hash table / open-addressing or chaining index built once in O(M), queried in O(1) average time per probe.',
      tradeOffs: 'Hash joins dominate equijoins (`=`) in O(N + M), whereas Sort-Merge or Range joins are required for inequality predicates (`BETWEEN`, `<`, `>`).',
    },
    commonTraps: [
      'Building the hash map on the 100M-row fact side instead of the 1M-row dimension side.',
      'Dropping fact rows via INNER JOIN instead of LEFT JOIN + Unknown SK (`-1`).',
      'Ignoring hash bucket resize load factor (~0.7) when implementing custom hash maps.',
    ],
  },

  'q3-l2': {
    levelId: 'q3-l2',
    coreMentalModel:
      'Kimball SCD Type 2 preserves every historical change to a dimension row using a unique Surrogate Key (`customer_sk`) plus `[effective_from, effective_to)` validity bounds. When a dimension has 50M users and high-churn attributes (like `last_login_ts` or `session_count`), split volatile columns into a Type 4 mini-dimension to stop SCD2 row explosion.',
    whyGoogleCloudReliesOnIt:
      'Financial, telco, and retail BigQuery clients need accurate point-in-time attribution ("What was the user’s loyalty tier when they placed Order #882?") without duplicating 50M rows daily.',
    exampleTitle: 'SCD Type 2 + Type 4 Mini-Dimension Split',
    exampleInput: `Customer 101:
- Slow attributes (tier, home_city): changes 2x/year -> dim_customer_scd2
- Fast attributes (loyalty_points_band, active_flag): changes daily -> dim_customer_profile_t4`,
    exampleLogic:
      'Fact table stores BOTH `customer_sk` (SCD2) and `profile_sk` (Type 4). Hash-diff (`SHA256`) only tracked SCD2 columns so daily point updates never mint unnecessary SCD2 versions.',
    exampleOutput: `dim_customer_scd2 grows by 2x/year instead of 365x/year while keeping 100% point-in-time accuracy.`,
    implementationSteps: [
      {
        step: 'Define explicit Fact Grain FIRST',
        detail: 'State the exact meaning of one fact row (e.g., "one order line item") before drawing any dimension table.',
      },
      {
        step: 'Use half-open `[effective_from, effective_to)` with `9999-12-31` sentinel',
        detail: 'Half-open intervals (`>= from AND < to`) guarantee zero double-matches at exact boundary timestamps.',
      },
      {
        step: 'Compute `row_hash` over tracked SCD2 columns',
        detail: 'Compare `source.row_hash != target.row_hash` during MERGE so no-op updates are skipped.',
      },
    ],
    clarifyingQuestions: [
      'Which attributes truly require historical point-in-time tracking (Type 2) vs overwrite-in-place (Type 1)?',
      'Can late-arriving facts arrive weeks after a dimension change, requiring retroactive SK backfill?',
      'Are there multi-valued dimensions (e.g., multiple tags per order) needing a bridge table?',
    ],
    solvingStrategy: {
      baseline: 'Store Type 1 current-state dimensions everywhere—simple joins, but silently rewrites history whenever a customer changes tier or region.',
      optimal: 'Conformed Star Schema with explicit grain, SCD Type 2 (`effective_from`/`effective_to`/`is_current`) for slow attributes, and Type 4 mini-dimensions for fast-changing attributes.',
      tradeOffs: 'Storing `customer_sk` directly on the fact row at ETL time makes BI queries fast (equijoin), whereas late-arriving dimensions require either range joins or an inferred SK + backfill pass.',
    },
    commonTraps: [
      'Using inclusive `BETWEEN effective_from AND effective_to` on continuous timestamps -> matches TWO versions if `v1.to == v2.from` (fan-out bug!).',
      'Leaving `effective_to` as `NULL` instead of `9999-12-31`, forcing messy `COALESCE` in every BI query.',
      'Putting high-velocity metrics (`last_seen_at`) inside an SCD Type 2 table.',
    ],
  },

  'q3-l3': {
    levelId: 'q3-l3',
    coreMentalModel:
      'Querying SCD Type 2 dimensions deterministically requires joining fact timestamps inside non-overlapping validity intervals (`order_ts >= valid_from AND order_ts < COALESCE(valid_to, "9999-12-31")`) and using `QUALIFY ROW_NUMBER() OVER (...) = 1` or window functions when resolving ties/latest states without collapsing granularity.',
    whyGoogleCloudReliesOnIt:
      'Linked BigQuery SQL rounds test whether you actually remember NULL bounds, left-join preservation of unmatched facts, and deterministic window tie-breakers under Google Doc coding conditions.',
    exampleTitle: 'Point-in-Time SCD2 Join with Open-Ended NULL Bound',
    exampleInput: `orders: (o1, c1, 2026-03-10, 100), (o2, c1, 2026-04-01, 200)
dim_cust: (sk1, c1, Gold, 2026-01-01, 2026-03-15), (sk2, c1, Plat, 2026-03-15, NULL)`,
    exampleLogic:
      'LEFT JOIN orders o TO dim_cust c ON o.cid = c.cid AND o.ts >= c.eff_from AND o.ts < COALESCE(c.eff_to, "9999-12-31")',
    exampleOutput: `o1 -> Gold ($100)
o2 -> Plat ($200)  # Open-ended NULL bound matched cleanly without COALESCE drop!`,
    implementationSteps: [
      {
        step: 'Always handle NULL in `effective_to` via COALESCE',
        detail: 'Comparing `ts < NULL` evaluates to UNKNOWN (false), silently dropping every current-version match!',
        codeSnippet: "AND o.order_ts < COALESCE(c.effective_to, TIMESTAMP '9999-12-31')",
      },
      {
        step: 'Use `QUALIFY` for clean top-1-per-group tie breaking',
        detail: 'Order by `effective_from DESC, surrogate_key DESC` inside `ROW_NUMBER()` if dirty source overlaps exist.',
      },
      {
        step: 'Preserve revenue facts with LEFT JOIN',
        detail: 'Wrap unmatched dimension attributes with `COALESCE(c.tier, "Unknown")` so aggregations never lose fact totals.',
      },
    ],
    clarifyingQuestions: [
      'Are `effective_to` values exclusive (`<`) or inclusive (`<=`) in the source dimension table?',
      'Can open-ended current rows store `NULL` for `effective_to`, or is `9999-12-31` guaranteed?',
      'Could dirty upstream data produce overlapping intervals for the same natural key?',
    ],
    solvingStrategy: {
      baseline: 'Join only on `customer_id AND is_current = TRUE`—fast, but completely wrong for historical orders.',
      optimal: 'LEFT JOIN on `customer_id` + `ts >= effective_from AND ts < COALESCE(effective_to, MAX_TS)` + `QUALIFY ROW_NUMBER() = 1` safeguard if source intervals can overlap.',
      tradeOffs: 'Inequality range joins cost more slots than SK equijoins; pre-clustering both tables by `customer_id` keeps BigQuery slot cost minimal.',
    },
    commonTraps: [
      'Writing `o.order_ts BETWEEN c.effective_from AND c.effective_to` when `effective_to` is NULL -> loses 100% of active rows!',
      'Using `INNER JOIN` and accidentally filtering out orders whose dimension arrived late.',
      'Forgetting deterministic tie-breakers inside `ROW_NUMBER()`.',
    ],
  },

  'q3-l4': {
    levelId: 'q3-l4',
    coreMentalModel:
      'BigQuery stores nested repeated records (`ARRAY<STRUCT<...>>`) natively inside columnar Capacitor stripes without duplicating parent attributes. Normalizing or querying them requires careful `UNNEST` / flattening without accidentally dropping parent rows that have empty arrays (`LEFT JOIN UNNEST` vs `CROSS JOIN UNNEST`).',
    whyGoogleCloudReliesOnIt:
      'GA4 event exports, Pub/Sub JSON payloads, and satellite tile band arrays arrive as deeply nested repeated structs. Extracting clean relational rows—and knowing when to KEEP nested structs—is core BigQuery modeling.',
    exampleTitle: 'Preserving Empty Arrays During REPEATED RECORD Unnesting',
    exampleInput: `event = {"event_id": "E1", "items": [{"sku": "A", "qty": 2}]}
event_empty = {"event_id": "E2", "items": []}`,
    exampleLogic:
      'CROSS JOIN UNNEST(items) drops E2 completely! Use `LEFT JOIN UNNEST(items)` (or Python defensive `payload.get("items") or [None]`) so parent event E2 survives with NULL item fields.',
    exampleOutput: `[(E1, "A", 2), (E2, None, None)]`,
    implementationSteps: [
      {
        step: 'Guard missing, None, or empty nested lists defensively',
        detail: 'In Python normalization, treat `record.get("items") or []` carefully: emit one parent-only row if empty when parent preservation is required.',
      },
      {
        step: 'Prefer scalar subqueries `SELECT ... (SELECT SUM(qty) FROM UNNEST(items))` inside BigQuery',
        detail: 'Correlated UNNEST subqueries compute per-row array metrics WITHOUT exploding and re-grouping the entire parent table!',
        codeSnippet: 'SELECT event_id,\n  (SELECT SUM(qty) FROM UNNEST(items)) AS total_qty\nFROM events;',
      },
      {
        step: 'Check types inside nested structs before flattening',
        detail: 'Coerce missing keys with `.get()` defaults so schema drift in one nested object never crashes the batch.',
      },
    ],
    clarifyingQuestions: [
      'Should parent records with an empty (`[]`) or `NULL` repeated array be preserved in the output or omitted?',
      'How many nesting levels deep can structs go, and should nested column names be prefixed (e.g., `item_sku`)?',
      'Is this flattening for an external BI tool (Tableau/PowerBI) or staying inside BigQuery/Looker where keeping `ARRAY<STRUCT>` saves storage?',
    ],
    solvingStrategy: {
      baseline: 'Naive `CROSS JOIN UNNEST` or nested `for item in row["items"]:` loop—drops parent events with zero items.',
      optimal: 'BigQuery: correlated scalar `UNNEST` subqueries (zero fan-out!) or `LEFT JOIN UNNEST` when row-level expansion is needed. Python: recursive/iterative flattener handling `None`/`[]` gracefully.',
      tradeOffs: 'Flattening nested arrays into wide SQL tables multiplies parent row storage N-fold; keep `ARRAY<STRUCT>` in Silver/Gold BigQuery tables and unnest only in views or Looker.',
    },
    commonTraps: [
      '`FROM tbl, UNNEST(arr)` is an implicit `CROSS JOIN` that silently drops rows where `arr` is empty or NULL!',
      'Double-counting parent `order_total` after unnesting `items` (classic fan-out bug).',
      'Mutating nested dicts in-place while iterating over Python payloads.',
    ],
  },

  'q3-l5': {
    levelId: 'q3-l5',
    coreMentalModel:
      'Columnar warehouses (BigQuery, Snowflake, Parquet) prune entire partitions and micro-partitions at query planning time ONLY when predicates are **sargable**—meaning the partition/cluster column stands bare on one side of the comparison (`event_ts >= "2026-03-01"`), never wrapped in functions like `DATE(event_ts) = ...` or `EXTRACT(YEAR FROM event_ts) = 2026`.',
    whyGoogleCloudReliesOnIt:
      'Wrapping partition columns in functions (`WHERE DATE(ts) = ...`) is the single most expensive BigQuery anti-pattern in client engagements—turning a 2GB scan into a 20TB full-table scan.',
    exampleTitle: 'Rewriting Non-Sargable BigQuery Partition Filters',
    exampleInput: `Table partitioned by DAY(event_ts) (12 TB total)
Slow: WHERE FORMAT_DATE('%Y-%m', event_ts) = '2026-03'  --> Scans 12.0 TB!`,
    exampleLogic:
      'Rewrite into closed-open range boundaries on the raw partition column:\n`WHERE event_ts >= TIMESTAMP("2026-03-01") AND event_ts < TIMESTAMP("2026-04-01")`',
    exampleOutput: `Bytes scanned drops from 12.0 TB ($75/query) -> 380 GB ($2.30/query) — 96.8% reduction!`,
    implementationSteps: [
      {
        step: 'Never apply functions, casts, or arithmetic to the partition/cluster column',
        detail: 'Push all date math onto the literal parameter side (`TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)`).',
      },
      {
        step: 'Order CLUSTER BY columns from lowest cardinality / most filtered to highest',
        detail: 'Use up to 4 clustering columns (e.g. `CLUSTER BY tenant_id, region, event_type`) matching frequent `WHERE` and `JOIN` filters.',
      },
      {
        step: 'Enable `require_partition_filter = TRUE` on large fact tables',
        detail: 'Block accidental full-table ad-hoc queries at compile time before they burn slot budgets.',
      },
    ],
    clarifyingQuestions: [
      'Is the table partitioned by `TIMESTAMP`/`DATE` column or `_PARTITIONTIME` ingestion pseudo-column?',
      'Which 2–4 columns appear most often in equality/IN/range filters (candidate `CLUSTER BY` keys)?',
      'Is `SELECT *` being used on wide 200-column tables instead of projecting needed columns?',
    ],
    solvingStrategy: {
      baseline: 'Add `WHERE DATE(ts) = ...` and rely on caching—misses partition pruning on every cold query.',
      optimal: 'Sargable half-open timestamp ranges + `CLUSTER BY` (up to 4 filter/join keys) + column pruning + `require_partition_filter = TRUE`.',
      tradeOffs: 'Over-granular hourly partitioning on small tables creates excessive partition metadata; daily partitioning + clustering handles 95% of multi-TB tables cleanly.',
    },
    commonTraps: [
      'Using `OR` across two different columns (`WHERE date_col = ... OR status = "ERR"`)—defeats partition pruning!',
      'Joining on a derived partition expression without also filtering the base table.',
      'Running `SELECT *` in BigQuery, which charges for every unused wide string/JSON column.',
    ],
  },

  'q3-l6': {
    levelId: 'q3-l6',
    coreMentalModel:
      'Open Lakehouse formats (Apache Iceberg / BigLake, Delta Lake) layer ACID snapshot isolation onto immutable GCS Parquet files via metadata manifests/logs. Updates use either **Copy-on-Write (CoW)**—rewriting whole affected Parquet files for fast reads—or **Merge-on-Read (MoR)**—writing lightweight delete/delta files for fast writes and compacting asynchronously.',
    whyGoogleCloudReliesOnIt:
      'Google BigLake Managed Tables (Apache Iceberg on GCS) unify BigQuery SQL and Dataproc Spark over one open copy of data—eliminating lock-in while supporting GDPR deletes and concurrent streaming MERGE.',
    exampleTitle: 'Copy-on-Write vs Merge-on-Read on 1% Row Updates',
    exampleInput: `Table: 100 Parquet files (1 GB each). Streaming CDC updates 1 row per file (100 rows total).`,
    exampleLogic:
      'CoW: Rewrites all 100 x 1GB Parquet files = 100 GB write amplification!\nMoR (Deletion Vectors / Position Deletes): Writes 100 tiny KB delete markers; readers merge markers on read; async compaction merges hourly.',
    exampleOutput: `Write amplification drops 1000x under MoR while snapshot readers still see zero dirty partial commits.`,
    implementationSteps: [
      {
        step: 'Match CoW vs MoR to read/write workload ratio',
        detail: 'Pick CoW for append-heavy batch tables read by thousands of BI queries; pick MoR for frequent 5-minute CDC MERGEs and GDPR deletes.',
      },
      {
        step: 'Automate async compaction (`OPTIMIZE` / Iceberg `rewrite_data_files`)',
        detail: 'Schedule background compaction before accumulated delete files degrade read latency.',
      },
      {
        step: 'Respect snapshot retention (`VACUUM` / `expire_snapshots`) windows',
        detail: 'Keep >=7 days of snapshots for time travel and active long-running reader isolation.',
      },
    ],
    clarifyingQuestions: [
      'How frequently do `MERGE`/`UPDATE`/`DELETE` mutations arrive (every 5 min CDC vs daily nightly overwrite)?',
      'Will multiple engines (BigQuery + Dataproc Spark + Flink) write concurrently to the same table?',
      'What time-travel / rollback retention window do compliance teams mandate?',
    ],
    solvingStrategy: {
      baseline: 'Hive-style directory overwrite (`INSERT OVERWRITE`)—no cross-partition atomicity, breaks concurrent readers.',
      optimal: 'BigLake Apache Iceberg (or Delta) with optimistic concurrency control, MoR position deletes for streaming CDC + scheduled async compaction + Z-Order/Liquid clustering.',
      tradeOffs: 'MoR slashes write latency and compute during streaming CDC, but requires background compaction compute so read scans stay fast.',
    },
    commonTraps: [
      'Expiring snapshots / running `VACUUM RETAIN 0 HOURS` while streaming readers are mid-query -> `FileNotFoundException`.',
      'Skipping async compaction on MoR tables until readers choke on thousands of tiny delete files.',
      'Assuming Parquet alone provides ACID multi-file transactions without a metadata catalog/log.',
    ],
  },

  'q3-l7': {
    levelId: 'q3-l7',
    coreMentalModel:
      'Migrating an enterprise Teradata/Oracle EDW to BigQuery cannot happen as a weekend big-bang flip. Success hinges on a 4-phase cutover: (1) Automated SQL Translation & Schema Mapping (`bq-migration-toolkit`), (2) Historical Bulk Offload + CDC Delta Sync, (3) Dual-Run Shadow Parity Validation, and (4) Traffic Cutover with Instant Rollback.',
    whyGoogleCloudReliesOnIt:
      'Modernizing legacy on-prem warehouses (Teradata, Netezza, Oracle Exadata) to BigQuery is Google Cloud Consulting’s bread-and-butter multi-million-dollar engagement.',
    exampleTitle: 'Shadow-Run Parity Gate Before BI Cutover',
    exampleInput: `Legacy: 2,500 Teradata BTEQ/SQL scripts + 400 TB tables + Looker/Tableau dashboards`,
    exampleLogic:
      '1) Batch SQL Translator converts Teradata `QUALIFY` / `VOLATILE TABLE` / `DATE` dialects -> BigQuery SQL.\n2) Dual-run pipelines for 14 days.\n3) Google Data Validation Tool (DVT) checks row counts, aggregates, and row-hashes.',
    exampleOutput: `DVT signs off 100.00% metric parity across 400 TB -> DNS/View pointer flips to BigQuery with zero BI downtime.`,
    implementationSteps: [
      {
        step: 'Inventory workload dependencies & prioritize high-cost/unused tables first',
        detail: 'Often 30–40% of legacy EDW tables are dead; archive them to GCS cold storage instead of migrating dead technical debt.',
      },
      {
        step: 'Automate dialect translation + fix Teradata/Oracle semantic subtleties',
        detail: 'Watch out for Teradata case-insensitive string comparisons vs BigQuery case-sensitive defaults, and banker’s rounding vs half-up.',
      },
      {
        step: 'Enforce automated DVT parity sign-off before flipping BI consumers',
        detail: 'Never eyeball parity—run automated column-sum, distinct-count, and row-hash checks on every critical mart.',
      },
    ],
    clarifyingQuestions: [
      'Are upstream pipelines tightly coupled to stored procedures / BTEQ scripts that must be refactored into Dataform/dbt?',
      'What is the acceptable cutover freeze window (zero downtime vs 2-hour Sunday window)?',
      'Which downstream BI reports or regulatory filings are non-negotiable Day-1 parity gates?',
    ],
    solvingStrategy: {
      baseline: 'Manually rewrite SQL scripts one by one and cut over per department without automated validation—slow and error-prone.',
      optimal: 'BigQuery Migration Assessment + Batch SQL Translator -> GCS bulk offload + Datastream/CDC sync -> Dataform/dbt DAGs -> automated DVT shadow parity -> phased BI pointer flip.',
      tradeOffs: 'Running Teradata and BigQuery in parallel during the shadow period adds temporary dual-run cost, but eliminates multi-day P1 financial reporting outages.',
    },
    commonTraps: [
      'Ignoring collation differences (Teradata default case-insensitive `=` vs BigQuery case-sensitive `=`).',
      'Translating procedural row-by-row cursor loops 1:1 into BigQuery scripts instead of refactoring into set-based SQL.',
      'Forgetting downstream BI extracts, service account IAM, and row-level security policies until cutover night.',
    ],
  },
};
