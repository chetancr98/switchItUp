---
title: The FAANG Hiring Process, Resume, Referrals & Negotiating 30–45 LPA
level: 5
tags: resume, negotiation, process, compensation
---
<!-- deepened -->

## Start here: the basics

### How hiring works at big tech (simplified)
1. **Application / referral** → recruiter screens your resume.
2. **Online assessment or phone screen** — 1–2 coding problems.
3. **Onsite / virtual loop** — 4–5 interviews: coding, system design (for experienced), LLD/machine coding (many Indian product companies), behavioral.
4. **Debrief / hiring committee** decides hire/no-hire and **level**.
5. **Team match** (Google) and **offer**.
6. **Negotiation** → acceptance → background check → joining.

### Your resume in one rule
Every bullet should show **impact**, not just tasks: "**Reduced** API latency by **60%** by **adding Redis caching and fixing N+1 queries**" beats "Worked on APIs using Spring Boot".

### Referrals matter
A referral from an employee often gets your resume actually read. Ask people you know (ex-colleagues, college seniors) with a short message, your resume and the job link.

### Offer basics
Big-tech offers in India usually contain **base salary**, **joining bonus**, **annual bonus**, and **stock (RSUs)** that vest over years. Compare offers by total value per year, not just base.

---

## Typical loops (India, SDE-2 / Senior level)

| Company | Rounds (typical) | Notes |
|---|---|---|
| **Google** | Recruiter → 1 phone/online coding → onsite 4–5: 3 coding (+ 1 design for L4+/L5) + Googleyness | Hiring committee + team match after; level decided by HC |
| **Microsoft** | Online assessment / phone → 4–5 rounds: coding, LLD/HLD, AA (senior manager) | Team-specific hiring; often faster |
| **Amazon** | OA (2 coding + work-style) → loop 4–5: coding + LLD + HLD + LPs in **every** round, one Bar Raiser | LPs heavily weighted |
| **Meta** | Screen → 2 coding + 1 system design (product or infra) + behavioral | Speed: 2 problems in 40 min |
| Indian product cos (Flipkart, Uber, Atlassian, PhonePe, Swiggy, Razorpay…) | DSA + **machine coding** + HLD + hiring manager | Machine coding is decisive |

Timeline: 3–8 weeks from first call to offer. Schedule **practice companies first**, target companies 2–3 weeks later, and try to cluster final rounds so offers overlap (leverage).

## Resume — one page, impact-first

### Structure
1. Header: name, phone, email, LinkedIn, GitHub (if strong), location.
2. **Experience** (reverse chronological) — 4–6 bullets per role.
3. **Skills** (grouped: Languages, Frameworks, Data, Cloud/DevOps).
4. Education; selected achievements (contest ratings, patents, talks, OSS).

### Bullet formula (Google's XYZ)
**Accomplished [X] as measured by [Y], by doing [Z].**

| ❌ Weak | ✅ Strong |
|---|---|
| Worked on order microservice using Spring Boot and Kafka | Cut order-placement p99 latency **62% (850 → 320 ms)** at 4k RPS by replacing synchronous inventory calls with Kafka-driven reservations and a transactional outbox |
| Responsible for CI/CD | Reduced deployment lead time **from 2 days to 25 min** by building a GitHub Actions + Argo CD pipeline with canary analysis for 14 services |
| Fixed bugs and improved performance | Eliminated a recurring **OOM incident (3/month → 0)** by diagnosing a ThreadLocal leak with heap dumps; added leak detection to CI |
| Mentored juniors | Onboarded and mentored **4 engineers**; authored the team's Spring testing guide adopted by 3 teams |

Tips: strong verbs (Designed, Led, Reduced, Migrated, Scaled), numbers in every bullet you can, show **scope** (users, RPS, data size, team size), tailor keywords to the job description (ATS), no photos/objectives/skill-rating bars, PDF, consistent formatting. Every bullet is a potential interview question — be able to go 3 levels deep on each.

## Getting interviews
- **Referrals** have the highest conversion. Ask ex-colleagues/alumni with a short note: role link, 3-line summary, resume. Make it easy.
- Recruiters on LinkedIn: headline with stack + years + "open to SDE-2/Senior roles", keywords in About/Skills, turn on Open to Work (recruiters only).
- Apply directly on careers pages for specific job IDs; follow up.
- Contest ratings and OSS contributions can get you OA invites.

## Compensation structure (how 30–45 LPA is composed)

| Component | Meaning | Watch out for |
|---|---|---|
| **Base salary** | Fixed annual | Determines future hikes; PF computed on part of it |
| **Joining / sign-on bonus** | One-time (sometimes split across year 1–2) | Clawback if you leave within 12 months |
| **Annual performance bonus** | Target % of base (e.g., 10–20%) | Variable — don't count 100% |
| **RSUs / stock** | Granted value in USD vested over 4 years | **Vesting schedule** (Amazon 5/15/40/40 back-loaded — compensated by sign-on in years 1–2; Google now front-loaded/even; Microsoft 25%/yr); stock price & FX swings |
| Relocation, benefits | Insurance, ESPP, learning budget, WFH | Usually not negotiable much |

**Total comp (TC) year-1** = base + bonus target + sign-on + RSU vesting in year 1. Compare offers on **4-year average TC** *and* **year-1 cash**, and also the base (it compounds).

Rough 2025–26 India bands (vary widely by company, location, and negotiation):
- SDE-2 / L4 at FAANG: TC ~35–60 LPA.
- Senior / L5: ~55–90+ LPA.
- Indian unicorns SDE-2/Senior: base often 30–50 LPA with ESOPs (illiquid — value cautiously).
Use levels.fyi, Blind, and AmbitionBox for current data points — figures move every year.

## Negotiation — the playbook

1. **Don't give a number first.** When asked for expected CTC: *"I'm focused on finding the right role; I'm confident we can agree on a number that's competitive for the level. What's the budgeted range?"* If pushed in India (current CTC is commonly asked), state current comp factually and anchor expectations on **market for the level**, not a % hike on current.
2. **Get the level right first** — level determines the band. Negotiating within the wrong level is capped. Ask what level the offer is at and why.
3. **Competing offers are the strongest lever.** Time your loops so offers overlap. Share specifics (company, level, TC breakdown) honestly.
4. **Negotiate total comp across components**: if base is capped by the band, ask for more RSUs or a larger sign-on (especially to offset unvested stock/bonus you're forfeiting).
5. **Be enthusiastic + specific**: *"I'm excited about this team. With the offer from X at ₹48L TC, I'd love to make this work — if you can get to ₹52L, mainly via RSUs, I'm ready to sign."*
6. **Get everything in writing**; clarify joining bonus clawback, RSU grant date/price conversion, notice-period buyout.
7. **Notice period** (often 60–90 days in India): ask whether the new company buys out notice; negotiate early release with your current employer; serving notice while holding offers can lead to counter-offers — decide your walk-away criteria beforehand.
8. Be polite and quick; never lie about offers; don't accept and renege.

## The last 2 weeks before onsite
- Company-tagged LeetCode (last 6 months), 2/day timed.
- 2 mock system designs aloud; re-read the case studies in this app.
- Re-read your **Revise** list and your story bank.
- Logistics: quiet room, stable internet, IDE/whiteboard tool practice (Google uses a plain doc — practise coding without autocomplete!).
- Sleep. Performance under pressure drops sharply when tired.

## Interview day checklist
- [ ] Clarify before coding; state approach and complexity first
- [ ] Think aloud; check in with the interviewer
- [ ] Test with examples and edge cases before saying "done"
- [ ] For design: requirements → estimates → API → data → HLD → deep dives → trade-offs
- [ ] For behavioral: STAR, "I", numbers, reflection
- [ ] Ask 1–2 thoughtful questions at the end
- [ ] Note what went well/poorly right after each round (for the next loop)

## Questions asked at top companies

<details><summary>Walk me through your resume. <em>· all</em></summary>

Reverse chronological, 1–2 minutes, emphasising scope and impact; be ready to deep-dive any bullet — never list a technology you can't discuss.
</details>

<details><summary>What is your expected CTC? <em>· recruiters at all Indian companies</em></summary>

Defer if possible and ask for the band; if pushed, give a researched range anchored on market data for the level (levels.fyi/AmbitionBox), not just a % hike on current.
</details>

<details><summary>What is your notice period and can you join earlier? <em>· all Indian companies</em></summary>

State it honestly; mention buyout possibility or negotiation for early release; it can affect offer timing and joining bonus.
</details>

<details><summary>Do you have other offers? <em>· recruiters during negotiation</em></summary>

Share truthfully (company, level, components) if you have them; competing offers are the strongest negotiation lever; never fabricate.
</details>

<details><summary>Why should we hire you? <em>· HR rounds</em></summary>

Connect 2–3 specific strengths with evidence to the role's needs; end with motivation for the team's problem space.
</details>

<details><summary>Where do you see yourself in 5 years? <em>· HR rounds</em></summary>

Growth aligned with the company: deeper technical ownership (senior/staff path) or leadership; show commitment and learning goals.
</details>

<details><summary>Questions to ask the interviewer? <em>· end of every round</em></summary>

Team challenges, success metrics for the role, on-call and incidents, how decisions are made, growth paths.
</details>

## End-to-end scenarios

<details><summary>Scenario: You have two offers — Company A: ₹32L base + ₹5L joining + RSUs ₹40L over 4 years (back-loaded); Company B: ₹38L base + ₹3L bonus + no stock. Compare.</summary>

Year-1 cash: A ≈ 32 + 5 + RSU year-1 vest (e.g., 5% → ₹2L) = ₹39L; B ≈ 38 + 3 = ₹41L. 4-year average: A ≈ 32 + 10 (RSU avg) + 1.25 (joining spread) ≈ ₹43L/yr (subject to stock price/FX); B ≈ ₹41L/yr (plus hikes on higher base). Also weigh: base compounds with raises, stock risk, growth/learning, team, brand, location. Then negotiate A for more year-1 cash using B.
</details>

<details><summary>Scenario: Rewrite this bullet: "Worked on microservices using Spring Boot, Kafka and Docker."</summary>

"Designed and built 3 Spring Boot microservices for order fulfilment handling 2M orders/day, introducing Kafka-based async processing with a transactional outbox that eliminated lost order events and cut checkout latency by 45%." — action verb, scope, technology in context, measurable result.
</details>
