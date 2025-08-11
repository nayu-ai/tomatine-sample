# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a psychology-based Pomodoro timer PWA (teo-timer) that focuses on reducing startup friction, providing immediate rewards, and simple record-keeping. The project is built with Next.js + TypeScript + Tailwind CSS and designed to work completely offline using IndexedDB/Dexie.

## Key Architecture & Design Principles

### Core Technology Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Data Storage**: IndexedDB with Dexie.js for offline-first functionality
- **State Management**: Zustand for client-side state
- **PWA**: Service Worker + Web App Manifest for offline support
- **Testing**: Jest (unit tests) + Playwright (E2E tests)
- **Deployment**: Vercel

### Design Principles (from requirements)

1. **Local-first**: Default to local storage, sync/sending only with explicit consent
2. **Minimal implementation**: Start simple, validate, then expand
3. **Autonomy respect**: Interventions are suggestions only, user always has veto power
4. **Minimal permissions**: Request permissions gradually, only what's needed
5. **Transparency**: No guessing specification changes, ask questions when unclear

### Data Models (MVP)

```typescript
// Core data structures to implement
Session {
  id: string,
  startAt: Date,
  endAt?: Date,
  focusMs: number,
  breakMs: number,
  flowExtended?: boolean,
  moodStart?: Mood,
  moodEnd?: Mood,
  taskNote?: string
}

UserPref {
  focusPresetMs: number,
  breakPresetMs: number,
  warmupEnabled: boolean,
  hourlyValue?: number,
  locale: string,
  privacyLevel: string
}

TimerState {
  mode: "warmup" | "focus" | "break" | "idle",
  startedAt?: number,
  targetAt?: number,
  pausedAt?: number
}
```

## Core Features (MVP Scope)

### Must Implement

- **3-minute warmup** (skippable to regular session)
- **Variable timer** (adjustable focus/break presets)
- **Session save/restore** (handle force quit with continue/discard option)
- **Achievement feedback** (short toast messages, i18n support)
- **History & simple stats** (total time, completion count, achievement rate)
- **Mood tags** (one-tap at start/end)
- **Foreground notifications only** (request permission after achievement experience)

### MVP Constraints

- **No background notifications** (PWA/extension dependent)
- **No automatic site blocking** or excessive monitoring
- **No team features, billing, or mandatory accounts**
- **No biometric sensing** (HRV, etc.)

### Timer Implementation Guidelines

- Use `remaining = Math.max(0, targetAt - Date.now())` as source of truth
- Update UI with `requestAnimationFrame` when visible
- Handle device time changes and sleep/wake with drift detection
- Persist `TimerState` for crash recovery

### PWA Requirements

- **Complete offline functionality** with IndexedDB
- **Cache Strategy**: Static files (Cache First), HTML (Network First with cache fallback)
- **Update handling**: Don't auto-update during active timer, notify after completion
- **Navigate fallback**: All routes fallback to index when offline

## Development Workflow

### Code Organization

- Follow Next.js 13+ app directory structure
- Use TypeScript strict mode
- Implement proper error boundaries
- Index `Session.startAt` for date/week aggregation queries

### Quality Standards

- **Accessibility**: WCAG 2.2 AA compliance, keyboard navigation, focus visibility
- **Performance**: UI response <100ms, settings save <200ms
- **Testing**: Unit tests for timer/store/DB, E2E for full user flows
- **Error rate**: <0.5% critical errors during beta

### Key Acceptance Criteria

- Startup to timer start in **≤2 operations**
- Warmup skippable to immediate regular session
- Force quit recovery with continue/discard choice
- Full offline functionality for home screen and recording

## Development Phases

### S1: MVP Foundation

- Project scaffolding with lint/format/CI
- PWA minimal implementation (manifest/sw.js)
- Dexie schema v1 implementation
- Zustand store setup (timer/session/ui)
- Timer engine with drift recalculation
- Core UI screens (Home with timer controls)
- 3-minute warmup with skip functionality
- Session persistence and recovery
- Achievement feedback system
- Testing infrastructure
- A11y compliance
- Documentation (CONTRIBUTING/DEVELOPMENT)

### S2: Experience Enhancement

- Enhanced stats (period filters/trends)
- Settings expansion (defaults/toggles/locale)
- Notification permission flow optimization
- A/B testing framework (experimental flags)
- Data portability (export/delete all)

## Agent Collaboration Rules

### Forbidden Actions

- **No specification guessing**: Ask questions first if unclear
- **No large changes**: PRs should be ≤300 lines (implementation + tests + docs)
- **No dangerous commands**: No global refactoring or dependency changes without agreement
- **No automatic decisions**: Present alternatives (max 2) with tradeoffs

### Question Guidelines

When unclear about specifications, present questions in this format:

1. Warmup default value limits? (e.g., 1-5 minutes)
2. Break default: fixed 5min or ratio-based?
3. Week start for stats: Monday or Sunday?
4. Achievement toast tone (formal/casual) and max character count?
5. PWA icon/name/short name official proposals?

### Development Standards

- Always implement with proper TypeScript types
- Include unit tests for core logic
- Follow existing code patterns and conventions
- Implement proper error handling and user feedback
- Ensure offline-first functionality works correctly
- Test accessibility with keyboard navigation
- Document any architectural decisions

## Future Roadmap Context

### v1.5 (Individual Optimization)

- Personal cycle optimization suggestions
- Time-to-value dashboard (hourly rate settings)
- A/B testing for copy variations

### v2 (Extended Integration)

- Chrome extension (gradual permissions: alarms → tabs/idle)
- Wearable device integration (suggestion-only, no forced automation)
- Optional cloud sync (Supabase/Vercel DB with explicit consent)

This roadmap context helps inform current architectural decisions but should not drive MVP scope creep.
