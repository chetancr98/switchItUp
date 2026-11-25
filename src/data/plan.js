// 20-week (≈ 4.5 month) plan. Each week lists the modules to finish; DSA practice runs daily alongside.
export const PLAN_WEEKS = [
  { title: 'Java & tooling foundations', focus: 'How Java runs, core language rules, Big-O, arrays.', modules: ['java/01-jvm-internals', 'java/02-core-language', 'dsa/00-sorting-searching', 'dsa/01-complexity-java-toolkit', 'dsa/02-arrays-two-pointers-sliding-window', 'git/01-git-internals'] },
  { title: 'Collections & JavaScript basics', focus: 'HashMap internals, hashing/stack patterns, the JS event loop.', modules: ['java/03-collections-internals', 'dsa/03-hashing-stacks-queues', 'coding/01-arrays-strings', 'sql/01-sql-fundamentals', 'react/01-javascript-engine'] },
  { title: 'Concurrency & React rendering', focus: 'Threads and the memory model; linked lists & binary search.', modules: ['java/04-concurrency', 'dsa/04-linked-lists-binary-search', 'coding/02-linkedlist-stack-queue', 'sql/02-joins-aggregation-window-functions', 'react/02-rendering-reconciliation'] },
  { title: 'Modern Java & Spring core', focus: 'Streams/records, Spring IoC, trees.', modules: ['java/05-modern-java', 'spring/01-ioc-autoconfig', 'dsa/05-trees-bst', 'coding/05-java-programs'] },
  { title: 'REST APIs & databases', focus: 'Spring MVC, JPA, transactions, SQL.', modules: ['spring/02-web-mvc-rest', 'sql/03-indexes-plans-normalization-transactions', 'spring/03-jpa-transactions', 'dsa/06-heaps-intervals-greedy', 'coding/06-sql-queries'] },
  { title: 'Security & hooks', focus: 'JWT/OAuth, React hooks, graphs.', modules: ['spring/04-security-jwt-oauth', 'react/03-hooks-deep-dive', 'dsa/07-graphs', 'coding/03-trees-graphs'] },
  { title: 'AOP, state & CI/CD', focus: 'Proxies & caching, React state, pipelines, team Git, DP part 1.', modules: ['spring/05-aop-caching-async', 'react/04-state-data-fetching', 'devops/01-cicd-github-actions', 'git/02-workflows-collaboration', 'dsa/08-dynamic-programming'] },
  { title: 'Containers & service boundaries', focus: 'Docker, splitting a system, backtracking, DP part 2.', modules: ['devops/02-docker', 'microservices/01-decomposition-ddd', 'dsa/09-backtracking', 'coding/04-dp-backtracking'] },
  { title: 'Kafka, resilience & Kubernetes', focus: 'Async messaging, failure handling, K8s; start contests.', modules: ['microservices/02-communication-kafka', 'microservices/03-resilience', 'devops/03-kubernetes', 'cp/01-fast-io-java-templates'] },
  { title: 'System design begins', focus: 'Design framework, building blocks, SOLID, JS coding.', modules: ['system-design/01-framework-estimation', 'system-design/02-building-blocks', 'java/07-solid-design-patterns', 'coding/07-javascript-coding'] },
  { title: 'Data at scale', focus: 'Sharding/replication, sagas & outbox, advanced structures.', modules: ['system-design/03-databases-at-scale', 'microservices/04-data-patterns', 'dsa/10-advanced-structures'] },
  { title: 'Distributed systems & production', focus: 'CAP/Raft/locks, observability, testing.', modules: ['system-design/04-distributed-systems', 'microservices/05-gateway-discovery-observability', 'spring/06-testing-observability'] },
  { title: 'Performance & releases', focus: 'First design case studies, GC tuning, deployments, React perf.', modules: ['system-design/05-case-url-shortener-rate-limiter', 'java/06-gc-performance', 'devops/04-deployment-strategies-cloud', 'react/05-performance-react19'] },
  { title: 'Design cases & LLD', focus: 'Feed/chat/notifications, number theory, machine coding.', modules: ['system-design/06-case-feed-chat-notifications', 'cp/02-number-theory-combinatorics', 'interview/01-lld-machine-coding'] },
  { title: 'Big designs & your story', focus: 'YouTube/Uber/payments, behavioral stories, resume.', modules: ['system-design/07-case-video-ride-search', 'interview/02-behavioral-leadership', 'interview/03-process-resume-negotiation'] },
  { title: 'Hard problems & revision', focus: 'Advanced CP techniques; re-read everything in your Revise list.', modules: ['cp/03-advanced-techniques', 'dsa/11-algorithms-catalog'] },
  { title: 'Mock interviews I', focus: '3 coding mocks + 2 system design mocks. Apply to 3–4 "practice" companies.', modules: [] },
  { title: 'Mock interviews II', focus: 'LLD timed drills (one per day). Company-tagged problems. Apply to target companies.', modules: [] },
  { title: 'Interview loops', focus: 'Interviews. 2 problems/day to stay sharp. Review each round the same evening.', modules: [] },
  { title: 'Offers & negotiation', focus: 'Final rounds, compare offers on 4-year total comp, negotiate.', modules: [] },
]

// AI Engineer path: 10 weeks. Run it after the Java plan, or in parallel at ~1 hour/day once you're past week 8 of the Java plan.
export const AI_PLAN_WEEKS = [
  { title: 'Python fluency', focus: 'Python syntax and idioms mapped from Java; data structures, typing, OOP.', modules: ['python/01-python-for-java-developers', 'python/02-data-structures-oop-typing'] },
  { title: 'Production Python', focus: 'async, packaging with uv, pytest, FastAPI; NumPy & pandas basics.', modules: ['python/03-async-packaging-testing-fastapi', 'python/04-numpy-pandas-for-ai'] },
  { title: 'Machine learning from scratch', focus: 'Supervised learning, loss, gradient descent — play with the AI Lab gradient descent demo.', modules: ['ai/01-ml-fundamentals'] },
  { title: 'Neural networks', focus: 'Neurons, backprop, training loops; build a tiny network in NumPy.', modules: ['ai/02-neural-networks-deep-learning'] },
  { title: 'Transformers & LLMs', focus: 'Tokens, embeddings, attention, sampling — use the Lab tokenizer and sampling demos.', modules: ['ai/03-transformers-llms'] },
  { title: 'Embeddings & RAG', focus: 'Vector search, chunking, retrieval quality; build a mini RAG over your notes.', modules: ['ai/04-embeddings-vector-search-rag', 'coding/08-python-ai-coding'] },
  { title: 'Prompting, structured outputs & evals', focus: 'Prompt design, JSON outputs, building an eval set.', modules: ['ai/05-prompt-engineering-structured-outputs-evals'] },
  { title: 'Your first agent', focus: 'Agent loop and tool use; build a working agent with the Claude API.', modules: ['agents/01-what-is-an-agent', 'agents/02-build-agent-python-claude'] },
  { title: 'Agent architecture & production', focus: 'MCP, memory, multi-agent, guardrails, evals, cost and latency.', modules: ['agents/03-mcp-memory-multi-agent', 'agents/04-production-agents-evals-safety'] },
  { title: 'AI interviews', focus: 'AI system design cases and the AI interview question bank; ship one portfolio project.', modules: ['agents/05-ai-system-design-cases', 'agents/06-ai-interview-question-bank'] },
]

// Systems Engineer path: 12 weeks for IT / infrastructure / sysadmin / cloud-ops roles.
export const SYSTEMS_PLAN_WEEKS = [
  { title: 'How computers & operating systems work', focus: 'Hardware, boot process, processes, memory, file systems. Install a Linux VM (or use a free browser lab).', modules: ['linux/01-os-hardware-fundamentals'] },
  { title: 'Linux essentials', focus: 'Shell, files, permissions, users, packages. Practise daily in a terminal.', modules: ['linux/02-linux-essentials'] },
  { title: 'Networking fundamentals', focus: 'OSI/TCP-IP, IP addressing and subnetting by hand, routing, switching, VLANs.', modules: ['networking/01-networking-fundamentals'] },
  { title: 'Linux administration', focus: 'systemd services, logs, storage/LVM, scheduling, SSH, web servers.', modules: ['linux/03-linux-admin-services-storage'] },
  { title: 'Network services & security', focus: 'DNS, DHCP, NAT, firewalls, VPN, TLS/PKI, proxies and load balancers.', modules: ['networking/02-network-services-security'] },
  { title: 'Scripting & automation', focus: 'Bash scripts with error handling, cron, Ansible playbooks; Git for your scripts.', modules: ['linux/04-bash-scripting-automation', 'git/01-git-internals'] },
  { title: 'Windows Server & Active Directory', focus: 'AD DS, GPOs, DNS/DHCP on Windows, PowerShell, Entra ID (Azure AD).', modules: ['infra/01-windows-server-active-directory'] },
  { title: 'Virtualization, storage, backup & DR', focus: 'Hypervisors, RAID, SAN/NAS, snapshots vs backups, 3-2-1, RPO/RTO.', modules: ['infra/02-virtualization-storage-backup-dr'] },
  { title: 'Cloud infrastructure & containers', focus: 'AWS/Azure core services, IAM, VPC networking; Docker basics.', modules: ['infra/03-cloud-infrastructure-aws-azure', 'devops/02-docker'] },
  { title: 'Security & identity', focus: 'Hardening, patching, least privilege, MFA, PKI, logging/SIEM, incident response.', modules: ['itops/01-security-hardening-identity'] },
  { title: 'Troubleshooting & operations', focus: 'Network and performance troubleshooting, monitoring, ITIL incident/change/problem management.', modules: ['networking/03-network-troubleshooting', 'linux/05-linux-performance-troubleshooting', 'itops/02-monitoring-itil-incident-management'] },
  { title: 'Interview mode', focus: 'Scenario drills, behavioral stories, resume; mock troubleshooting interviews with a friend.', modules: ['itops/03-systems-engineer-interview-playbook', 'interview/02-behavioral-leadership', 'interview/03-process-resume-negotiation'] },
]

export const PLANS = [
  { id: 'java', name: 'Java Full-Stack · 20 weeks', weeks: PLAN_WEEKS },
  { id: 'ai', name: 'AI Engineer · 10 weeks', weeks: AI_PLAN_WEEKS },
  { id: 'systems', name: 'Systems Engineer · 12 weeks', weeks: SYSTEMS_PLAN_WEEKS },
]
