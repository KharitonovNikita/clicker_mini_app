# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

- Development server: `npm run dev`
- Production build: `npm run build`
- Start built app locally: `npm start`
- Lint: `npm run lint`
- Deploy preview to Vercel: `npm run deploy`
- Deploy production to Vercel: `npm run deploy:prod`

All commands assume you are in the repository root.

## Architecture overview

### Framework & tooling

- Next.js 14 with the App Router, TypeScript, and React 18.
- Source code lives under `src/` (not at the repo root).
- Styling is done with `styled-components`, wired for SSR via a registry component.
- Backend persistence for player stats uses `@vercel/kv` (Vercel KV database).

### App entrypoints

- Root application layout: `src/app/layout.tsx`
  - Sets up the HTML shell, global Inter font, and `<script src="https://telegram.org/js/telegram-web-app.js" async />` for Telegram WebApp integration.
  - Wraps all pages in `ClientWrapper` to integrate `styled-components` correctly with Next.js.
- Main page: `src/app/page.tsx`
  - Client component that initializes the Telegram WebApp (when available) and then renders `GameContainer`.

### Client-side game logic

- Core UI and game logic: `src/components/GameContainer.tsx`
  - Implements the clicker game (balance, clicks, click power, auto-clicker levels, etc.).
  - Maintains per-session game state in React state and persists it to `localStorage` under:
    - `miniClickerState` — current in-session game state (balance, clicks, upgrades).
    - `miniClickerUsersData` — aggregated per-user statistics (all players), mirrored from the backend.
  - Integrates with Telegram via `window.Telegram.WebApp.initDataUnsafe.user` to identify the current player and show per-user stats.
  - Periodically debounces and sends aggregated stats to the backend API and also updates the local aggregated stats cache.

### Global styles & styled-components

- `src/components/ClientWrapper.tsx`
  - Marks the subtree as client-side, wraps children with `StyledComponentsRegistry`, and injects `GlobalStyles`.
  - This component is used once in `src/app/layout.tsx` to make `styled-components` work correctly with Next.js SSR.
- `src/components/StyledComponentsRegistry.tsx` and `src/styles/GlobalStyles.tsx`
  - Provide the SSR registry and global style definitions for `styled-components`.

### Backend API & persistence

- Player stats API route: `src/app/api/users/stats/route.ts`
  - Uses `@vercel/kv` with a single key (`miniClickerUsersData`) to store a JSON object of shape:
    - `{ users: Record<string, UserStats>, lastUpdated: string }`.
  - `GET /api/users/stats`
    - Ensures a default empty structure exists in KV.
    - Returns all players sorted by `totalBalance` descending in `data.topPlayers`, plus `data.lastUpdated`.
    - Disables caching so the leaderboard is always fresh.
  - `POST /api/users/stats`
    - Expects the current Telegram user id in the `x-telegram-user-id` header and a JSON body containing basic user info and `gameStats`.
    - Merges the incoming session stats into the stored aggregate for that user (total clicks, best balance, upgrade levels, games played, timestamps) and writes back to KV.
  - The frontend `GameContainer` calls this endpoint to keep server-side stats in sync with local state and to restore the global leaderboard when the app loads.

## Notes for future agents

- When modifying gameplay logic or stats aggregation, ensure the shape of `UsersData` and `UserStats` remains consistent between:
  - `src/components/GameContainer.tsx` (client types and local cache), and
  - `src/app/api/users/stats/route.ts` (backend types and KV storage).
- The Telegram WebApp integration is tightly coupled to how the user is identified and how the `x-telegram-user-id` header is built on the client; if you change this, update both the client and the API route together.
