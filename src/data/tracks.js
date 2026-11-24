// Tracks = subject areas. Levels = depth tiers that cut across every track.
// Each markdown file in src/content/<trackId>/ declares its own `level` in frontmatter.

export const LEVELS = [
  {
    n: 1,
    name: 'Foundations',
    tagline: 'Know the machine you stand on',
    goal: 'Rock-solid internals of the tools you use daily: JVM, collections, Git objects, complexity analysis, rendering model. Interviewers probe these in the first 10 minutes to calibrate you.',
  },
  {
    n: 2,
    name: 'Core Engineering',
    tagline: 'Write code a senior would approve',
    goal: 'Concurrency, Spring internals, hooks, Docker, core DSA patterns. This is the bar for SDE-2 at any product company.',
  },
  {
    n: 3,
    name: 'Advanced',
    tagline: 'Reason about failure, scale and trade-offs',
    goal: 'Transactions, security, distributed data patterns, Kubernetes, graphs & DP. You start answering "it depends" — and then saying exactly on what.',
  },
  {
    n: 4,
    name: 'Production & Scale',
    tagline: 'Systems that survive real traffic',
    goal: 'Distributed systems theory, deployment strategies, observability, GC tuning, advanced data structures. The difference between SDE-2 and Senior.',
  },
  {
    n: 5,
    name: 'FAANG Mastery',
    tagline: 'Perform under interview pressure',
    goal: 'End-to-end system design case studies, contest-grade problem solving, LLD rounds, behavioral stories and negotiation. Converting knowledge into offers.',
  },
]

export const TRACKS = [
  { id: 'java', name: 'Core Java', icon: '☕', color: '#e76f00', desc: 'JVM, memory, collections internals, concurrency, GC, modern Java (8 → 21).' },
  { id: 'spring', name: 'Spring Boot', icon: '🌱', color: '#6db33f', desc: 'IoC internals, auto-config, MVC lifecycle, JPA/Hibernate, transactions, security, testing.' },
  { id: 'sql', name: 'SQL & Databases', icon: '🗄️', color: '#2563eb', desc: 'Queries from zero, joins, window functions, indexes, query plans, normalization, transactions.' },
  { id: 'react', name: 'React & JavaScript', icon: '⚛️', color: '#149eca', desc: 'JS engine, rendering & reconciliation, hooks, state, performance, React 18/19.' },
  { id: 'microservices', name: 'Microservices', icon: '🧩', color: '#8b5cf6', desc: 'Decomposition, communication, resilience, sagas/outbox, observability.' },
  { id: 'devops', name: 'CI/CD & Deployments', icon: '🚢', color: '#0ea5e9', desc: 'Pipelines, Docker, Kubernetes, release strategies, cloud & IaC.' },
  { id: 'git', name: 'Git & GitHub', icon: '🌿', color: '#f05032', desc: 'Object model, rebase/merge mastery, recovery, team workflows.' },
  { id: 'system-design', name: 'System Design', icon: '🏗️', color: '#db2777', desc: 'Estimation, building blocks, data at scale, distributed systems, full case studies.' },
  { id: 'dsa', name: 'Data Structures & Algorithms', icon: '🧠', color: '#16a34a', desc: 'Pattern-based DSA with Java templates — every pattern FAANG asks.' },
  { id: 'cp', name: 'Competitive Programming', icon: '⚡', color: '#eab308', desc: 'Fast I/O, number theory, advanced techniques, contest strategy.' },
  { id: 'coding', name: 'Coding Q&A', icon: '💻', color: '#0d9488', desc: 'Frequently asked coding questions with full Java/SQL/JS solutions and explanations.' },
  { id: 'python', name: 'Python for AI', icon: '🐍', color: '#3776ab', desc: 'Python from zero for Java developers: idioms, typing, async, FastAPI, NumPy & pandas.' },
  { id: 'ai', name: 'AI & LLM Foundations', icon: '🧬', color: '#c026d3', desc: 'ML from scratch, neural networks, transformers, embeddings & RAG, prompting and evals.' },
  { id: 'agents', name: 'Building AI Agents', icon: '🤖', color: '#ea580c', desc: 'Agent loops and tool use with the Claude API, MCP, memory, multi-agent, production & AI system design.' },
  { id: 'interview', name: 'Interview Playbook', icon: '🎯', color: '#64748b', desc: 'Hiring process, LLD round, behavioral (STAR), resume and negotiation.' },
]

export const trackById = Object.fromEntries(TRACKS.map((t) => [t.id, t]))

// Learning paths filter the roadmap and track list on the home page.
export const PATHS = [
  { id: 'all', name: 'Everything', icon: '🧭', desc: 'Every track — full-stack engineering plus AI engineering.' },
  {
    id: 'java', name: 'Java Full-Stack', icon: '☕', desc: 'Product-company SDE-2 / Senior loops: Java, Spring, React, distributed systems.',
    tracks: ['java', 'spring', 'sql', 'react', 'microservices', 'devops', 'git', 'system-design', 'dsa', 'cp', 'coding', 'interview'],
  },
  {
    id: 'ai', name: 'AI Engineer', icon: '🤖', desc: 'Build LLM apps and agents: Python, ML/LLM foundations, RAG, agents, AI system design.',
    tracks: ['python', 'ai', 'agents', 'sql', 'system-design', 'dsa', 'coding', 'git', 'devops', 'interview'],
  },
]
export const pathById = Object.fromEntries(PATHS.map((p) => [p.id, p]))
