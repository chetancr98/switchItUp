// Curated hands-on practice and further reading, shown at the end of each module and on the Practice page.
// kind: 'practice' (solve/code something), 'interactive' (in-browser lab), 'docs', 'read', 'video', 'course'

const lc = (slug, title) => ({ kind: 'practice', label: `LeetCode — ${title}`, url: `https://leetcode.com/problems/${slug}/` })
const R = (kind, label, url) => ({ kind, label, url })

export const RESOURCES = {
  // ---------- Java ----------
  'java/01-jvm-internals': [
    R('docs', 'dev.java — Learn Java (official)', 'https://dev.java/learn/'),
    R('docs', 'JVM Specification (Java SE 21)', 'https://docs.oracle.com/javase/specs/jvms/se21/html/index.html'),
    R('read', 'Baeldung — Java tutorials', 'https://www.baeldung.com/'),
  ],
  'java/02-core-language': [
    R('practice', 'Exercism — Java track (mentored exercises)', 'https://exercism.org/tracks/java'),
    R('practice', 'CodingBat — Java warm-ups', 'https://codingbat.com/java'),
    R('docs', 'dev.java — Language basics', 'https://dev.java/learn/language-basics/'),
  ],
  'java/03-collections-internals': [
    lc('lru-cache', 'LRU Cache'), lc('design-hashmap', 'Design HashMap'), lc('insert-delete-getrandom-o1', 'Insert Delete GetRandom O(1)'),
    R('docs', 'java.util API docs (Java 21)', 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/package-summary.html'),
  ],
  'java/04-concurrency': [
    lc('print-in-order', 'Print in Order'), lc('print-foobar-alternately', 'Print FooBar Alternately'),
    R('read', 'Baeldung — Java concurrency', 'https://www.baeldung.com/java-concurrency'),
  ],
  'java/05-modern-java': [
    R('docs', 'dev.java — Streams', 'https://dev.java/learn/api/streams/'),
    R('practice', 'Exercism — Java track', 'https://exercism.org/tracks/java'),
  ],
  'java/06-gc-performance': [
    R('docs', 'HotSpot GC tuning guide (Java 21)', 'https://docs.oracle.com/en/java/javase/21/gctuning/'),
    R('read', 'Eclipse Memory Analyzer (MAT)', 'https://eclipse.dev/mat/'),
  ],
  'java/07-solid-design-patterns': [
    R('read', 'Refactoring.Guru — Design patterns (with Java examples)', 'https://refactoring.guru/design-patterns'),
  ],

  // ---------- Spring ----------
  'spring/01-ioc-autoconfig': [
    R('practice', 'Spring Initializr — generate a project', 'https://start.spring.io/'),
    R('docs', 'Spring Boot reference', 'https://docs.spring.io/spring-boot/'),
    R('practice', 'Spring guides (hands-on tutorials)', 'https://spring.io/guides'),
  ],
  'spring/02-web-mvc-rest': [
    R('practice', 'Guide: Building a RESTful web service', 'https://spring.io/guides/gs/rest-service'),
    R('read', 'Baeldung — REST with Spring', 'https://www.baeldung.com/rest-with-spring-series'),
  ],
  'spring/03-jpa-transactions': [
    R('practice', 'Guide: Accessing data with JPA', 'https://spring.io/guides/gs/accessing-data-jpa'),
    R('read', 'Vlad Mihalcea — high-performance JPA articles', 'https://vladmihalcea.com/tutorials/hibernate/'),
  ],
  'spring/04-security-jwt-oauth': [
    R('docs', 'Spring Security reference', 'https://docs.spring.io/spring-security/reference/'),
    R('read', 'OWASP API Security Top 10', 'https://owasp.org/API-Security/'),
    R('interactive', 'jwt.io — decode and inspect JWTs', 'https://jwt.io/'),
  ],
  'spring/05-aop-caching-async': [
    R('docs', 'Redis documentation', 'https://redis.io/docs/latest/'),
    R('docs', 'Spring caching abstraction', 'https://docs.spring.io/spring-framework/reference/integration/cache.html'),
  ],
  'spring/06-testing-observability': [
    R('docs', 'Testcontainers — getting started', 'https://testcontainers.com/getting-started/'),
    R('read', 'Google SRE book — Service level objectives', 'https://sre.google/sre-book/service-level-objectives/'),
  ],

  // ---------- SQL ----------
  'sql/01-sql-fundamentals': [
    R('interactive', 'SQLBolt — interactive lessons', 'https://sqlbolt.com/'),
    R('practice', 'LeetCode — Top SQL 50 study plan', 'https://leetcode.com/studyplan/top-sql-50/'),
    R('practice', 'HackerRank — SQL practice', 'https://www.hackerrank.com/domains/sql'),
  ],
  'sql/02-joins-aggregation-window-functions': [
    R('practice', 'PostgreSQL Exercises', 'https://pgexercises.com/'),
    lc('department-top-three-salaries', 'Department Top Three Salaries'), lc('consecutive-numbers', 'Consecutive Numbers'),
    R('interactive', 'DB Fiddle — run SQL online', 'https://www.db-fiddle.com/'),
  ],
  'sql/03-indexes-plans-normalization-transactions': [
    R('read', 'Use The Index, Luke — SQL indexing explained', 'https://use-the-index-luke.com/'),
    R('docs', 'PostgreSQL — Using EXPLAIN', 'https://www.postgresql.org/docs/current/using-explain.html'),
  ],

  // ---------- React ----------
  'react/01-javascript-engine': [
    R('read', 'javascript.info — The Modern JavaScript Tutorial', 'https://javascript.info/'),
    R('practice', 'BigFrontEnd.dev — JS coding problems', 'https://bigfrontend.dev/'),
    R('docs', 'MDN — JavaScript guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'),
  ],
  'react/02-rendering-reconciliation': [
    R('practice', 'react.dev — Learn (interactive challenges)', 'https://react.dev/learn'),
  ],
  'react/03-hooks-deep-dive': [
    R('read', 'react.dev — You Might Not Need an Effect', 'https://react.dev/learn/you-might-not-need-an-effect'),
    R('docs', 'react.dev — Hooks reference', 'https://react.dev/reference/react/hooks'),
  ],
  'react/04-state-data-fetching': [
    R('docs', 'TanStack Query docs', 'https://tanstack.com/query/latest'),
    R('docs', 'Redux Toolkit docs', 'https://redux-toolkit.js.org/'),
  ],
  'react/05-performance-react19': [
    R('read', 'web.dev — Core Web Vitals', 'https://web.dev/articles/vitals'),
    R('practice', 'GreatFrontEnd — frontend interview practice', 'https://www.greatfrontend.com/'),
  ],

  // ---------- Microservices ----------
  'microservices/01-decomposition-ddd': [
    R('read', 'microservices.io — pattern language', 'https://microservices.io/patterns/'),
    R('read', 'Martin Fowler — Microservices', 'https://martinfowler.com/articles/microservices.html'),
  ],
  'microservices/02-communication-kafka': [
    R('docs', 'Apache Kafka documentation', 'https://kafka.apache.org/documentation/'),
    R('docs', 'Spring for Apache Kafka', 'https://docs.spring.io/spring-kafka/reference/'),
  ],
  'microservices/03-resilience': [
    R('docs', 'Resilience4j documentation', 'https://resilience4j.readme.io/'),
  ],
  'microservices/04-data-patterns': [
    R('read', 'microservices.io — Saga pattern', 'https://microservices.io/patterns/data/saga.html'),
    R('read', 'microservices.io — Transactional outbox', 'https://microservices.io/patterns/data/transactional-outbox.html'),
    R('docs', 'Debezium (CDC) documentation', 'https://debezium.io/documentation/'),
  ],
  'microservices/05-gateway-discovery-observability': [
    R('docs', 'OpenTelemetry documentation', 'https://opentelemetry.io/docs/'),
    R('docs', 'Spring Cloud Gateway', 'https://docs.spring.io/spring-cloud-gateway/reference/'),
  ],

  // ---------- DevOps ----------
  'devops/01-cicd-github-actions': [
    R('docs', 'GitHub Actions documentation', 'https://docs.github.com/en/actions'),
    R('practice', 'GitHub Skills — hands-on courses', 'https://skills.github.com/'),
  ],
  'devops/02-docker': [
    R('interactive', 'Play with Docker — free browser lab', 'https://labs.play-with-docker.com/'),
    R('docs', 'Docker — Get started', 'https://docs.docker.com/get-started/'),
  ],
  'devops/03-kubernetes': [
    R('interactive', 'Killercoda — free Kubernetes scenarios in the browser', 'https://killercoda.com/'),
    R('docs', 'Kubernetes tutorials (official)', 'https://kubernetes.io/docs/tutorials/'),
  ],
  'devops/04-deployment-strategies-cloud': [
    R('docs', 'AWS Well-Architected Framework', 'https://aws.amazon.com/architecture/well-architected/'),
    R('practice', 'Terraform tutorials (HashiCorp)', 'https://developer.hashicorp.com/terraform/tutorials'),
  ],

  // ---------- Git ----------
  'git/01-git-internals': [
    R('interactive', 'Learn Git Branching — visual, in-browser', 'https://learngitbranching.js.org/'),
    R('read', 'Pro Git book (free) — Git internals chapter', 'https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain'),
  ],
  'git/02-workflows-collaboration': [
    R('interactive', 'Learn Git Branching — rebase & cherry-pick levels', 'https://learngitbranching.js.org/'),
    R('practice', 'GitHub Skills — Introduction to GitHub', 'https://skills.github.com/'),
  ],

  // ---------- System design ----------
  'system-design/01-framework-estimation': [
    R('read', 'Hello Interview — System Design in a Hurry', 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction'),
    R('read', 'The System Design Primer (GitHub)', 'https://github.com/donnemartin/system-design-primer'),
  ],
  'system-design/02-building-blocks': [
    R('read', 'The System Design Primer — building blocks', 'https://github.com/donnemartin/system-design-primer'),
    R('read', 'ByteByteGo — system design articles', 'https://bytebytego.com/'),
  ],
  'system-design/03-databases-at-scale': [
    R('read', 'Designing Data-Intensive Applications (book site)', 'https://dataintensive.net/'),
    R('read', 'Use The Index, Luke', 'https://use-the-index-luke.com/'),
  ],
  'system-design/04-distributed-systems': [
    R('interactive', 'The Secret Lives of Data — Raft visualised', 'https://thesecretlivesofdata.com/raft/'),
    R('read', 'Raft consensus algorithm site', 'https://raft.github.io/'),
  ],
  'system-design/05-case-url-shortener-rate-limiter': [
    R('read', 'Hello Interview — System design breakdowns', 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction'),
  ],
  'system-design/06-case-feed-chat-notifications': [
    R('read', 'The System Design Primer — solutions', 'https://github.com/donnemartin/system-design-primer'),
  ],
  'system-design/07-case-video-ride-search': [
    R('read', 'H3 geospatial index (Uber)', 'https://h3geo.org/'),
  ],

  // ---------- DSA ----------
  'dsa/01-complexity-java-toolkit': [
    R('practice', 'NeetCode roadmap — patterns in order', 'https://neetcode.io/roadmap'),
    R('practice', 'LeetCode — Top Interview 150', 'https://leetcode.com/studyplan/top-interview-150/'),
    R('interactive', 'VisuAlgo — animated data structures', 'https://visualgo.net/en'),
  ],
  'dsa/02-arrays-two-pointers-sliding-window': [
    lc('two-sum', 'Two Sum'), lc('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating'),
    lc('3sum', '3Sum'), lc('trapping-rain-water', 'Trapping Rain Water'), lc('minimum-window-substring', 'Minimum Window Substring'),
    lc('subarray-sum-equals-k', 'Subarray Sum Equals K'),
  ],
  'dsa/03-hashing-stacks-queues': [
    lc('valid-parentheses', 'Valid Parentheses'), lc('daily-temperatures', 'Daily Temperatures'),
    lc('largest-rectangle-in-histogram', 'Largest Rectangle in Histogram'), lc('sliding-window-maximum', 'Sliding Window Maximum'),
    lc('top-k-frequent-elements', 'Top K Frequent Elements'),
  ],
  'dsa/04-linked-lists-binary-search': [
    lc('reverse-linked-list', 'Reverse Linked List'), lc('linked-list-cycle-ii', 'Linked List Cycle II'),
    lc('merge-k-sorted-lists', 'Merge k Sorted Lists'), lc('search-in-rotated-sorted-array', 'Search in Rotated Sorted Array'),
    lc('koko-eating-bananas', 'Koko Eating Bananas'), lc('median-of-two-sorted-arrays', 'Median of Two Sorted Arrays'),
  ],
  'dsa/05-trees-bst': [
    lc('binary-tree-level-order-traversal', 'Level Order Traversal'), lc('validate-binary-search-tree', 'Validate BST'),
    lc('lowest-common-ancestor-of-a-binary-tree', 'LCA of a Binary Tree'), lc('binary-tree-maximum-path-sum', 'Max Path Sum'),
    lc('serialize-and-deserialize-binary-tree', 'Serialize and Deserialize'),
  ],
  'dsa/06-heaps-intervals-greedy': [
    lc('kth-largest-element-in-an-array', 'Kth Largest Element'), lc('find-median-from-data-stream', 'Median from Data Stream'),
    lc('merge-intervals', 'Merge Intervals'), lc('non-overlapping-intervals', 'Non-overlapping Intervals'),
    lc('task-scheduler', 'Task Scheduler'), lc('jump-game-ii', 'Jump Game II'),
  ],
  'dsa/07-graphs': [
    lc('number-of-islands', 'Number of Islands'), lc('course-schedule-ii', 'Course Schedule II'), lc('rotting-oranges', 'Rotting Oranges'),
    lc('network-delay-time', 'Network Delay Time'), lc('cheapest-flights-within-k-stops', 'Cheapest Flights Within K Stops'),
    lc('word-ladder', 'Word Ladder'), lc('redundant-connection', 'Redundant Connection'),
  ],
  'dsa/08-dynamic-programming': [
    lc('coin-change', 'Coin Change'), lc('longest-increasing-subsequence', 'LIS'), lc('longest-common-subsequence', 'LCS'),
    lc('edit-distance', 'Edit Distance'), lc('word-break', 'Word Break'), lc('partition-equal-subset-sum', 'Partition Equal Subset Sum'),
    lc('burst-balloons', 'Burst Balloons'),
  ],
  'dsa/09-backtracking': [
    lc('subsets', 'Subsets'), lc('permutations', 'Permutations'), lc('combination-sum', 'Combination Sum'),
    lc('word-search', 'Word Search'), lc('n-queens', 'N-Queens'),
  ],
  'dsa/10-advanced-structures': [
    lc('implement-trie-prefix-tree', 'Implement Trie'), lc('word-search-ii', 'Word Search II'),
    lc('range-sum-query-mutable', 'Range Sum Query – Mutable'), lc('count-of-smaller-numbers-after-self', 'Count of Smaller Numbers After Self'),
    lc('maximum-xor-of-two-numbers-in-an-array', 'Maximum XOR'), R('read', 'cp-algorithms — data structures', 'https://cp-algorithms.com/'),
  ],

  // ---------- CP ----------
  'cp/01-fast-io-java-templates': [
    R('practice', 'Codeforces — contests & problemset', 'https://codeforces.com/problemset'),
    R('practice', 'CSES Problem Set', 'https://cses.fi/problemset/'),
    R('read', 'USACO Guide', 'https://usaco.guide/'),
  ],
  'cp/02-number-theory-combinatorics': [
    R('read', 'cp-algorithms — algebra & number theory', 'https://cp-algorithms.com/'),
    lc('count-primes', 'Count Primes'), lc('powx-n', 'Pow(x, n)'),
  ],
  'cp/03-advanced-techniques': [
    R('practice', 'Codeforces EDU — segment tree, DSU, binary search courses', 'https://codeforces.com/edu/courses'),
    R('practice', 'AtCoder Beginner Contests', 'https://atcoder.jp/contests/'),
  ],

  // ---------- Coding Q&A ----------
  'coding/01-arrays-strings': [R('practice', 'LeetCode — Top Interview 150', 'https://leetcode.com/studyplan/top-interview-150/'), R('practice', 'NeetCode 150', 'https://neetcode.io/practice')],
  'coding/02-linkedlist-stack-queue': [lc('lru-cache', 'LRU Cache'), lc('merge-k-sorted-lists', 'Merge k Sorted Lists')],
  'coding/03-trees-graphs': [lc('serialize-and-deserialize-binary-tree', 'Serialize and Deserialize'), lc('word-ladder', 'Word Ladder')],
  'coding/04-dp-backtracking': [lc('edit-distance', 'Edit Distance'), lc('n-queens', 'N-Queens')],
  'coding/05-java-programs': [R('practice', 'Exercism — Java track', 'https://exercism.org/tracks/java'), R('practice', 'HackerRank — Java practice', 'https://www.hackerrank.com/domains/java')],
  'coding/06-sql-queries': [R('practice', 'LeetCode — Top SQL 50', 'https://leetcode.com/studyplan/top-sql-50/'), R('interactive', 'DB Fiddle', 'https://www.db-fiddle.com/')],
  'coding/07-javascript-coding': [R('practice', 'BigFrontEnd.dev', 'https://bigfrontend.dev/'), R('practice', 'GreatFrontEnd', 'https://www.greatfrontend.com/')],
  'coding/08-python-ai-coding': [
    R('interactive', 'Google Colab — run Python notebooks free', 'https://colab.research.google.com/'),
    R('practice', 'Exercism — Python track', 'https://exercism.org/tracks/python'),
  ],

  // ---------- Interview ----------
  'interview/01-lld-machine-coding': [R('read', 'Refactoring.Guru — Design patterns', 'https://refactoring.guru/design-patterns')],
  'interview/02-behavioral-leadership': [R('read', 'Amazon Leadership Principles', 'https://www.amazon.jobs/content/en/our-workplace/leadership-principles')],
  'interview/03-process-resume-negotiation': [R('read', 'levels.fyi — compensation data', 'https://www.levels.fyi/'), R('practice', 'interviewing.io — mock interviews', 'https://interviewing.io/')],

  // ---------- Python ----------
  'python/01-python-for-java-developers': [
    R('docs', 'The Python Tutorial (official)', 'https://docs.python.org/3/tutorial/'),
    R('interactive', 'Google Colab — Python in the browser, no install', 'https://colab.research.google.com/'),
    R('practice', 'Exercism — Python track', 'https://exercism.org/tracks/python'),
  ],
  'python/02-data-structures-oop-typing': [
    R('docs', 'Python data model', 'https://docs.python.org/3/reference/datamodel.html'),
    R('docs', 'typing — type hints', 'https://docs.python.org/3/library/typing.html'),
    R('read', 'Real Python — tutorials', 'https://realpython.com/'),
  ],
  'python/03-async-packaging-testing-fastapi': [
    R('practice', 'FastAPI tutorial (official)', 'https://fastapi.tiangolo.com/tutorial/'),
    R('docs', 'uv — Python package & project manager', 'https://docs.astral.sh/uv/'),
    R('docs', 'pytest documentation', 'https://docs.pytest.org/'),
  ],
  'python/04-numpy-pandas-for-ai': [
    R('docs', 'NumPy — absolute beginners guide', 'https://numpy.org/doc/stable/user/absolute_beginners.html'),
    R('docs', 'pandas — getting started', 'https://pandas.pydata.org/docs/getting_started/index.html'),
    R('course', 'Kaggle Learn — Pandas (free, in-browser)', 'https://www.kaggle.com/learn/pandas'),
  ],

  // ---------- AI ----------
  'ai/01-ml-fundamentals': [
    R('course', 'Kaggle Learn — Intro to Machine Learning', 'https://www.kaggle.com/learn/intro-to-machine-learning'),
    R('course', 'Google — Machine Learning Crash Course', 'https://developers.google.com/machine-learning/crash-course'),
    R('docs', 'scikit-learn — getting started', 'https://scikit-learn.org/stable/getting_started.html'),
  ],
  'ai/02-neural-networks-deep-learning': [
    R('video', '3Blue1Brown — Neural networks series', 'https://www.3blue1brown.com/topics/neural-networks'),
    R('video', 'Andrej Karpathy — Neural Networks: Zero to Hero', 'https://karpathy.ai/zero-to-hero.html'),
    R('interactive', 'TensorFlow Playground — train a network in your browser', 'https://playground.tensorflow.org/'),
    R('course', 'fast.ai — Practical Deep Learning', 'https://course.fast.ai/'),
  ],
  'ai/03-transformers-llms': [
    R('read', 'Jay Alammar — The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/'),
    R('course', 'Hugging Face — LLM Course', 'https://huggingface.co/learn/llm-course'),
    R('video', 'Karpathy — Let’s build GPT (in Zero to Hero)', 'https://karpathy.ai/zero-to-hero.html'),
  ],
  'ai/04-embeddings-vector-search-rag': [
    R('course', 'Hugging Face — LLM Course (embeddings & semantic search)', 'https://huggingface.co/learn/llm-course'),
    R('docs', 'pgvector — vector search in PostgreSQL', 'https://github.com/pgvector/pgvector'),
    R('docs', 'Claude docs — Embeddings (with Voyage AI)', 'https://platform.claude.com/docs/en/build-with-claude/embeddings'),
  ],
  'ai/05-prompt-engineering-structured-outputs-evals': [
    R('course', 'Anthropic — Interactive prompt engineering tutorial', 'https://github.com/anthropics/prompt-eng-interactive-tutorial'),
    R('course', 'Anthropic courses (GitHub)', 'https://github.com/anthropics/courses'),
    R('docs', 'Claude docs — Prompt engineering overview', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview'),
  ],

  // ---------- Agents ----------
  'agents/01-what-is-an-agent': [
    R('read', 'Anthropic — Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'),
    R('course', 'Hugging Face — AI Agents Course', 'https://huggingface.co/learn/agents-course'),
  ],
  'agents/02-build-agent-python-claude': [
    R('docs', 'Claude docs — Tool use overview', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview'),
    R('practice', 'Claude docs — Tutorial: build a tool-using agent', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/build-a-tool-using-agent'),
    R('docs', 'Anthropic Python SDK (GitHub)', 'https://github.com/anthropics/anthropic-sdk-python'),
  ],
  'agents/03-mcp-memory-multi-agent': [
    R('docs', 'Model Context Protocol — official site', 'https://modelcontextprotocol.io/'),
    R('practice', 'MCP — build an MCP client', 'https://modelcontextprotocol.io/docs/develop/build-client'),
    R('docs', 'Claude docs — MCP connector', 'https://platform.claude.com/docs/en/agents-and-tools/mcp-connector'),
  ],
  'agents/04-production-agents-evals-safety': [
    R('read', 'Anthropic — Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'),
    R('read', 'OWASP Top 10 for LLM Applications', 'https://genai.owasp.org/llm-top-10/'),
    R('docs', 'Claude docs — Prompt caching', 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching'),
  ],
  'agents/05-ai-system-design-cases': [
    R('read', 'Anthropic — Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'),
    R('read', 'Hello Interview — system design', 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction'),
  ],
  'agents/06-ai-interview-question-bank': [
    R('course', 'Hugging Face — AI Agents Course', 'https://huggingface.co/learn/agents-course'),
    R('course', 'Anthropic courses (GitHub)', 'https://github.com/anthropics/courses'),
  ],
}

// Platforms grouped for the Practice page.
export const PLATFORMS = [
  {
    area: 'Coding interviews (DSA)', icon: '🧠', items: [
      R('practice', 'LeetCode — Top Interview 150', 'https://leetcode.com/studyplan/top-interview-150/'),
      R('practice', 'NeetCode — roadmap & 150 list', 'https://neetcode.io/roadmap'),
      R('interactive', 'VisuAlgo — watch algorithms run', 'https://visualgo.net/en'),
      R('practice', 'interviewing.io — mock interviews', 'https://interviewing.io/'),
    ],
  },
  {
    area: 'Competitive programming', icon: '⚡', items: [
      R('practice', 'Codeforces', 'https://codeforces.com/'),
      R('practice', 'CSES Problem Set', 'https://cses.fi/problemset/'),
      R('practice', 'AtCoder', 'https://atcoder.jp/'),
      R('read', 'cp-algorithms', 'https://cp-algorithms.com/'),
      R('read', 'USACO Guide', 'https://usaco.guide/'),
    ],
  },
  {
    area: 'SQL', icon: '🗄️', items: [
      R('interactive', 'SQLBolt', 'https://sqlbolt.com/'),
      R('practice', 'LeetCode — Top SQL 50', 'https://leetcode.com/studyplan/top-sql-50/'),
      R('practice', 'PostgreSQL Exercises', 'https://pgexercises.com/'),
      R('interactive', 'DB Fiddle', 'https://www.db-fiddle.com/'),
    ],
  },
  {
    area: 'Java & Spring', icon: '☕', items: [
      R('docs', 'dev.java — Learn', 'https://dev.java/learn/'),
      R('practice', 'Spring guides', 'https://spring.io/guides'),
      R('practice', 'Exercism — Java', 'https://exercism.org/tracks/java'),
      R('read', 'Baeldung', 'https://www.baeldung.com/'),
    ],
  },
  {
    area: 'Frontend', icon: '⚛️', items: [
      R('practice', 'react.dev — Learn', 'https://react.dev/learn'),
      R('read', 'javascript.info', 'https://javascript.info/'),
      R('practice', 'BigFrontEnd.dev', 'https://bigfrontend.dev/'),
      R('practice', 'GreatFrontEnd', 'https://www.greatfrontend.com/'),
    ],
  },
  {
    area: 'DevOps & Git (free browser labs)', icon: '🚢', items: [
      R('interactive', 'Learn Git Branching', 'https://learngitbranching.js.org/'),
      R('interactive', 'Play with Docker', 'https://labs.play-with-docker.com/'),
      R('interactive', 'Killercoda — Kubernetes & Linux', 'https://killercoda.com/'),
      R('practice', 'GitHub Skills', 'https://skills.github.com/'),
    ],
  },
  {
    area: 'System design', icon: '🏗️', items: [
      R('read', 'Hello Interview — System Design in a Hurry', 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction'),
      R('read', 'The System Design Primer', 'https://github.com/donnemartin/system-design-primer'),
      R('read', 'ByteByteGo', 'https://bytebytego.com/'),
      R('interactive', 'Raft visualised', 'https://thesecretlivesofdata.com/raft/'),
    ],
  },
  {
    area: 'Python', icon: '🐍', items: [
      R('interactive', 'Google Colab', 'https://colab.research.google.com/'),
      R('docs', 'The Python Tutorial', 'https://docs.python.org/3/tutorial/'),
      R('practice', 'Exercism — Python', 'https://exercism.org/tracks/python'),
      R('course', 'Kaggle Learn — Python & Pandas', 'https://www.kaggle.com/learn'),
    ],
  },
  {
    area: 'AI, LLMs & agents', icon: '🤖', items: [
      R('video', 'Karpathy — Neural Networks: Zero to Hero', 'https://karpathy.ai/zero-to-hero.html'),
      R('interactive', 'TensorFlow Playground', 'https://playground.tensorflow.org/'),
      R('course', 'Hugging Face — LLM Course', 'https://huggingface.co/learn/llm-course'),
      R('course', 'Hugging Face — AI Agents Course', 'https://huggingface.co/learn/agents-course'),
      R('course', 'Anthropic courses', 'https://github.com/anthropics/courses'),
      R('read', 'Anthropic — Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'),
      R('docs', 'Claude API — Tool use', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview'),
      R('docs', 'Model Context Protocol', 'https://modelcontextprotocol.io/'),
    ],
  },
]
