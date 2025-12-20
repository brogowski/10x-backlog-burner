# Product Requirements Document (PRD) - Backlog Burner

## 1. Product Overview
Backlog Burner is a web application designed to help PC gamers organize, prioritize, and complete their backlog of games. The MVP enables users to import their Steam game library (titles, artwork, playtime, achievements), select a limited set of “in-progress” games, view and manage their full backlog, and receive simple next-game suggestions based on a weighted scoring model. Users authenticate via email/password or Steam OAuth. The system caches artwork client-side, logs minimal analytics events, and provides basic error handling for import failures. The MVP targets release by 2025-11-16.

## 2. User Problem
Many PC gamers accumulate large backlogs of purchased or free library titles they never finish. Without an easy way to prioritize and track progress, games remain unplayed or abandoned. Backlog Burner addresses this by importing game collections automatically, surfacing recent play history for quick queueing, and offering clear suggestions to move users toward completion.

## 3. Functional Requirements
1. Authentication and Authorization
   - Email/password signup, login, and secure password reset flows
   - Steam OAuth login option
2. Game Collection Import
   - Import game title, artwork, playtime, and achievements from Steam
   - Display import success or generic error states for failures
   - Client-side caching of artwork to minimize repeated requests
3. In-Progress Queue Management
   - Allow user to add up to a configurable cap of games to an “in-progress” queue
   - Provide drag-and-drop or manual priority ordering
   - Manually mark games as completed
4. Full Backlog View
   - Display complete list of imported games
   - Edit game entries (remove, reorder)
5. Next-Game Suggestion
   - Compute suggestion using weighted model: user-set priority, genre, playtime, release date, popularity, settings, optional time-to-beat
   - Fall back to manual backlog when no play history exists
6. Onboarding Wizard
   - Pull recently played games and prompt addition to in-progress
   - Guide user through import and suggestion features
7. Analytics Events
   - Track import, reorder, and completion actions for success metric analysis
8. Error Handling and Rate Limits
   - Generic error messages for Steam API issues
   - Client-side caching and retry logic for up to 100k API calls per day

## 4. Product Boundaries
In scope for MVP:
- Single in-progress queue with manual overrides
- Steam import only (no other platforms)
- Web app only (no mobile)
- Minimal weighted suggestion algorithm (no machine learning)
- Solo developer schedule targeting 2025-11-16 release

Out of scope for MVP:
- Complex suggestion systems or ML models
- Game collection imports from platforms other than Steam
- Social features or user sharing
- Native mobile app version

## 5. User Stories
- ID: US-001
  Title: Email/password signup
  Description: As a new user, I want to create an account with email and password so I can securely access my backlog.
  Acceptance Criteria:
    1. User can navigate to signup page.
    2. User provides valid email and password.
    3. System validates input and creates account.
    4. Confirmation email is sent or success message displayed.

- ID: US-002
  Title: Email/password login
  Description: As a user, I want to log in with my email and password so I can access my backlog data.
  Acceptance Criteria:
    1. Login form accepts email and password.
    2. Invalid credentials show an error.
    3. Successful login redirects to in-progress view.

- ID: US-003
  Title: Password reset
  Description: As a user, I want to reset my password if I forget it.
  Acceptance Criteria:
    1. User can request password reset via email.
    2. Email contains reset link.
    3. Reset link allows setting a new password.
    4. New password is validated and saved.

- ID: US-004
  Title: Steam OAuth login
  Description: As a user, I want to log in via Steam so I can quickly import my game library.
  Acceptance Criteria:
    1. Steam OAuth button initiates login.
    2. Successful Steam authentication creates or links user account.
    3. User lands on import prompt after login.

- ID: US-005
  Title: Import Steam library
  Description: As a logged-in user, I want to import my Steam game library so I can build my backlog in the app.
  Acceptance Criteria:
    1. User initiates import from Steam.
    2. System fetches title, artwork, playtime, achievements.
    3. Imported games appear in backlog view.

- ID: US-006
  Title: Handle import errors
  Description: As a user, I want to see an error message if my Steam import fails.
  Acceptance Criteria:
    1. Import failure shows generic error state.
    2. User can retry import.

- ID: US-007
  Title: Onboarding recent-play prompt
  Description: As a new user, I want to add recently played games to my in-progress queue during onboarding.
  Acceptance Criteria:
    1. System lists recent play history.
    2. User selects games to add.
    3. Selected games appear in in-progress.

- ID: US-008
  Title: Fallback to manual backlog addition
  Description: As a user with no play history, I want to manually add games to my backlog.
  Acceptance Criteria:
    1. No recent plays prompts manual add view.
    2. User can search and add games from full backlog.

- ID: US-009
  Title: View full backlog
  Description: As a user, I want to view my entire imported game backlog so I can manage my list.
  Acceptance Criteria:
    1. Backlog page lists all imported games.
    2. Pagination or scroll for large lists.

- ID: US-010
  Title: Reorder and remove backlog games
  Description: As a user, I want to reorder or remove games from my backlog.
  Acceptance Criteria:
    1. User can drag-and-drop or use controls to reorder.
    2. User can delete games from the list.

- ID: US-011
  Title: Mark game as completed
  Description: As a user, I want to mark a game as completed so it no longer appears in active queues.
  Acceptance Criteria:
    1. Completed action moves game out of in-progress view.
    2. Completion is recorded in analytics.

- ID: US-012
  Title: Next-game suggestion
  Description: As a user, I want to receive a suggested next game to play based on my priorities.
  Acceptance Criteria:
    1. Suggestion button shows top-ranked game.
    2. Explanation of suggestion factors is displayed.

- ID: US-013
  Title: View game details
  Description: As a user, I want to view details (artwork, achievements) for each game.
  Acceptance Criteria:
    1. Detail view shows artwork, playtime, achievements.
    2. No external links required.

- ID: US-014
  Title: Enforce in-progress cap
  Description: As a user, I want the system to enforce a maximum number of in-progress games.
  Acceptance Criteria:
    1. User cannot add beyond cap.
    2. Notification appears when cap is reached.

## 6. Success Metrics
- 75% of users complete at least two games from their backlog within 3 months of signup.
- Track number of completed games per user (analytics event).
- Track import, reorder, and completion event counts.
- Monitor weekly active users engaging with suggestions.
- Measure retention rate 30 days post-signup.
