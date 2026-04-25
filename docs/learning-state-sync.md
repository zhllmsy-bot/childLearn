# Learning State Sync Strategy

This app currently stores child learning progress in `localStorage`. The MVP
sync layer keeps that local-first behavior and double-writes a backend copy so
other clients can recover or share the same child state.

## Design Principles

- Local-first: child-facing practice must keep working if the backend is down.
- Backend copy: every relevant `childlearn.*` learning record is pushed to
  `/sync/child-state` after local persistence.
- Conservative merge: progress-like data is merged with union/max rules; active
  session snapshots use latest-write semantics.
- No model authority: sync state only stores learning records, not LLM decisions
  as a source of truth.
- Append-only later: telemetry and answer events are better long-term sync
  primitives than mutable `localStorage` snapshots.

## Current Merge Rules

- Stickers and badges: union.
- Rank stars, combo max, number-spirit XP, garden counters: max/per-key max.
- Ability profile: per-skill conservative merge, keeping the strongest observed
  counters from each synced copy.
- Daily first win: latest day string.
- DDA state and app session snapshot: newest client snapshot wins.

## Next Step

When this grows beyond a single-child local MVP, move from snapshot sync to a
small event log plus materialized server state:

- append `question.answer`, reward, and flow-policy events with idempotency keys
- let backend materialize current progress by child ID
- expose pull/push changes with server revisions
- add account or child profile identity instead of the default anonymous child
