---
name: Copy Trading architecture
description: Service/store/page pattern for the copy trading feature; key decisions and pitfalls.
---

# Copy Trading Architecture

## Pattern
`CopyTradingService` (WebSocket logic) → `CopyTradingStore` (MobX state) → `CopyTrading` page (React/observer).

## Key decisions

**Subscription approach**: Use `api.sendAndGetSource({ transaction: 1, subscribe: 1 }).subscribe()` — NOT `api.send(...)` + `api.onMessage().subscribe()`. The `onMessage()` Observable emits ALL messages on the connection, causing cross-contamination with concurrent `proposal_open_contract` and `buy` calls during trade replication.

**Why:** When replicating a trade the service makes several concurrent API calls on the leader connection (fetchContractDetails). If `onMessage()` is used for the transaction stream, those responses land in the same handler and must be filtered, which is fragile. `sendAndGetSource` scopes the Observable to that subscription's req_id only.

**Async state in MobX**: The store uses `runInAction(() => { ... })` after every `await` point. Mutations directly after `await` in an `action`-decorated async function violate MobX strict mode (which IS enabled in this app).

**Token safety**: Tokens are never persisted (no localStorage/cookies). Only the last 4 chars are shown as a hint in logs (`...XXXX`). Never log full tokens.

**Error surface**: Service errors (`onError` callback) push to `store.error_messages[]` which auto-dismiss after 8 s. Shown as sticky toast banners above the hero.

**Leader disconnect**: `disconnectLeader()` on the store resets `leader_status → 'idle'` and clears `leader_token` so a new token can be entered without a page reload.

**Removed**: The non-functional `Sync` checkbox (was only updating local React state, no store/service wiring).

## How to apply
- Extending copy trading → follow service/store/page pattern, keep tokens out of logs.
- Adding new subscriptions on the leader/follower connections → use `sendAndGetSource`, not `send + onMessage`.
- State changes after `await` → always wrap in `runInAction`.
