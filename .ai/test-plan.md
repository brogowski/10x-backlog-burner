## Wprowadzenie i cele testowania
- Zabezpieczyć stabilność Backlog Burnera poprzez kompleksową weryfikację kluczowych przepływów użytkownika (autoryzacja, zarządzanie backlogiem, kolejka „In Progress”, wyszukiwanie/import gier) i integracji z Supabase.
- Potwierdzić poprawność logiki biznesowej zawartej w serwisach (`src/lib/services/*`), endpoitach API (`src/pages/api/v1/*`) oraz komponentach React (`src/components/*`) pod kątem walidacji, error handlingu i UX.
- Upewnić się, że aplikacja spełnia wymagania jakościowe dotyczące responsywności, dostępności i odporności na błędy w warunkach produkcyjnych.

## Zakres testów
- Frontend Astro + React: layout (`src/layouts/Layout.astro`), widoki (`src/pages/*.astro`), komponenty interaktywne (`BacklogList`, `InProgressList`, `SearchAddModal`, formularze auth).
- Backend Supabase: middleware (`src/middleware/index.ts`), API (`src/pages/api/v1/*`), serwisy (`src/lib/services/*`) i walidacje (`src/lib/validation/*`).
- Integracja z supabase-client (`src/db/supabase.client.ts`, `src/lib/auth/authApi.ts`) obejmująca uwierzytelnienie, sesję i operacje CRUD na `user_games`.
- Procesy asynchroniczne (importy, reorder z `@dnd-kit`, `useCatalogSearch` z filtrami, `useUserGameMembership`).

## Typy testów do przeprowadzenia
- **Testy jednostkowe**: logika walidacji (`gamesSearch.schema.ts`, `userGames.schema.ts`, `auth`), serwisy Supabase (`userGames.service.ts`, `auth.service.ts`), hooki (`useBacklog.ts`, `useInProgressQueue.ts`, `useCatalogSearch.ts`).
- **Testy integracyjne**: endpointy API (`/api/v1/auth/*`, `/api/v1/user-games/*`, `/api/v1/games.ts`) z emulowanym Supabase (np. Supabase CLI z testową bazą), interakcje formularzy z fetch/połączeniami (np. `LoginForm` → `/api/v1/auth/login`).
- **Testy end-to-end**: scenariusze użytkownika w przeglądarce (Playwright lub Cypress) dla logowania, zarządzania backlogiem, przesuwania gier między stanami, wyszukiwania/importu.
- **Testy wydajnościowe i regresyjne**: pomiar czasu ładowania widoków `in-progress`, `backlog` z dużą liczbą pozycji, testy regresyjne UI po zmianach w `tailwind`/komponentach.
- **Testy bezpieczeństwa/odporności**: symulacja błędów sieciowych (odpowiedzi 401/500 z API), brak sesji, brak odpowiedzi Supabase.

## Scenariusze testowe dla kluczowych funkcjonalności
- **Autoryzacja e-mail/hasło i wylogowanie**: wejście na `src/pages/auth.astro`, testy walidacji `LoginForm`, obsługa błędów API (`/api/v1/auth/login`, `authApi.ts`), sprawdzenie blokowania przycisku logout z `Layout.astro`.
- **Rejestracja i reset hasła**: `SignupForm`, `PasswordResetRequestForm`, `PasswordResetConfirmForm` z walidacją `auth.ts` i endpointami `/api/v1/auth/signup`, `/password-reset/request`, `/password-reset/confirm`.
- **Zarządzanie backlogiem**: dodawanie/usuwanie gier (`BacklogList`, `AddToInProgressButton`, `RemoveFromBacklogButton`), synchronizacja z `useBacklog`, poprawność paginacji (`PaginationControl`), zachowanie pustego stanu.
- **Kolejka In Progress**: dodawanie przyciskami `AddGamesButton`, kolejność z `@dnd-kit`/`CompleteButton`, błędy przy przekroczeniu limitu i `InlineErrorBanner`.
- **Import i wyszukiwanie gier**: modal `SearchAddModal`, hooki `useCatalogSearch`, `useAddUserGame`, `useUserGameMembership`, wielokrotne filtry `GenresMultiSelect`, `ReleaseRangeFilter`, sortowanie i paginacja.
- **Operacje API na `user-games`**: `/api/v1/user-games/[steamAppId]` (GET/DELETE/POST), `/reorder`, `/complete`, sprawdzanie idempotentności, zarządzanie statusami i uprawnieniami, middleware autoryzacyjnego (`src/middleware/index.ts`).

## Środowisko testowe
- Node 22.14.0 zgodnie z `.nvmrc`, Astro w trybie dev (`npm run dev`) i build (`npm run build`).
- Testowy Supabase (lokalny projekt/migrowany stan z `supabase/migrations`) z dedykowanym zbiorem danych (`user_games`, `users`, `games`).
- Przeglądarki Chromium/Firefox dla e2e (Playwright)
- Konteneryzowana lub lokalna baza do testów integracyjnych (Supabase CLI lub docker).
- Mockowanie fetch w testach jednostkowych (Vitest/Testing Library).

## Narzędzia do testowania
- **Vitest + Testing Library** (React) do jednostkowych i integracyjnych testów komponentów/hooków.
- **Playwright** do end-to-end – scenariusze front → API.
- **Supabase CLI/Docker** do izolowanych baz testowych, przywracania stanu po testach.
- **Postman/Newman** albo **HTTPie** do regresji endpointów API z kolekcją testów (auth, user-games, games).


## Kryteria akceptacji testów
- Wszystkie przypadki z planu opublikowane w repozytorium jako zielone testy (unit/integration/e2e).
- Brak regresji logiki walidacji i onboardingów (testy dla hooków `useAuthForm`, `usePasswordReset`).
- API `/api/v1/*` zwraca poprawne statusy 200/201/204 i obsługuje błędy 400/401/500 w kontrolowanych scenariuszach.
- Pokrycie krytycznych serwisów (auth, userGames, backlog) co najmniej 70% (opcjonalny threshold z narzędzia takiego jak Vitest).
- Brak krytycznych bugów wiperwanych przez testy e2e i potwierdzonych ręcznie przed release.
