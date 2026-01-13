# Backlog Burner
test
![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5.13.7-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=black)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## Table of Contents
- [Project name](#backlog-burner)
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description
Backlog Burner is a web application that helps PC gamers organize, prioritize, and complete their game backlog. The MVP focuses on importing a user’s Steam library (titles, artwork, playtime, achievements), letting users maintain a limited “in‑progress” queue, managing the full backlog, and offering a simple next‑game suggestion based on a weighted scoring model. Users can authenticate via email/password or Steam OAuth. The tracks minimal analytics (import, reorder, completion), and shows clear error states for import failures.

- See the full Product Requirements Document (PRD): [`.ai/prd.md`](./.ai/prd.md)

## Tech stack
- Frontend: Astro 5, React 19, TypeScript 5, Tailwind 4, shadcn/ui
- Backend: Supabase (PostgreSQL, SDK, built‑in authentication)
- Tooling: ESLint, Prettier, lint-staged, Husky
- Testing:
  - Unit + integration: Vitest with Testing Library for component and service coverage
  - End-to-end: Playwright for full flow validation in real browsers

For additional notes, see: [`.ai/tech-stack.md`](./.ai/tech-stack.md)

## Getting started locally

### Prerequisites
- Node.js 22.14.0 (see `.nvmrc`)
- npm (comes with Node)

If you use nvm:

```bash
git clone <your-fork-or-repo-url>
cd backlog-burner
nvm use
```

### Install dependencies
```bash
npm install
```

### Start the dev server
```bash
npm run dev
```
Astro’s dev server runs on `http://localhost:4321` by default.

### Build for production
```bash
npm run build
```

### Preview the production build
```bash
npm run preview
```

## Available scripts
- `npm run dev`: Start the Astro dev server
- `dev:e2e`: Start the Astro dev server with test enviorment configuration
- `npm run build`: Build the site for production
- `npm run preview`: Preview the production build locally
- `npm run astro`: Run Astro CLI directly
- `npm run lint`: Lint the codebase
- `npm run lint:fix`: Lint and fix issues automatically
- `npm run format`: Format files with Prettier
- `npm run test`: Run Vitest once for unit and integration suites
- `npm run test:watch`: Run Vitest in watch mode for TDD work
- `npm run test:ui`: Launch the Vitest UI to explore suites interactively
- `npm run test:e2e`: Run Playwright against the Chromium desktop flow
- `npm run test:e2e:headed`: Same as `test:e2e` but with the headed browser
- `npm run test:e2e:trace`: Run Playwright with trace capture enabled

## Testing
- **Unit/Integration**: Vitest (configured in `vitest.config.ts`) runs against `tests/unit`, uses jsdom, shared setup helpers in `src/test/setup.ts`, and `@testing-library` helpers for component/rendered-service assertions.
- **End-to-end**: Playwright (configured in `playwright.config.ts`) targets Chromium via `tests/e2e`, spins up `npm run dev` automatically, relies on page objects under `tests/e2e/pages`, and captures screenshots/traces on failures.

## Project scope
The MVP scope and boundaries are defined in the PRD. Highlights:

- In scope:
  - Steam import (title, artwork, playtime, achievements)
  - Email/password auth and Steam OAuth
  - In‑progress queue with configurable cap and manual ordering
  - Full backlog view with edit (remove, reorder)
  - Next‑game suggestion using a weighted model (priority, genre, playtime, release date, popularity, settings, optional time‑to‑beat)
  - Onboarding wizard leveraging recent play history
  - Client‑side artwork caching and minimal analytics events

- Out of scope (MVP):
  - Other platforms (non‑Steam) imports
  - Advanced or ML‑based suggestion systems
  - Social features or sharing
  - Native mobile apps

See full details: [`.ai/prd.md`](./.ai/prd.md)

## Project status
- Version: `0.0.1`
- Current stack versions (from dependencies): Astro `^5.13.7`, React `^19.1.1`

For goals, user stories, and success metrics, refer to the PRD.

## License
This project is licensed under the MIT License. You can review the license terms at:

https://opensource.org/licenses/MIT
