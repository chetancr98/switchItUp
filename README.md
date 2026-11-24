# SwitchItUp — FAANG Prep Roadmap

A level-based, in-depth knowledge base for Java full-stack engineers preparing for SDE-2 / Senior interviews (30–45 LPA band).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (open with any static server)
```

## How it's organised

- **5 levels** (Foundations → Core → Advanced → Production & Scale → FAANG Mastery) cut across
- **12 tracks**: Core Java, Spring Boot, SQL & Databases, React & JS, Microservices, CI/CD & Deployments, Git & GitHub, System Design, DSA, Competitive Programming, Coding Q&A, Interview Playbook.
- Every module: a beginner "Start here" section → deep dive → quick checks → questions frequently reported at top companies → end-to-end scenarios.
- A 20-week plan (week-by-week module list), study dashboard with streaks and activity heatmap, Pomodoro timer, focus mode (`F`), and reading settings (Light/Sepia/Dark, serif/sans, size, width — the `Aa` button).
- No backend or database: progress, notes, study time and bookmarks are stored in your browser's localStorage. Back them up with Export/Import (Aa → Export / import progress).

## Adding or editing content

Content is plain Markdown in `src/content/<track>/NN-slug.md`:

```markdown
---
title: My New Module
level: 3            # 1–5
minutes: 40         # optional; estimated from word count otherwise
---

## Section
...
<details><summary>Interview question?</summary>

Answer in **markdown** (keep the blank line after </summary>).
</details>
```

New files appear automatically (Vite `import.meta.glob`). Tracks and levels are defined in `src/data/tracks.js`. The study plan lives in `src/content/_pages/study-plan.md`.
