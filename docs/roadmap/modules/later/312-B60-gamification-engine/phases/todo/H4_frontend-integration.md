# H4 — Frontend Integratie

> **Effort:** ~3 uur | **Impact:** Dashboard widgets tonen server-data i.p.v. client-side berekening

## Doel

Frontend hooks en adapters aanmaken die de nieuwe gamification API consumeren. Bestaande componenten (`ContentStreakWidget`, `ReadinessRing`, `SquadReadinessCard`) aanpassen om server-data te gebruiken.

## To do

- [ ] **API adapter:** `demo/src/api/gamification.ts`
  - `getMatchReadiness(matchId)` → `GET /api/v1/gamification/readiness/{matchId}/`
  - `getTeamReadiness(teamId)` → `GET /api/v1/gamification/readiness/?team={teamId}`
  - `getTeamStreak(teamId)` → `GET /api/v1/gamification/streaks/{teamId}/`
  - `getLeaderboard(params)` → `GET /api/v1/gamification/leaderboard/`
  - `getAchievements(teamId)` → `GET /api/v1/gamification/achievements/{teamId}/`
  - `getReadinessConfig(teamId)` → `GET /api/v1/gamification/config/{teamId}/`
  - `updateReadinessConfig(teamId, data)` → `PATCH /api/v1/gamification/config/{teamId}/`
- [ ] **TypeScript interfaces:** `demo/src/types/gamification.ts`
  - `MatchReadinessResponse`, `TeamStreakResponse`, `LeaderboardEntry`, `AchievementResponse`, `ReadinessConfigResponse`
- [ ] **Hooks:**
  - `useMatchReadiness(matchId)` — vervangt client-side berekening in `SquadReadinessCard`
  - `useTeamStreak(teamId)` — vervangt `useContentStreak` (of wrapper die fallback biedt)
  - `useLeaderboard(orgId, seasonId)` — voor nieuw leaderboard component
  - `useAchievements(teamId)` — voor achievement grid
- [ ] **ContentStreakWidget aanpassen:**
  - Gebruik `useTeamStreak` i.p.v. `useContentStreak`
  - Fallback naar client-side als API niet beschikbaar
  - Props interface behouden voor backward compatibility
- [ ] **ReadinessRing aanpassen:**
  - Accepteer server-side score via props (al het geval)
  - Geen wijzigingen nodig als de data via parent component binnenkomt
- [ ] **Nieuw: LeaderboardCard component:**
  - Club ranking tabel met team naam, logo, score, rank
  - Progress bar per team
  - Seizoens-filter
  - Responsive: tabel op desktop, cards op mobile
- [ ] **Nieuw: AchievementGrid component:**
  - Badge collectie op team profiel pagina
  - Locked/unlocked states met animatie
  - Respecteer `prefers-reduced-motion`
- [ ] Dashboard integratie: widgets op dashboard pagina toevoegen/updaten

## Done criteria

- [ ] Dashboard widgets tonen server-berekende data
- [ ] `useContentStreak` heeft graceful fallback
- [ ] LeaderboardCard toont ranking met responsive layout
- [ ] AchievementGrid toont badges met locked/unlocked states
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vite build` — builds successfully
- [ ] No new `any` types
- [ ] Mobile-first responsive
- [ ] Toegankelijk (keyboard navigatie, screen reader labels)
