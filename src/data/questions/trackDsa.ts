import { DsaPattern, Question } from '../../types/platform';
import { buildTrackQuestions, QuestionSeed } from './factory';

// Track 4: Data Structures & Algorithms (100 Authentic Tier-1 NeetCode-Pattern Questions)
const DSA_SEEDS: QuestionSeed[] = [
  {
    title: 'Thread-Safe Sliding Window Rate Limiter for Ingestion Gateway',
    company: 'Google',
    difficulty: 'Medium',
    concept: 'Kafka Exactly-Once & Watermarking',
    dsaPattern: 'Sliding Window',
    tags: ['Sliding Window', 'Deque', 'Rate Limiting'],
    solutionCode: `from collections import deque\ndef solve(requests, window_sec=10, limit=3):\n    q = deque()\n    res = []\n    for ts in requests:\n        while q and q[0] <= ts - window_sec:\n            q.popleft()\n        if len(q) < limit:\n            q.append(ts)\n            res.append(True)\n        else:\n            res.append(False)\n    return res`,
    testCases: [
      { name: 'Case 1: Burst throttling', description: 'Allows first 3 within 10s window, rejects 4th, allows after expiry', inputExpr: `[1, 2, 3, 5, 11]`, expectedJson: `[true,true,true,false,true]` },
      { name: 'Case 2: Rapid burst rejection', description: 'Rejects consecutive burst exceeding limit', inputExpr: `[10, 10, 10, 10]`, expectedJson: `[true,true,true,false]` },
      { name: 'Edge Case: Empty stream', description: 'Returns empty list on no requests', inputExpr: `[]`, expectedJson: `[]` },
    ],
  },
  {
    title: 'Merge K Sorted Streaming Partition Files Into Monotonic Event Log',
    company: 'Amazon',
    difficulty: 'Hard',
    concept: 'Shuffle & Skew Mitigation',
    dsaPattern: 'Heap / Priority Queue',
    tags: ['Heap / Priority Queue', 'External Sort', 'Streaming'],
    solutionCode: `import heapq\ndef solve(streams):\n    heap = []\n    for i, s in enumerate(streams):\n        if s:\n            heapq.heappush(heap, (s[0], i, 0))\n    out = []\n    while heap:\n        val, si, idx = heapq.heappop(heap)\n        out.append(val)\n        if idx + 1 < len(streams[si]):\n            heapq.heappush(heap, (streams[si][idx + 1], si, idx + 1))\n    return out`,
    testCases: [
      { name: 'Case 1: 3 sorted partitions', description: 'Merges sorted partitions preserving order', inputExpr: `[[1,4,7],[2,5],[3,6,8]]`, expectedJson: `[1,2,3,4,5,6,7,8]` },
      { name: 'Edge Case: Empty sub-streams', description: 'Skips empty streams safely', inputExpr: `[[],[1,2],[]]`, expectedJson: `[1,2]` },
    ],
  },
  {
    title: 'Merge Overlapping Maintenance & Partition Validity Intervals',
    company: 'Google',
    difficulty: 'Medium',
    concept: 'SCD Type 2 & Bi-Temporal Modeling',
    dsaPattern: 'Intervals',
    tags: ['Intervals', 'Sorting', 'Two Pointers'],
    solutionCode: `def solve(intervals):\n    if not intervals: return []\n    intervals = sorted(intervals, key=lambda x: x[0])\n    merged = [intervals[0][:]]\n    for s, e in intervals[1:]:\n        if s <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], e)\n        else: merged.append([s, e])\n    return merged`,
    testCases: [
      { name: 'Case 1: Overlapping ranges', description: 'Coalesces adjacent and overlapping intervals', inputExpr: `[[1,3],[2,6],[8,10],[15,18]]`, expectedJson: `[[1,6],[8,10],[15,18]]` },
      { name: 'Edge Case: Single interval', description: 'Handles single element cleanly', inputExpr: `[[5,9]]`, expectedJson: `[[5,9]]` },
    ],
  },
];

const DSA_TOPICS: Array<[string, string, 'Easy' | 'Medium' | 'Hard', DsaPattern]> = [
  // Arrays & Hashing (7)
  ['Two Sum With Partition Bucket Hash Map Lookup', 'Google', 'Easy', 'Arrays & Hashing'],
  ['Group Sharded Telemetry Keys by Normalized Signature', 'Meta', 'Medium', 'Arrays & Hashing'],
  ['Product of Array Except Self for Prefix-Suffix Weighting', 'Amazon', 'Medium', 'Arrays & Hashing'],
  ['Longest Consecutive Sequence of Partition IDs in O(N)', 'Google', 'Medium', 'Arrays & Hashing'],
  ['Subarray Sum Equals Target Cloud Slot Budget', 'Meta', 'Medium', 'Arrays & Hashing'],
  ['First Missing Positive Shard ID in Compacted Index', 'Stripe', 'Hard', 'Arrays & Hashing'],
  ['Valid Anagram Check Across Normalized Column Aliases', 'Airbnb', 'Easy', 'Arrays & Hashing'],

  // Two Pointers (6)
  ['Container With Most Capacity Across Latency Checkpoints', 'Google', 'Medium', 'Two Pointers'],
  ['3Sum Partition Weight Balancing Without Duplicates', 'Meta', 'Medium', 'Two Pointers'],
  ['Trapping Rainwater Buffer Backpressure Capacity Calculation', 'Amazon', 'Hard', 'Two Pointers'],
  ['Merge Two Sorted SCD2 Timeline Arrays In-Place', 'Stripe', 'Easy', 'Two Pointers'],
  ['Find Duplicate Number in Read-Only Partition Array (O(1) Space)', 'Meta', 'Medium', 'Two Pointers'],
  ['Sort Colors: 3-Way Dutch National Flag Partitioning (Low/Med/High)', 'Snowflake', 'Medium', 'Two Pointers'],

  // Sliding Window (7)
  ['Contains Duplicate Within Sliding Batch Window K', 'Amazon', 'Easy', 'Sliding Window'],
  ['Longest Substring Without Repeating Event Codes', 'Google', 'Medium', 'Sliding Window'],
  ['Minimum Window Substring Covering Required Schema Tags', 'Uber', 'Hard', 'Sliding Window'],
  ['Sliding Window Maximum Over Streaming CPU Telemetry', 'Uber', 'Hard', 'Sliding Window'],
  ['Max Consecutive Healthy Heartbeats With K Fault Tolerances', 'Netflix', 'Medium', 'Sliding Window'],
  ['Longest Repeating Character Replacement in Noisy Sensor Stream', 'Apple', 'Medium', 'Sliding Window'],
  ['Permutation in String: Detect Shuffled Micro-Batch Header Match', 'Google', 'Medium', 'Sliding Window'],

  // Stack & Monotonic Stack (6)
  ['Daily Temperatures: Next Warmer Latency Spike Monotonic Stack', 'Meta', 'Medium', 'Stack & Monotonic Stack'],
  ['Valid Parentheses & Nested SQL Subquery Delimiter Check', 'Snowflake', 'Easy', 'Stack & Monotonic Stack'],
  ['Evaluate Reverse Polish Notation Query Filter AST', 'Databricks', 'Medium', 'Stack & Monotonic Stack'],
  ['Min Stack Supporting O(1) Minimum Watermark Query', 'Uber', 'Medium', 'Stack & Monotonic Stack'],
  ['Car Fleet: Count Converging Packet Batches Reaching Sink Together', 'Google', 'Medium', 'Stack & Monotonic Stack'],
  ['Largest Rectangle in Histogram for Slot Utilization Window', 'Amazon', 'Hard', 'Stack & Monotonic Stack'],

  // Binary Search (7)
  ['Binary Search Nearest Prior FX Timestamp in Sorted Rates', 'Stripe', 'Medium', 'Binary Search'],
  ['Search in Rotated Sorted Circular Buffer of Log Offsets', 'Uber', 'Medium', 'Binary Search'],
  ['Koko Eating Bananas: Minimum Throughput Rate to Meet Batch SLA', 'Google', 'Medium', 'Binary Search'],
  ['Capacity to Ship Data Shards Within D Sync Windows', 'Amazon', 'Medium', 'Binary Search'],
  ['Median of Two Sorted Partition Latency Arrays in O(log(min(M,N)))', 'Google', 'Hard', 'Binary Search'],
  ['Time-Based Key-Value Store (Snapshotting With Binary Search)', 'Databricks', 'Medium', 'Binary Search'],
  ['Split Array Largest Sum Across M Spark Executors', 'Databricks', 'Hard', 'Binary Search'],

  // Linked List (6)
  ['LRU Cache With O(1) Get/Put for Feature Store Serving', 'Uber', 'Medium', 'Linked List'],
  ['LFU Cache for Hot Parquet Footer Metadata Blocks', 'Snowflake', 'Hard', 'Linked List'],
  ['Reverse Linked List of Immutable Commit Logs', 'Databricks', 'Easy', 'Linked List'],
  ['Detect Cycle in Redirection / Retry Chain (Floyd Tortoise & Hare)', 'Stripe', 'Easy', 'Linked List'],
  ['Merge Two Sorted WAL Segment Linked Lists', 'Amazon', 'Easy', 'Linked List'],
  ['Copy List With Random Lineage Pointers', 'Google', 'Medium', 'Linked List'],

  // Trees & BST (7)
  ['Serialize and Deserialize Binary Execution Plan AST', 'Databricks', 'Hard', 'Trees & BST'],
  ['Lowest Common Ancestor in Dataset Lineage Hierarchy', 'Airbnb', 'Medium', 'Trees & BST'],
  ['Validate Binary Search Tree Partition Key Boundaries', 'Snowflake', 'Medium', 'Trees & BST'],
  ['Level Order Traversal of Multi-Tier Aggregation Tree', 'Amazon', 'Medium', 'Trees & BST'],
  ['Binary Tree Right Side View for Latest Layer Snapshot', 'Meta', 'Medium', 'Trees & BST'],
  ['Kth Smallest Element in Sorted Partition BST', 'Snowflake', 'Medium', 'Trees & BST'],
  ['Construct Binary Tree From Preorder and Inorder AST Traversals', 'Databricks', 'Medium', 'Trees & BST'],

  // Tries (3)
  ['Implement Trie (Prefix Tree) for Data Catalog Autocomplete', 'Google', 'Medium', 'Tries'],
  ['Design Add and Search Words Data Structure With Wildcards', 'Meta', 'Medium', 'Tries'],
  ['Word Search II: Multi-Pattern Log Signature Prefix Matcher', 'Amazon', 'Hard', 'Tries'],

  // Heap / Priority Queue (5)
  ['Top-K Frequent Heavy Hitters in Clickstream Events', 'Meta', 'Medium', 'Heap / Priority Queue'],
  ['Kth Largest Latency Spike in Unsorted Telemetry Stream', 'Databricks', 'Medium', 'Heap / Priority Queue'],
  ['Find Median From Continuous Data Stream via Dual Heaps', 'Netflix', 'Hard', 'Heap / Priority Queue'],
  ['K Closest Geospatial Coordinates Using Max-Heap Pruning', 'Uber', 'Medium', 'Heap / Priority Queue'],
  ['Task Scheduler Cooldown Interval Optimization for Airflow Workers', 'Airbnb', 'Medium', 'Heap / Priority Queue'],

  // Backtracking (4)
  ['Subsets & Partition Combinations for Feature Group Selection', 'Meta', 'Medium', 'Backtracking'],
  ['Combination Sum of Micro-Batch Payloads Matching Target Size', 'Stripe', 'Medium', 'Backtracking'],
  ['Word Search in 2D Partition Schema Grid', 'Google', 'Medium', 'Backtracking'],
  ['N-Queens: Non-Conflicting Shard Placement Across Rack Topology', 'Databricks', 'Hard', 'Backtracking'],

  // Graphs & BFS/DFS (8)
  ['Detect Cycle in Directed Pipeline Dependency Graph', 'Databricks', 'Medium', 'Graphs & BFS/DFS'],
  ['Number of Connected Islands in Geo-Grid Partition Matrix', 'Uber', 'Medium', 'Graphs & BFS/DFS'],
  ['Clone Weighted Data Lineage Directed Acyclic Graph', 'Google', 'Medium', 'Graphs & BFS/DFS'],
  ['Redundant Edge Detection in Distributed Mesh via Union-Find', 'Netflix', 'Medium', 'Graphs & BFS/DFS'],
  ['Word Ladder: Shortest Schema Migration Path Between Versions', 'Airbnb', 'Hard', 'Graphs & BFS/DFS'],
  ['Number of Connected Microservice Failure Clusters (Disjoint Set)', 'Meta', 'Medium', 'Graphs & BFS/DFS'],
  ['Pacific Atlantic Water Flow: Multi-Region Replication Reachability', 'Google', 'Medium', 'Graphs & BFS/DFS'],
  ['Rotting Oranges: BFS Propagation Time Across Cluster Nodes', 'Amazon', 'Medium', 'Graphs & BFS/DFS'],

  // Topological Sort (DAG) (3)
  ['Course Schedule II: DAG Topological Sort for dbt Models', 'Airbnb', 'Medium', 'Topological Sort (DAG)'],
  ['Alien Dictionary: Reconstruct Sort Order From Sorted Log Keys', 'Google', 'Hard', 'Topological Sort (DAG)'],
  ['Parallel Build Schedule & Critical Path in DAG Tasks', 'Databricks', 'Medium', 'Topological Sort (DAG)'],

  // Shortest Path (Dijkstra / Bellman-Ford) (4)
  ['Shortest Path in Weighted Cloud Region Network (Dijkstra)', 'Google', 'Medium', 'Shortest Path (Dijkstra / Bellman-Ford)'],
  ['Cheapest Replication Route With At Most K Cross-Region Hops', 'Amazon', 'Medium', 'Shortest Path (Dijkstra / Bellman-Ford)'],
  ['Network Delay Time Across Cloud Availability Zones', 'Google', 'Medium', 'Shortest Path (Dijkstra / Bellman-Ford)'],
  ['Path With Minimum Effort Across Multi-Region Replication Grid (Dijkstra)', 'Uber', 'Medium', 'Shortest Path (Dijkstra / Bellman-Ford)'],

  // Intervals (5)
  ['Minimum Meeting Rooms / Executor Slots for Overlapping Jobs', 'Google', 'Medium', 'Intervals'],
  ['Insert New Partition Window Into Disjoint Sorted Intervals', 'Stripe', 'Medium', 'Intervals'],
  ['Non-Overlapping Intervals Minimum Job Evictions', 'Amazon', 'Medium', 'Intervals'],
  ['Minimum Interval to Include Each Timestamp Query', 'Stripe', 'Hard', 'Intervals'],
  ['Count Connected Intervals Using Sweep-Line Delta Map', 'Uber', 'Medium', 'Intervals'],

  // Greedy (4)
  ['Jump Game: Minimum Hops Across Relay Ingestion Brokers', 'Uber', 'Medium', 'Greedy'],
  ['Gas Station: Circular Replication Ring Feasibility Check', 'Google', 'Medium', 'Greedy'],
  ['Partition Labels for Independent Log Chunk Processing', 'Amazon', 'Medium', 'Greedy'],
  ['Hand of Straights: Grouping Consecutive Event Sequence Windows', 'Meta', 'Medium', 'Greedy'],

  // 1-D Dynamic Programming (7)
  ['Climbing Stairs / Dynamic Ways to Partition Batch Jobs', 'Google', 'Easy', '1-D Dynamic Programming'],
  ['Coin Change: Minimum Compute Containers to Serve Exact QPS', 'Amazon', 'Medium', '1-D Dynamic Programming'],
  ['Longest Increasing Subsequence of Watermark Timestamps', 'Uber', 'Medium', '1-D Dynamic Programming'],
  ['Word Break: Segment Concatenated Column Identifiers Using Dict', 'Airbnb', 'Medium', '1-D Dynamic Programming'],
  ['Partition Equal Subset Sum for Balanced Dual-Cluster Sharding', 'Meta', 'Medium', '1-D Dynamic Programming'],
  ['House Robber: Max Value From Non-Adjacent Maintenance Windows', 'Netflix', 'Medium', '1-D Dynamic Programming'],
  ['Maximum Subarray (Kadane) Peak Net Traffic Surge Window', 'Amazon', 'Medium', '1-D Dynamic Programming'],

  // 2-D Dynamic Programming (5)
  ['Edit Distance (Levenshtein) for Fuzzy Entity Record Matching', 'Stripe', 'Medium', '2-D Dynamic Programming'],
  ['Unique Paths Through Partitioned Grid Avoiding Corrupted Cells', 'Google', 'Medium', '2-D Dynamic Programming'],
  ['Longest Common Subsequence Across Two Schema Diffs', 'Databricks', 'Medium', '2-D Dynamic Programming'],
  ['0/1 Knapsack: Maximize Query Cache Hit Value Within RAM Cap', 'Snowflake', 'Medium', '2-D Dynamic Programming'],
  ['Target Sum Ways to Balance Positive/Negative Ledger Adjustments', 'Stripe', 'Medium', '2-D Dynamic Programming'],

  // Bit Manipulation & Math (3)
  ['Single Number XOR Parity Check for Missing Deduplicated Record', 'Google', 'Easy', 'Bit Manipulation & Math'],
  ['Counting Bits & Cardinality Masking Across Bitmap Indexes', 'Snowflake', 'Easy', 'Bit Manipulation & Math'],
  ['Missing Number in Contiguous Sequence IDs via XOR / Gauss Sum', 'Amazon', 'Easy', 'Bit Manipulation & Math'],
];

function conceptForPattern(pattern: DsaPattern): string {
  if (pattern === 'Topological Sort (DAG)' || pattern === 'Graphs & BFS/DFS' || pattern === 'Shortest Path (Dijkstra / Bellman-Ford)') {
    return 'dbt Incremental & Snapshots';
  }
  if (pattern === 'Intervals') {
    return 'SCD Type 2 & Bi-Temporal Modeling';
  }
  if (pattern === 'Sliding Window') {
    return 'Kafka Exactly-Once & Watermarking';
  }
  return 'Shuffle & Skew Mitigation';
}

for (const [title, company, difficulty, pattern] of DSA_TOPICS) {
  DSA_SEEDS.push({
    title,
    company,
    difficulty,
    dsaPattern: pattern,
    concept: conceptForPattern(pattern),
    tags: [pattern, 'Python 3', company],
  });
}

export const TRACK_DSA_QUESTIONS: Question[] = buildTrackQuestions(
  'dsa',
  'ide',
  'python',
  undefined,
  DSA_SEEDS
);
