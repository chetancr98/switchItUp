---
title: Low-Level Design (LLD) & Machine Coding Rounds — with Full Case Studies
level: 5
tags: lld, machine coding, object oriented design, parking lot
---
<!-- deepened -->

## Start here: the basics

### What is Low-Level Design (LLD)?
High-level design is boxes and arrows across servers. **Low-level design** zooms into one component: which **classes**, their **fields and methods**, how they **interact**, and how you'd **extend** them. In a machine coding round you actually write that code — working and runnable — in 60–120 minutes.

### A 5-step recipe you can use for any LLD problem
1. **List requirements** — what must it do? (and what's out of scope)
2. **Find nouns → classes**: ParkingLot, Floor, Spot, Vehicle, Ticket.
3. **Find verbs → methods**: park(), unpark(), calculateFee().
4. **Find what may change → interfaces**: pricing rules, spot allocation → Strategy pattern.
5. **Write a driver (`main`)** that demonstrates the flows, then refine.

### Example — the smallest version of a parking lot
```java
enum VehicleType { BIKE, CAR }
record Vehicle(String number, VehicleType type) {}
class Spot { final int id; final VehicleType type; Vehicle parked; Spot(int id, VehicleType t) { this.id = id; this.type = t; } }

class ParkingLot {
    private final List<Spot> spots;
    ParkingLot(List<Spot> spots) { this.spots = spots; }
    Optional<Spot> park(Vehicle v) {
        for (Spot s : spots) if (s.parked == null && s.type == v.type()) { s.parked = v; return Optional.of(s); }
        return Optional.empty();
    }
    void leave(Spot s) { s.parked = null; }
}
```
The module below grows this into an interview-grade design.

### What interviewers look for
Readable names, small classes with clear responsibilities, interfaces at variation points, correct handling of edge cases, thread-safety where needed, and code that **runs**.

---

## What's evaluated
Amazon, Uber, Flipkart, Swiggy, PhonePe, Atlassian, Microsoft and many Indian product companies run a **90–120 min machine coding** or **45 min OOD** round. Signals:
1. **Requirements clarity** — you scope it before coding.
2. **Entities & responsibilities** — clean classes, SRP, no god class.
3. **Extensibility** — new vehicle type / payment method / pricing rule without editing existing code (OCP via strategy/factory).
4. **Correctness under concurrency** where relevant (booking, inventory).
5. **Working, runnable code** with a driver/demo and ideally tests. Running code beats perfect diagrams.
6. Naming, packages, exceptions, immutability.

## Approach (60–90 min)
1. **Clarify (5 min)**: features in/out, scale, concurrency, persistence (in-memory is fine usually).
2. **Entities & relationships (10 min)**: nouns → classes, verbs → methods. Draw a quick class diagram.
3. **Identify variation points** → interfaces (strategy) + factories.
4. **Code core flow first**, then extras. Keep `main` runnable throughout.
5. Mention what you'd add: persistence, tests, thread-safety, observability.

Layering that interviewers like:
```
model/        (entities, value objects, enums)
repository/   (in-memory maps behind interfaces)
service/      (business logic, orchestrates)
strategy/     (pricing, allocation, payment)
exception/
Main/Driver   (demo scenarios)
```

---

## Case 1 — Parking lot

**Requirements**: multiple floors; spot types (MOTORBIKE, COMPACT, LARGE, EV); vehicles park in the smallest fitting spot; tickets on entry; fee on exit by duration & vehicle type (pricing strategy); display free spots per floor; multiple entry gates (concurrency).

```java
enum VehicleType { BIKE, CAR, TRUCK }
enum SpotType { SMALL, MEDIUM, LARGE;
    boolean fits(VehicleType v) {
        return switch (this) { case SMALL -> v == VehicleType.BIKE; case MEDIUM -> v != VehicleType.TRUCK; case LARGE -> true; };
    }
}
record Vehicle(String plate, VehicleType type) {}

final class Spot {
    private final String id; private final SpotType type; private Vehicle parked;
    Spot(String id, SpotType type) { this.id = id; this.type = type; }
    boolean isFree() { return parked == null; }
    void park(Vehicle v) { if (!isFree()) throw new IllegalStateException(id + " occupied"); parked = v; }
    void release() { parked = null; }
    SpotType type() { return type; } String id() { return id; }
}

record Ticket(String id, Vehicle vehicle, Spot spot, Instant entry) {}

interface SpotAllocationStrategy { Optional<Spot> find(List<Floor> floors, Vehicle v); }
interface PricingStrategy { Money price(Ticket t, Instant exit); }

final class Floor {
    private final int number;
    private final Map<SpotType, Deque<Spot>> free = new EnumMap<>(SpotType.class);
    Floor(int number, List<Spot> spots) {
        this.number = number;
        for (SpotType t : SpotType.values()) free.put(t, new ArrayDeque<>());
        spots.forEach(s -> free.get(s.type()).add(s));
    }
    synchronized Optional<Spot> take(VehicleType v) {          // smallest fitting spot on this floor
        for (SpotType t : SpotType.values())
            if (t.fits(v) && !free.get(t).isEmpty()) return Optional.of(free.get(t).poll());
        return Optional.empty();
    }
    synchronized void giveBack(Spot s) { free.get(s.type()).add(s); }
    synchronized Map<SpotType, Integer> availability() {
        Map<SpotType, Integer> m = new EnumMap<>(SpotType.class); free.forEach((k, v) -> m.put(k, v.size())); return m;
    }
}

final class ParkingLot {
    private final List<Floor> floors;
    private final PricingStrategy pricing;
    private final Map<String, Ticket> active = new ConcurrentHashMap<>();
    private final Map<Spot, Floor> floorOf = new ConcurrentHashMap<>();
    private final AtomicLong seq = new AtomicLong();

    ParkingLot(List<Floor> floors, PricingStrategy pricing) { this.floors = floors; this.pricing = pricing; }

    Ticket enter(Vehicle v) {
        for (Floor f : floors) {
            Optional<Spot> s = f.take(v.type());
            if (s.isPresent()) {
                Spot spot = s.get(); spot.park(v); floorOf.put(spot, f);
                Ticket t = new Ticket("T" + seq.incrementAndGet(), v, spot, Instant.now());
                active.put(t.id(), t);
                return t;
            }
        }
        throw new ParkingFullException(v.type());
    }

    Money exit(String ticketId) {
        Ticket t = Optional.ofNullable(active.remove(ticketId)).orElseThrow(() -> new InvalidTicketException(ticketId));
        t.spot().release();
        floorOf.remove(t.spot()).giveBack(t.spot());
        return pricing.price(t, Instant.now());
    }
}

final class HourlyPricing implements PricingStrategy {
    private final Map<VehicleType, Money> perHour;
    HourlyPricing(Map<VehicleType, Money> perHour) { this.perHour = perHour; }
    public Money price(Ticket t, Instant exit) {
        long hours = Math.max(1, (Duration.between(t.entry(), exit).toMinutes() + 59) / 60);
        return perHour.get(t.vehicle().type()).times(hours);
    }
}
```
Discussion points: per-floor locks (finer than a global lock); strategy for allocation (nearest to gate, EV-first); observer for display boards; payment as another strategy; persistence via repository interfaces.

---

## Case 2 — Splitwise (expense sharing)

**Requirements**: users, groups; add expense with split types EQUAL / EXACT / PERCENT; show balances; simplify debts.

Key design:
```java
sealed interface Split permits EqualSplit, ExactSplit, PercentSplit { String userId(); }
interface SplitStrategy { Map<String, Money> compute(Money total, List<Split> splits); }   // validates & computes shares
// Factory picks the strategy by ExpenseType

final class BalanceSheet {               // balances.get(a).get(b) > 0 means b owes a
    private final Map<String, Map<String, Long>> balances = new HashMap<>();
    void record(String paidBy, Map<String, Money> shares) { ... both directions ... }
}
```
- Money in **minor units (long paise)**, never double. EQUAL split remainder: distribute leftover paise deterministically.
- **Simplify debts**: compute net balance per user; repeatedly match the largest creditor with the largest debtor (two heaps) → at most n−1 transactions (min-transactions exactly is NP-hard; LC 465 backtracking for small n).

---

## Case 3 — BookMyShow / movie ticket booking

Entities: City, Theatre, Screen, Seat (type, price tier), Movie, Show (movie + screen + time), ShowSeat (state: AVAILABLE / LOCKED / BOOKED), Booking, Payment.

The deep dive is **concurrent seat booking**:
- Seat hold with TTL: `ShowSeat` row state transition `AVAILABLE → LOCKED(userId, until)` via conditional update (`UPDATE ... WHERE status='AVAILABLE'` — all seats in one transaction, or fail all).
- In-memory version: per-show lock or `ConcurrentHashMap.compute` on seat ids, lock seats in sorted order to avoid deadlock.
- Payment success → `BOOKED`; failure/timeout → release (scheduled expiry).
- Idempotent booking confirmation.

```java
interface SeatLockProvider {
    void lock(Show show, List<Seat> seats, String user);   // throws SeatUnavailableException
    void unlock(Show show, List<Seat> seats, String user);
    boolean validate(Show show, Seat seat, String user);
}
final class InMemorySeatLockProvider implements SeatLockProvider {
    private final Duration ttl;
    private final Map<Show, Map<Seat, SeatLock>> locks = new ConcurrentHashMap<>();
    public synchronized void lock(Show show, List<Seat> seats, String user) {   // coarse but correct; refine per show
        Map<Seat, SeatLock> m = locks.computeIfAbsent(show, s -> new HashMap<>());
        for (Seat s : seats) { SeatLock l = m.get(s); if (l != null && !l.expired()) throw new SeatUnavailableException(s); }
        Instant until = Instant.now().plus(ttl);
        seats.forEach(s -> m.put(s, new SeatLock(user, until)));
    }
    ...
}
```

---

## Case 4 — Rate limiter / Cache / Logger (smaller OOD prompts)
- **LRU/LFU cache** with eviction policy as a strategy (`EvictionPolicy<K>`: `keyAccessed`, `evictKey`) and storage as an interface.
- **Rate limiter** library: `RateLimiter` interface; TokenBucket / SlidingWindow implementations; per-client registry; config.
- **Logger**: levels, appenders (console/file) as chain of responsibility or observers, formatter strategy, async queue.

## Case 5 — Elevator system
Entities: Elevator (state: IDLE/MOVING_UP/MOVING_DOWN, current floor, request queues), Request (floor, direction), Controller/Dispatcher.
- Scheduling strategy (interface): **SCAN/LOOK** (serve all requests in current direction, then reverse) vs nearest-car; pluggable.
- Elevator runs in its own thread consuming a `PriorityQueue` up-set and down-set (TreeSets).
- State pattern for elevator states; observer for floor displays.

## More prompts to practise (each 90 min, timed)
Snake & Ladder · Tic-Tac-Toe/Chess (move validation per piece = polymorphism) · Vending machine (State pattern) · Library management · Food delivery (order state machine, delivery partner assignment strategy) · Ride sharing (matching strategy) · Inventory/order management · Hotel booking · Meeting room scheduler · Pub-sub message queue (in-memory topics, consumer offsets, thread pools) · Distributed-ish key-value store with TTL · Task scheduler (cron-like with `DelayQueue`) · Digital wallet (ledger, idempotent transfers, lock ordering).

## Quick check questions

<details><summary>1. How do you make your parking lot design extensible for a new vehicle type?</summary>

Vehicle and spot compatibility is data/strategy-driven (enum with `fits` or a compatibility matrix), pricing is a `PricingStrategy` keyed by type, allocation is a strategy. Adding a type = new enum constant + pricing config; no changes to ParkingLot's flow.
</details>

<details><summary>2. How do you prevent double booking of a seat in your LLD?</summary>

Atomic check-and-lock for all requested seats (single critical section per show, or lock seats in a deterministic order), TTL'd holds released on expiry/failure, and final confirmation that validates the hold belongs to the user. In a DB-backed version: conditional update or unique constraint.
</details>

<details><summary>3. Why represent money as long minor units?</summary>

Floating point can't represent most decimal fractions exactly (0.1 + 0.2 ≠ 0.3), causing rounding drift. Long paise (or BigDecimal with explicit scale/rounding) is exact; define rounding and remainder distribution explicitly.
</details>

## Questions asked at top companies

<details><summary>Design a parking lot. <em>· Amazon, Microsoft, Flipkart, Uber, Walmart</em></summary>

Entities (Lot, Floor, Spot types, Vehicle, Ticket, Payment), allocation strategy, pricing strategy, entry/exit gates with concurrency (per-floor locks or atomic spot claim), display boards (observer), extensibility for EV/handicapped spots.
</details>

<details><summary>Design Splitwise. <em>· Flipkart, Atlassian, Swiggy, CRED</em></summary>

Users, groups, expenses with split strategies (equal/exact/percent) validated, balance sheet, settle-up, debt simplification via net balances and greedy max-heap matching; money in minor units.
</details>

<details><summary>Design BookMyShow. <em>· BookMyShow, Amazon, Paytm</em></summary>

Theatre/screen/seat/show model, seat locking with TTL, booking + payment flow, concurrency control, pricing by seat type, cancellation.
</details>

<details><summary>Design an elevator system. <em>· Amazon, Microsoft, Goldman Sachs</em></summary>

Elevator state machine, request queues per direction, dispatcher strategy (SCAN/LOOK, nearest), concurrency via per-elevator threads, external vs internal requests.
</details>

<details><summary>Design a Snake & Ladder / Tic-Tac-Toe / Chess game. <em>· Swiggy, Zepto, Microsoft</em></summary>

Board, players, dice/moves, game loop, win condition, extensibility (board size, number of players, rules as strategies); for chess, piece polymorphism for move validation.
</details>

<details><summary>Design an LRU cache with TTL. <em>· Amazon, Microsoft, Google</em></summary>

HashMap + DLL for O(1) LRU; per-entry expiry checked on access + background cleanup (DelayQueue/scheduled sweep); thread-safety via locks/striping; eviction policy as a strategy.
</details>

<details><summary>Design a vending machine. <em>· Amazon, Walmart</em></summary>

State pattern (Idle, HasMoney, Dispensing, OutOfStock), inventory, coin/note handling, change calculation, refund on cancel.
</details>

<details><summary>Design a rate limiter library (LLD). <em>· Uber, Atlassian</em></summary>

`RateLimiter` interface, TokenBucket/SlidingWindow implementations, per-key registry with eviction, configuration, thread-safety (CAS/synchronized), clock injection for tests.
</details>

<details><summary>Design a logging framework. <em>· Microsoft, Adobe</em></summary>

Logger with levels, appenders (console/file/remote) as observers or chain, formatters (strategy), async buffering, configuration, singleton/factory for logger retrieval.
</details>

<details><summary>Design an in-memory pub-sub / message queue. <em>· Flipkart, PhonePe, Razorpay</em></summary>

Topics, partitions as lists, consumer groups with offsets, subscribe/publish APIs, thread-safe append, consumer threads, retries and dead letters, ordering per partition.
</details>

## End-to-end scenarios

<details><summary>Scenario (90-minute machine coding): Build a "Food Ordering" system — restaurants with menus and capacity, users place orders, restaurant selection by strategy (lowest price / highest rating).</summary>

Classes: Restaurant (menu Map<item, price>, rating, capacity, current load), Order (items, status), `RestaurantSelectionStrategy` (LowestPrice, HighestRating), OrderService (validate items available across restaurants, pick restaurant via strategy, reserve capacity atomically, create order), mark order complete releases capacity. Driver demonstrates onboarding restaurants, updating menus, placing orders with each strategy, handling "no restaurant can fulfil". Include simple unit tests and thread-safety on capacity (synchronized or AtomicInteger CAS).
</details>

<details><summary>Scenario: Your interviewer asks to add "pricing changes on weekends and for EV charging" to your parking lot after 60 minutes of coding. How do you respond?</summary>

Because pricing is a `PricingStrategy`, add `WeekendPricing` (decorator over base pricing applying a multiplier when the entry day is weekend) and `EvChargingFee` (adds per-kWh charge recorded on the ticket). Compose them via a `CompositePricing`. No change to ParkingLot flow — demonstrates OCP. Add tests for the new rules.
</details>
