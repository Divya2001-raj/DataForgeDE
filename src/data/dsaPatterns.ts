import { CANONICAL_DSA_PATTERNS, DsaPattern } from '../types/platform';

export interface DsaPatternGuide {
  name: DsaPattern;
  shortLabel: string;
  category: string;
  recognitionSignals: string[];
  mentalModel: string;
  complexityTemplate: {
    time: string;
    space: string;
    note: string;
  };
  codeTemplate: string;
  pitfalls: string[];
  dataEngTieIn: string;
}

export { CANONICAL_DSA_PATTERNS };

export const DSA_PATTERN_GUIDES: Record<DsaPattern, DsaPatternGuide> = {
  'Arrays & Hashing': {
    name: 'Arrays & Hashing',
    shortLabel: 'Arrays & Hashing',
    category: 'Linear & Hashing',
    recognitionSignals: [
      'Need O(1) membership, frequency counts, complement lookup (target - x), or grouping by canonical key',
      'Order-preserving deduplication, prefix sums / subarray sum equals K, or index-as-hash (1..N missing positive)',
    ],
    mentalModel:
      'Trade O(N) auxiliary memory for O(1) hash lookups so nested O(N^2) comparisons collapse into a single linear pass.',
    complexityTemplate: {
      time: 'O(N)',
      space: 'O(N)',
      note: 'Hash map/set lookup is O(1) amortized; prefix-product/cyclic-sort variants can reach O(1) extra space.',
    },
    codeTemplate: `def solve_prefix_hash(nums: list[int], target: int) -> int:
    seen = {0: 1}  # prefix_sum -> count
    curr = ans = 0
    for x in nums:
        curr += x
        ans += seen.get(curr - target, 0)
        seen[curr] = seen.get(curr, 0) + 1
    return ans`,
    pitfalls: [
      'Mutating a dict/set while iterating over it.',
      'Forgetting empty-input or duplicate-key edge cases (e.g. seeding {0: 1} before loop for prefix sums).',
    ],
    dataEngTieIn:
      'Used in hash-partitioned aggregations, in-memory deduplication sets, and Bloom-filter/hash-join build phases.',
  },
  'Two Pointers': {
    name: 'Two Pointers',
    shortLabel: 'Two Pointers',
    category: 'Linear & Hashing',
    recognitionSignals: [
      'Input is sorted (or can be sorted) and you need pairs/triplets summing to a target',
      'In-place partitioning (3-way Dutch flag), symmetric palindrome scans, or converging boundaries (container/rainwater)',
    ],
    mentalModel:
      'Maintain two monotonic indices (left/right or slow/fast) that move strictly inward or forward, eliminating redundant inner loops.',
    complexityTemplate: {
      time: 'O(N) or O(N log N) if sorting',
      space: 'O(1) extra',
      note: 'Each pointer advances at most N times total.',
    },
    codeTemplate: `def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [l, r]
        if s < target:
            l += 1
        else:
            r -= 1
    return []`,
    pitfalls: [
      'Forgetting to skip duplicate values in 3Sum / kSum after finding a match.',
      'Using <= vs < in the while condition when pointers must remain distinct.',
    ],
    dataEngTieIn:
      'Mirrors sort-merge joins across two sorted Parquet/WAL streams and timeline SCD2 interval coalescing.',
  },
  'Sliding Window': {
    name: 'Sliding Window',
    shortLabel: 'Sliding Window',
    category: 'Linear & Hashing',
    recognitionSignals: [
      'Contiguous subarray or substring optimization (longest/shortest/count) with monotonic validity condition',
      'Fixed window size K (moving average, rate limiter over W seconds, sliding max via monotonic deque)',
    ],
    mentalModel:
      'Expand the right boundary to include new state; shrink the left boundary only while the window invariant is violated.',
    complexityTemplate: {
      time: 'O(N)',
      space: 'O(K) or O(alphabet)',
      note: 'Both left and right pointers move strictly forward.',
    },
    codeTemplate: `from collections import defaultdict

def longest_at_most_k(s: str, k: int) -> int:
    freq = defaultdict(int)
    left = best = 0
    for right, ch in enumerate(s):
        freq[ch] += 1
        while len(freq) > k:
            freq[s[left]] -= 1
            if freq[s[left]] == 0:
                del freq[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best`,
    pitfalls: [
      'Using an `if` instead of a `while` when shrinking the left pointer on variable-size windows.',
      'Decrementing counts without deleting zero-count keys when checking `len(freq)`.',
    ],
    dataEngTieIn:
      'Directly powers tumbling/sliding event-time windows in Flink/Dataflow and API gateway rate limiters.',
  },
  'Stack & Monotonic Stack': {
    name: 'Stack & Monotonic Stack',
    shortLabel: 'Stacks',
    category: 'Linear & Hashing',
    recognitionSignals: [
      'Nested balanced delimiters, AST/RPN expression evaluation, or undo/Min-Stack O(1) queries',
      '"Next greater / warmer / smaller element" or largest rectangle area in a histogram',
    ],
    mentalModel:
      'Pop elements from the stack the moment an incoming value invalidates their dominance, resolving their span in O(1) amortized time.',
    complexityTemplate: {
      time: 'O(N)',
      space: 'O(N)',
      note: 'Every index is pushed once and popped at most once.',
    },
    codeTemplate: `def next_greater_wait(temps: list[int]) -> list[int]:
    ans = [0] * len(temps)
    stack = []  # stores indices in decreasing value order
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            prev = stack.pop()
            ans[prev] = i - prev
        stack.append(i)
    return ans`,
    pitfalls: [
      'Storing values instead of indices on monotonic stacks when distance/width calculation is required.',
      'Forgetting to flush remaining stack items (sentinel 0 at end) in histogram area problems.',
    ],
    dataEngTieIn:
      'Used in SQL query parser AST validation, bracket/expression linters, and burst-duration telemetry.',
  },
  'Binary Search': {
    name: 'Binary Search',
    shortLabel: 'Binary Search',
    category: 'Search & Partition',
    recognitionSignals: [
      'Sorted/rotated array lookup or "find first/last position" in O(log N)',
      '"Minimize the maximum" or "Find minimum feasible rate/capacity" over a monotonic answer space (Binary Search on Answer)',
    ],
    mentalModel:
      'Define a monotonic predicate `feasible(mid)` over [lo, hi] and halve the search space every step until converging on the exact boundary.',
    complexityTemplate: {
      time: 'O(log N) or O(N log(Range))',
      space: 'O(1)',
      note: 'Binary Search on Answer multiplies log(max-min) by O(N) feasibility check.',
    },
    codeTemplate: `def min_feasible(lo: int, hi: int, feasible) -> int:
    ans = hi
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            ans = mid
            hi = mid - 1
        else:
            lo = mid + 1
    return ans`,
    pitfalls: [
      'Infinite loop when setting `lo = mid` with floor midpoint `lo + (hi - lo) // 2`.',
      'Wrong initial `lo`/`hi` bounds (e.g. `max(weights)` vs `1` in partition capacity problems).',
    ],
    dataEngTieIn:
      'Powers ASOF timestamp lookups in sorted FX/tick tables and optimal Spark/BigQuery partition sizing.',
  },
  'Linked List': {
    name: 'Linked List',
    shortLabel: 'Linked List',
    category: 'Search & Partition',
    recognitionSignals: [
      'O(1) splice/eviction caches (LRU / LFU via HashMap + Doubly Linked List)',
      'In-place pointer reversal, fast/slow cycle detection (Floyd), or merging sorted WAL segments',
    ],
    mentalModel:
      'Use a sentinel `dummy` head node to eliminate head-null special cases, and track `prev/curr/nxt` carefully before rewiring pointers.',
    complexityTemplate: {
      time: 'O(N) traversal / O(1) cache ops',
      space: 'O(1) pointer manipulation / O(C) cache',
      note: 'Always save `nxt = curr.next` before flipping `curr.next = prev`.',
    },
    codeTemplate: `def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`,
    pitfalls: [
      'Losing reference to `curr.next` before overwriting `curr.next`.',
      'Forgetting to terminate tail pointers cleanly (creating accidental cycles in reorder/merge).',
    ],
    dataEngTieIn:
      'Core data structure behind LSM-tree write-ahead log segments, ring buffers, and O(1) feature-store LRU caches.',
  },
  'Trees & BST': {
    name: 'Trees & BST',
    shortLabel: 'Trees & BST',
    category: 'Trees & Graphs',
    recognitionSignals: [
      'Hierarchical AST / JSON / lineage traversal (DFS pre/in/post-order or BFS level-order)',
      'Subtree property aggregation, Lowest Common Ancestor, or BST sorted in-order invariant',
    ],
    mentalModel:
      'Return clean subtree summaries bottom-up (post-order) or pass valid range bounds `(low, high)` top-down (pre-order).',
    complexityTemplate: {
      time: 'O(N)',
      space: 'O(H) recursion stack (O(log N) balanced, O(N) skewed)',
      note: 'Iterative BFS uses O(W) max tree width queue space.',
    },
    codeTemplate: `def is_valid_bst(node, low=float('-inf'), high=float('inf')) -> bool:
    if not node:
        return True
    if not (low < node.val < high):
        return False
    return is_valid_bst(node.left, low, node.val) and is_valid_bst(node.right, node.val, high)`,
    pitfalls: [
      'Checking only immediate children in BST validation instead of propagating `(low, high)` bounds.',
      'Confusing tree height (edges) vs node depth count on leaf base cases.',
    ],
    dataEngTieIn:
      'Underpins SQL logical/physical query plan ASTs, Catalyst optimizers, and dataset lineage hierarchies.',
  },
  Tries: {
    name: 'Tries',
    shortLabel: 'Tries',
    category: 'Trees & Graphs',
    recognitionSignals: [
      'Prefix autocomplete, wildcard dictionary matching, or multi-pattern word search over strings',
      'Shared prefix compression where hashing full strings repeatedly would waste time/memory',
    ],
    mentalModel:
      'Store characters along tree edges in a node dictionary (`children = {}`) with an `is_end` marker so prefix checks take O(L) regardless of dictionary size.',
    complexityTemplate: {
      time: 'O(L) per insert/search',
      space: 'O(sum of unique prefix chars)',
      note: 'L = length of query string.',
    },
    codeTemplate: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    def insert(self, word: str) -> None:
        cur = self.root
        for ch in word:
            cur = cur.children.setdefault(ch, TrieNode())
        cur.is_end = True`,
    pitfalls: [
      'Forgetting to check `cur.is_end` for exact word search vs prefix search.',
      'Not pruning exhausted Trie branches during Word Search II backtracking.',
    ],
    dataEngTieIn:
      'Drives Data Catalog column/table autocomplete, IP CIDR routing prefixes, and log-signature scanners.',
  },
  'Heap / Priority Queue': {
    name: 'Heap / Priority Queue',
    shortLabel: 'Heaps',
    category: 'Trees & Graphs',
    recognitionSignals: [
      'Top-K / Kth largest/smallest elements, streaming median (Dual Heaps), or task cooldown scheduling',
      'K-way merge of sorted partition streams without loading all elements into memory',
    ],
    mentalModel:
      'Maintain a bounded min-heap of size K for Top-K largest (or negate values for max-heap in Python `heapq`) so eviction costs O(log K).',
    complexityTemplate: {
      time: 'O(N log K)',
      space: 'O(K)',
      note: 'Heapifying an existing array of size N is O(N).',
    },
    codeTemplate: `import heapq

def top_k_largest(nums: list[int], k: int) -> list[int]:
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return sorted(heap, reverse=True)`,
    pitfalls: [
      'Python `heapq` is strictly a min-heap; push `-val` for max-heap behavior.',
      'Comparing unorderable objects in tuples `(priority, dict)`—include a tie-breaker index `(priority, idx, item)`.',
    ],
    dataEngTieIn:
      'Essential for external K-way merge sort across spilled Parquet runs and streaming Top-K heavy-hitter sketches.',
  },
  Backtracking: {
    name: 'Backtracking',
    shortLabel: 'Backtracking',
    category: 'Search & Partition',
    recognitionSignals: [
      'Generate all valid subsets, permutations, combinations summing to target, or constrained board placements',
      'Small N constraint (N <= 15–20) where exhaustive pruned search is required',
    ],
    mentalModel:
      'Build a partial candidate along a recursion tree: choose an option, recurse deeper, and undo the choice (`pop()` / unmark visited) on return.',
    complexityTemplate: {
      time: 'O(2^N) subsets / O(N!) permutations',
      space: 'O(N) recursion depth',
      note: 'Sort + skip adjacent duplicates (`if i > start and nums[i] == nums[i-1]: continue`) to prune.',
    },
    codeTemplate: `def subsets(nums: list[int]) -> list[list[int]]:
    res, path = [], []
    def dfs(idx: int):
        res.append(path[:])
        for i in range(idx, len(nums)):
            path.append(nums[i])
            dfs(i + 1)
            path.pop()
    dfs(0)
    return res`,
    pitfalls: [
      'Appending `path` by reference instead of `path[:]` copy, resulting in empty lists at the end.',
      'Forgetting to restore visited state after exploring a 2D grid cell.',
    ],
    dataEngTieIn:
      'Used in SQL join-order enumeration, feature subset selection, and rack-aware shard placement solvers.',
  },
  'Graphs & BFS/DFS': {
    name: 'Graphs & BFS/DFS',
    shortLabel: 'Graphs',
    category: 'Trees & Graphs',
    recognitionSignals: [
      'Connected components / islands, grid flood-fill, shortest unweighted hop distance (BFS), or cycle checks',
      'Dynamic connectivity / redundant edges solved cleanly with Disjoint Set (Union-Find)',
    ],
    mentalModel:
      'Represent relationships as an adjacency list; use BFS queue for minimum unweighted hops and DFS/Union-Find for reachability & components.',
    complexityTemplate: {
      time: 'O(V + E)',
      space: 'O(V + E)',
      note: 'Mark nodes visited WHEN ENQUEUING in BFS to prevent duplicate queue blowups.',
    },
    codeTemplate: `from collections import deque

def bfs_shortest(adj: dict[int, list[int]], start: int, target: int) -> int:
    q = deque([(start, 0)])
    visited = {start}
    while q:
        node, dist = q.popleft()
        if node == target:
            return dist
        for nxt in adj.get(node, []):
            if nxt not in visited:
                visited.add(nxt)
                q.append((nxt, dist + 1))
    return -1`,
    pitfalls: [
      'Marking `visited` on `popleft()` instead of push, causing exponential duplicate pushes in grids.',
      'Using 2-state visited on directed cycle detection instead of 3-state (0=unvisited, 1=visiting, 2=done).',
    ],
    dataEngTieIn:
      'Models upstream/downstream table lineage impact analysis, cluster failure blast-radius propagation, and entity resolution.',
  },
  'Topological Sort (DAG)': {
    name: 'Topological Sort (DAG)',
    shortLabel: 'Topo Sort (DAG)',
    category: 'Trees & Graphs',
    recognitionSignals: [
      'Task/model execution ordering with prerequisites (`u -> v` must run before `v`)',
      'Cycle detection in directed dependency graphs or reconstructing character order (Alien Dictionary)',
    ],
    mentalModel:
      'Track `indegree[v]` for all nodes, enqueue zero-indegree roots (Kahn’s BFS), and decrement neighbor indegrees as each node completes; if `len(order) < V`, a cycle exists.',
    complexityTemplate: {
      time: 'O(V + E)',
      space: 'O(V + E)',
      note: 'Level-by-level BFS also computes critical-path parallel execution waves.',
    },
    codeTemplate: `from collections import deque

def topo_sort(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1
    q = deque([i for i in range(n) if indeg[i] == 0])
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []`,
    pitfalls: [
      'Reversing edge direction (`[course, prereq]` vs `[prereq, course]`).',
      'Forgetting to check `len(order) == n` to detect circular dependencies.',
    ],
    dataEngTieIn:
      'Exact scheduler algorithm behind dbt DAG execution, Apache Airflow task resolution, and Spark stage planning.',
  },
  'Shortest Path (Dijkstra / Bellman-Ford)': {
    name: 'Shortest Path (Dijkstra / Bellman-Ford)',
    shortLabel: 'Shortest Path',
    category: 'Trees & Graphs',
    recognitionSignals: [
      'Weighted graph minimum latency / cost from source to target(s)',
      'Hop-constrained paths (`at most K stops` -> Bellman-Ford) or non-negative edge weights (-> Dijkstra min-heap)',
    ],
    mentalModel:
      'Dijkstra greedily settles the closest unsettled node via a min-heap; Bellman-Ford relaxes all edges K+1 times using a cloned `prev_dist` array per hop.',
    complexityTemplate: {
      time: 'O((V + E) log V) Dijkstra / O(K * E) Bellman-Ford',
      space: 'O(V + E)',
      note: 'Skip stale heap entries with `if d > dist[u]: continue`.',
    },
    codeTemplate: `import heapq

def dijkstra(n: int, adj: list[list[tuple[int, int]]], src: int) -> list[int]:
    dist = [float('inf')] * n
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(pq, (dist[v], v))
    return dist`,
    pitfalls: [
      'Using Dijkstra on negative edge weights (use Bellman-Ford instead).',
      'Mutating `dist` in-place during the same Bellman-Ford iteration when an exact hop cap `K` is enforced.',
    ],
    dataEngTieIn:
      'Optimizes multi-region cloud replication routing, egress-cost-aware data movement, and SLA network delay diagnostics.',
  },
  Intervals: {
    name: 'Intervals',
    shortLabel: 'Intervals',
    category: 'Optimization & DP',
    recognitionSignals: [
      'Overlapping time windows, calendar/executor slot conflicts, merging or inserting `[start, end]` ranges',
      'Sweep-line delta events (`+1` at start, `-1` at end) for peak concurrency / minimum meeting rooms',
    ],
    mentalModel:
      'Sort intervals by `start` (for merging/inserting) or by `end` (for greedy non-overlapping max selection), then scan linearly.',
    complexityTemplate: {
      time: 'O(N log N)',
      space: 'O(N)',
      note: 'Sorting dominates; single linear sweep follows.',
    },
    codeTemplate: `def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0][:]]
    for s, e in intervals[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged`,
    pitfalls: [
      'Sorting by start instead of end when greedily keeping maximum non-overlapping intervals.',
      'Off-by-one boundary condition (`<=` vs `<`) when touching endpoints count as overlapping.',
    ],
    dataEngTieIn:
      'Core primitive for SCD Type 2 bi-temporal validity coalescing, session gap-and-islands, and Airflow worker slot sizing.',
  },
  Greedy: {
    name: 'Greedy',
    shortLabel: 'Greedy',
    category: 'Optimization & DP',
    recognitionSignals: [
      'Local optimal choice provably leads to global optimum without revisiting earlier decisions',
      'Farthest reachability tracking (Jump Game), circular balance reset (Gas Station), or last-occurrence chunk partitioning',
    ],
    mentalModel:
      'Maintain a tight running invariant (e.g., `farthest_reach`, `tank_surplus`, or `chunk_end`) in a single forward pass.',
    complexityTemplate: {
      time: 'O(N) or O(N log N)',
      space: 'O(1)',
      note: 'Verify with a quick counterexample check that greedy choice cannot miss a global solution.',
    },
    codeTemplate: `def can_jump(nums: list[int]) -> bool:
    reach = 0
    for i, step in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + step)
    return True`,
    pitfalls: [
      'Assuming greedy works when subproblems depend on future choices (e.g. arbitrary Coin Change needs DP).',
      'Failing to verify total sum >= 0 before single-pass reset in circular array problems.',
    ],
    dataEngTieIn:
      'Applies to greedy bin-packing of Parquet row groups, streaming chunk partitioning, and broker hop routing.',
  },
  '1-D Dynamic Programming': {
    name: '1-D Dynamic Programming',
    shortLabel: '1-D DP',
    category: 'Optimization & DP',
    recognitionSignals: [
      'Number of ways, minimum cost, or longest subsequence where state depends only on a 1-D prefix `dp[i]`',
      'Overlapping subproblems across steps (`i-1, i-2`), coin amounts, or Kadane max subarray',
    ],
    mentalModel:
      'Define `dp[i]` clearly in one sentence, write the recurrence transition from smaller states, and compress to O(1) variables when only recent states matter.',
    complexityTemplate: {
      time: 'O(N) or O(N * K)',
      space: 'O(N) -> often O(1)',
      note: 'Bottom-up tabulation avoids Python recursion depth limits on large N.',
    },
    codeTemplate: `def min_coins(coins: list[int], amount: int) -> int:
    dp = [amount + 1] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] <= amount else -1`,
    pitfalls: [
      'Confusing combinations (outer loop = coins) vs permutations (outer loop = amount) in coin-ways problems.',
      'Forgetting base case `dp[0]` or returning sentinel `amount + 1` instead of `-1`.',
    ],
    dataEngTieIn:
      'Powers cost-based query optimization, anomaly peak-burst windowing (Kadane), and variable-length decoding.',
  },
  '2-D Dynamic Programming': {
    name: '2-D Dynamic Programming',
    shortLabel: '2-D DP',
    category: 'Optimization & DP',
    recognitionSignals: [
      'Aligning or comparing two sequences (Edit Distance, Longest Common Subsequence)',
      'Grid path counting or 0/1 Knapsack `(item_idx, remaining_capacity)`',
    ],
    mentalModel:
      'Build a 2-D table `dp[i][j]` matching prefixes of length `i` and `j` (or item index vs capacity), optionally rolling to a 1-D row.',
    complexityTemplate: {
      time: 'O(M * N)',
      space: 'O(M * N) -> O(min(M, N)) rolling',
      note: 'When rolling 0/1 Knapsack into 1-D, iterate capacity BACKWARDS (`range(cap, w-1, -1)`).',
    },
    codeTemplate: `def lcs(a: str, b: str) -> int:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            if a[i] == b[j]:
                dp[i][j] = 1 + dp[i + 1][j + 1]
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    return dp[0][0]`,
    pitfalls: [
      'Off-by-one indexing on `(m + 1) x (n + 1)` tables for empty-string base cases.',
      'Iterating forward in 1-D compressed 0/1 Knapsack, accidentally turning it into unbounded knapsack.',
    ],
    dataEngTieIn:
      'Underpins fuzzy entity record matching (Levenshtein), schema diff alignment, and RAM-capped cache admission.',
  },
  'Bit Manipulation & Math': {
    name: 'Bit Manipulation & Math',
    shortLabel: 'Bit & Math',
    category: 'Optimization & DP',
    recognitionSignals: [
      'Find unique/missing element in O(1) space using XOR cancellation (`a ^ a = 0`)',
      'Compact bitmap flags, popcount (`n & (n - 1)`), endianness bit-reversal, or power-of-two checks',
    ],
    mentalModel:
      'Exploit bitwise identities (`x ^ x = 0`, `x & (x - 1)` clears lowest set bit) to compute parity, masks, and missing IDs in constant space.',
    complexityTemplate: {
      time: 'O(N) or O(log V)',
      space: 'O(1)',
      note: 'Use explicit 32-bit masks (`& 0xFFFFFFFF`) in Python since Python ints have arbitrary precision.',
    },
    codeTemplate: `def single_number(nums: list[int]) -> int:
    acc = 0
    for x in nums:
        acc ^= x
    return acc`,
    pitfalls: [
      'Python arbitrary-precision negative integers causing infinite loops without `0xFFFFFFFF` masking.',
      'Operator precedence bugs (`==` binds tighter than `&`, always parenthesize `(n & 1) == 0`).',
    ],
    dataEngTieIn:
      'Core to Roaring Bitmaps, Snowflake/BigQuery bitmap distinct-count sketches, and Parquet binary encoding headers.',
  },
};
