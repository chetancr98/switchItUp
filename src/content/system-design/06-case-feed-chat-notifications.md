---
title: Case Studies II — News Feed, Chat (WhatsApp) & Notification System
level: 5
tags: case study, news feed, chat, notifications, fan-out
---
<!-- deepened -->

## Start here: the basics

### News feed — the core question
When you open Instagram, how does the app quickly show recent posts from the hundreds of accounts you follow? Two options:
- **Build it when you open the app** ("pull"): fetch recent posts from everyone you follow and merge them. Slow for the reader.
- **Build it in advance** ("push"): when someone posts, add the post to every follower's ready-made feed. Fast for the reader, expensive for people with millions of followers.
Real systems mix both.

### Chat — the core question
How does a message from Riya's phone appear on Arjun's phone within a second? Both phones keep an **open connection** (WebSocket) to chat servers. Riya's server stores the message, finds which server Arjun is connected to, and pushes it there. If Arjun is offline, the message waits in storage and he gets a push notification.

### Notifications — the core question
Many services want to notify users (order shipped, OTP, offers) through different channels (push, SMS, email). A central notification service takes requests, checks user preferences, renders templates and sends through providers, with retries — without spamming users.

---

# Case 1 — News feed (Twitter/Instagram home timeline)

## Requirements
Post (text/media); follow users; home feed of followed users' posts, reverse-chronological or ranked; low latency feed load (< 200 ms); 300M DAU; eventual consistency OK (a post appearing a few seconds late is fine).

## Estimates
- 300M DAU × 2 posts/day ≈ 600M posts/day ≈ 7k writes/s.
- 300M × 20 feed loads/day ≈ 6B/day ≈ 70k reads/s (peak 200k).
- Average 200 followers; celebrities with 100M+.

## The core decision: fan-out on write vs read

| | **Fan-out on write (push)** | **Fan-out on read (pull)** |
|---|---|---|
| How | On post, insert post id into each follower's precomputed feed (Redis list) | On feed load, fetch recent posts of everyone you follow and merge |
| Read | O(1) — read your list | Expensive: N followees × query + merge |
| Write | O(followers) — 100M writes for a celebrity! | O(1) |
| Good for | Normal users | Celebrities, inactive users |

**Hybrid (what Twitter did)**: push for normal authors; for celebrities (> ~10k–100k followers), **don't fan out** — at read time, merge the precomputed feed with recent posts from the few celebrities the user follows. Skip fan-out to inactive users (build their feed on demand when they return).

## Design
```
Post ─► Post Service ─► Posts DB (sharded by post_id; media in S3+CDN)
                     └► Kafka "post-created" ─► Fan-out workers
                                                  ├ read follower list (Graph service, sharded by user_id)
                                                  └ LPUSH post_id to feed:{follower} in Redis, LTRIM to 800
Feed read ─► Feed Service ─► Redis feed:{me} (ids) + celebrity posts merge ─► hydrate posts (cache by id)
                          └► Ranking service (optional ML scoring) ─► response with cursor
```
Deep dives:
- **Store ids, not posts** in feed lists; hydrate from a post cache (multi-get) → edits/deletes propagate naturally.
- **Pagination**: cursor = last post id / score; feeds change while scrolling.
- **Ranking**: candidate generation (recent posts from followees + recommendations) → feature fetch → model scoring → diversity rules. Mention it, don't drown in ML.
- **Counts** (likes): don't `UPDATE posts SET likes = likes+1` per like on hot posts — aggregate via Kafka + periodic flush, sharded counters, approximate display.
- **Deletes/privacy**: filter at read time too (blocked users, deleted posts).
- **Hot posts**: cache them in local L1 caches.

---

# Case 2 — Chat system (WhatsApp / Messenger)

## Requirements
1:1 and group chat (≤ 500 members), online presence, delivery receipts (sent ✓, delivered ✓✓, read 🔵), offline delivery, message history, multi-device, media; 500M DAU, 50B messages/day; low latency (< 300 ms in region); messages must not be lost and should be ordered per conversation.

## Estimates
50B/day ≈ 600k messages/s avg (peak 1–2M). 100 B/msg → 5 TB/day.

## Connection layer
- Clients keep a persistent **WebSocket** (or MQTT, as WhatsApp used XMPP-derived protocol) to a **chat gateway** server. Each gateway holds ~100k–1M connections (epoll/Netty; virtual threads in Java).
- **Session registry**: `user_id/device_id → gateway_id` in Redis (with TTL heartbeats).

## Message flow (1:1)
```
A ─ws─► Gateway-1 ─► Chat Service:
                      1. assign message_id (Snowflake / per-conversation sequence)
                      2. persist to Messages store (Cassandra: PK (conversation_id), clustering message_id)
                      3. ack "sent ✓" to A
                      4. lookup B's devices in session registry
                         ├ online → route via pub/sub / direct RPC to Gateway-7 ─ws─► B ; B acks → "delivered ✓✓" to A
                         └ offline → push notification (APNs/FCM) + store in B's inbox until next connect (sync on reconnect)
```
- **Ordering**: per-conversation monotonically increasing sequence (assigned by the single owner shard of that conversation) — clients sort/dedupe by it. Don't rely on client timestamps.
- **Delivery guarantee**: at-least-once with client-generated **message ids for dedupe** (client retries after reconnect won't duplicate).
- **Sync on reconnect**: client sends last seen sequence per conversation; server returns the gap.
- **Group chat**: fan-out on write to members' inboxes for small groups; for big groups/channels, store once and members pull. Group membership service.
- **Presence**: heartbeats → Redis with TTL; publish presence changes only to contacts who are online and subscribed (lazy), throttle updates — presence fan-out is surprisingly expensive.
- **Read receipts**: just another small message type flowing back.
- **Media**: upload to object storage via pre-signed URL, send a message containing the reference; thumbnails inline.
- **E2E encryption** (Signal protocol): server only routes ciphertext; multi-device means encrypting per device.
- **Storage**: Cassandra/HBase/ScyllaDB — write-heavy, partition by conversation, time-ordered clustering; old messages to cold storage (or device-only storage like WhatsApp).

---

# Case 3 — Notification system

## Requirements
Send notifications via push (APNs/FCM), SMS, email, in-app; triggered by many services; user preferences & opt-outs; templates & localisation; rate limits per user; scheduling; retries; at-least-once with dedupe; analytics (delivered/opened). Millions per minute during campaigns.

## Design
```
Producers (order svc, marketing, ...) ─► Notification API (validate, idempotency key)
     ─► Kafka topics by priority (transactional > marketing)
     ─► Orchestrator workers:
          - load user prefs & contact info (cache)
          - check opt-out, quiet hours, frequency caps (Redis counters)
          - render template (i18n)
          - dedupe (notification_id in Redis/DB)
     ─► per-channel queues ─► channel workers ─► APNs / FCM / SMS provider (Twilio) / Email (SES)
                                   └ retries with backoff, DLQ, provider failover, rate limiting to provider quotas
     ─► status events ─► Notification log DB (Cassandra) ─► analytics
```
Deep dives:
- **Priority isolation**: OTPs must never queue behind a 50M-user marketing blast → separate topics/consumer pools.
- **Provider limits & failover**: token buckets per provider; second SMS vendor.
- **Exactly-once illusion**: idempotency key per notification + dedupe store; providers may still double-deliver rarely — accept.
- **Scheduling**: delayed delivery via a time-bucketed store / delay queue; time-zone aware sends.
- **Device tokens**: invalidate tokens on provider feedback (unregistered).

## Quick check questions

<details><summary>1. How do you handle a celebrity with 50M followers posting in a push-based feed?</summary>

Don't fan out their posts. Mark them as "pulled" authors; at read time merge their recent posts (cached heavily, as everyone reads them) into each follower's precomputed feed. This caps write amplification while keeping reads fast.
</details>

<details><summary>2. How does a chat message reach a user connected to a different server?</summary>

The sender's gateway hands the message to the chat service, which persists it, looks up the recipient's gateway in the session registry, and routes it (direct RPC or pub/sub channel per gateway). The recipient's gateway pushes it down the WebSocket. If offline, it's stored for sync and a push notification is sent.
</details>

<details><summary>3. How do you guarantee message ordering in a conversation?</summary>

Single writer per conversation (partition by conversation id) assigns monotonically increasing sequence numbers at persist time; clients order and dedupe by sequence and fill gaps by syncing from the server. Client clocks are never trusted for order.
</details>

<details><summary>4. A marketing campaign delays OTP SMS by 10 minutes. Fix the design.</summary>

Separate priority lanes end to end: different Kafka topics, dedicated consumer pools and provider rate-limit budgets for transactional messages; admission control on bulk campaigns (throttled sends), and monitoring of OTP latency SLO.
</details>

## Questions asked at top companies

<details><summary>Design Twitter / Instagram news feed. <em>· Meta, Google, Amazon, Microsoft</em></summary>

Post service, follow graph, fan-out workers (push for normal users, pull for celebrities — hybrid), feed cache (ids in Redis lists), post hydration cache, ranking, cursor pagination, media via CDN.
</details>

<details><summary>Fan-out on write vs fan-out on read. <em>· Meta, LinkedIn, Twitter-style at many</em></summary>

Write: precompute feeds at post time — fast reads, heavy writes for big audiences. Read: compute at read time — cheap writes, expensive reads. Hybrid uses both based on follower count/activity.
</details>

<details><summary>Design WhatsApp / a chat system. <em>· Amazon, Microsoft, Uber, Meta</em></summary>

WebSocket gateways, session registry, chat service persisting to wide-column store, per-conversation sequence ordering, delivery/read receipts, offline sync, push notifications, group fan-out, presence, media via object storage, E2E encryption.
</details>

<details><summary>How do you implement online/offline presence at scale? <em>· Meta, Microsoft</em></summary>

Heartbeats with TTL in Redis; publish changes only to interested online contacts; batch/throttle updates; last-seen timestamps; tolerate slight staleness.
</details>

<details><summary>How do you guarantee message ordering and no duplicates in chat? <em>· Uber, Microsoft</em></summary>

Server-assigned per-conversation sequence numbers; client-generated message ids for dedupe on retry; clients sort by sequence and request gaps on reconnect.
</details>

<details><summary>Design a notification system. <em>· Amazon, Swiggy, Flipkart, PhonePe</em></summary>

API with idempotency, Kafka by priority, preference/opt-out & rate-limit checks, templating, channel workers to APNs/FCM/SMS/email providers with retries, DLQ, failover, status tracking, analytics.
</details>

<details><summary>How would you rank a feed? <em>· Meta, LinkedIn</em></summary>

Candidate generation (followed posts + recommendations), feature extraction (recency, engagement, affinity), ML model scoring, business rules (diversity, freshness), caching of ranked results.
</details>

<details><summary>How do you count likes on a viral post efficiently? <em>· Meta, Instagram-style</em></summary>

Buffer like events (Kafka), aggregate and flush counts periodically, sharded counters for hot posts, show approximate counts, keep per-user like records for idempotency.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design a live comments feature for a cricket match streaming to 20 million viewers.</summary>

Viewers can't each receive every comment (too many) — sample/rate-limit displayed comments per client. Comments posted via API → moderation filter → Kafka topic per match partitioned; fan-out tier of WebSocket/SSE edge servers subscribes and pushes a throttled stream (e.g., 10 comments/s) to connected clients; reactions aggregated into counts every second; CDN-like edge distribution; backpressure and degradation (drop comments, keep reactions) under load.
</details>

<details><summary>Scenario: Users complain about receiving the same push notification 3 times. Find and fix.</summary>

Likely at-least-once retries without dedupe: producer retried after timeout, consumer reprocessed after rebalance, or multiple device tokens for the same device. Add notification idempotency keys checked in a dedupe store before sending, record provider message ids, collapse keys (APNs/FCM `collapse_key`/`apns-collapse-id`), clean up stale device tokens, and alert on duplicate rates.
</details>
