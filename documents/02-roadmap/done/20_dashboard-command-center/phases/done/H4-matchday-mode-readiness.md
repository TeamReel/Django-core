# H4 — Match-day Mode & Match Readiness

> **Status:** ✅ Voltooid
> **Geschatte effort:** 3-4 uur
> **Geschatte omvang:** ~200 regels nieuw, ~80 regels gewijzigd

## Doel

Dashboard herkent wedstrijddagen en **transformeert prominent**: header wordt countdown, ActiveMatchCard krijgt accent styling, smart actions filteren op match-only. Plus: readiness ring op elke match card.

## Probleem

- Dashboard ziet er identiek uit op een willekeurige dinsdag en op wedstrijddag
- Coaches missen urgentie: "het is over 2 uur maar ik heb nog geen lineup"
- Geen visuele readiness score per wedstrijd
- Smart actions tonen irrelevante acties op wedstrijddag (profile foto's ipv lineup)

## Match-day Detection

```tsx
// demo/src/hooks/useMatchDayMode.ts

interface MatchDayMode {
  isMatchDay: boolean;
  activeMatch: Match | null;
  countdown: string | null;        // "Over 2u 15min" of "LIVE" of null
  countdownMinutes: number | null;  // minuten tot kickoff (voor urgency styling)
  readinessPercent: number;
}

export function useMatchDayMode(match: Match | null): MatchDayMode {
  // Match-day = active match start_time is vandaag
  // Countdown: live timer die elke minuut update via setInterval
  // LIVE: match is gestart maar niet geëindigd
  // readinessPercent: contentDoneSubtypes / total * 100
}
```

**Triggers:**
- `start_time` is vandaag (same calendar date) → `isMatchDay = true`
- `start_time` is in de toekomst + vandaag → countdown telt af
- `start_time` < now < `end_time` → "LIVE"
- Geen active match vandaag → `isMatchDay = false`, normaal dashboard

## Dashboard transformatie op wedstrijddag

### 1. Header wordt countdown

**Normaal:**
```
Welkom, Brian
Helden 6
```

**Wedstrijddag:**
```
⚡ Over 2u 15min
Helden 6 vs Tegenstander · De Boekweit
```

**LIVE:**
```
🔴 LIVE
Helden 6 vs Tegenstander
```

```tsx
// In DashboardPage.tsx:
const matchDay = useMatchDayMode(activeMatch);

<div className={styles.header}>
  {matchDay.isMatchDay ? (
    <div className={styles.matchDayHeader}>
      <div className={styles.countdownBadge}>
        {matchDay.countdown === 'LIVE'
          ? <><span className={styles.liveDot} /> LIVE</>
          : <><Zap size={16} /> {matchDay.countdown}</>
        }
      </div>
      <p className={styles.matchDaySubtitle}>
        {activeMatch.title} · {activeMatch.location}
      </p>
    </div>
  ) : (
    <div>
      <h1 className={styles.greeting}>Welkom, {user?.first_name}</h1>
      <p className={styles.orgSubtitle}>{project?.name || org?.name}</p>
    </div>
  )}
</div>
```

### 2. ActiveMatchCard accent styling

```css
/* DashboardPage.module.css */
.matchDayActiveMatch {
  /* Oranje/gouden accent border */
  border: 2px solid var(--color-amber-400);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.15);
  border-radius: var(--radius-lg);
}

/* Reduced motion: skip glow animation */
@media (prefers-reduced-motion: no-preference) {
  .matchDayActiveMatch {
    animation: matchDayPulse 3s ease-in-out infinite;
  }
}

@keyframes matchDayPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.15); }
  50% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.25); }
}
```

### 3. Smart Actions gefilterd op match-day

**Normaal:** Alle acties (content gen, upload, lineup, etc.)
**Wedstrijddag:** Alleen match-gerelateerde acties:
- "Lineup invullen" (als niet compleet)
- "Pre-match content maken" (als ontbreekt)
- "Match flyer delen" (als gegenereerd)
- Upload foto's (altijd relevant)

```tsx
// In SmartActionsCard:
const matchDay = useMatchDayMode(activeMatch);

const filteredActions = useMemo(() => {
  if (!matchDay.isMatchDay) return allActions;
  // Filter: alleen acties met match-relevante keys
  const matchKeys = new Set(['lineup', 'pre_match_content', 'match_flyer', 'upload']);
  return allActions.filter(a => matchKeys.has(a.key));
}, [allActions, matchDay.isMatchDay]);
```

### 4. Readiness Ring (SVG)

Circulaire progress indicator op ActiveMatchCard en UpcomingMatchesCard.

```tsx
// demo/src/components/dashboard/ReadinessRing.tsx

interface ReadinessRingProps {
  percent: number;     // 0-100
  size?: number;       // px, default 40
  strokeWidth?: number; // default 3
  showLabel?: boolean;  // toon percentage in het midden
}

export const ReadinessRing: React.FC<ReadinessRingProps> = ({
  percent, size = 40, strokeWidth = 3, showLabel = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  // Kleur op basis van readiness
  const color =
    percent < 30 ? 'var(--color-red-500)' :
    percent < 70 ? 'var(--color-amber-400)' :
    'var(--color-green-500)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="var(--bg-secondary)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Label */}
      {showLabel && (
        <text
          x="50%" y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary)"
          fontSize={size * 0.28}
          fontWeight={600}
        >
          {Math.round(percent)}%
        </text>
      )}
    </svg>
  );
};
```

**Gebruik in ActiveMatchCard:**
```tsx
<ReadinessRing percent={readinessPercent} size={48} />
```

**Gebruik in UpcomingMatchesCard (compact):**
```tsx
<ReadinessRing percent={match.readinessPercent} size={32} showLabel={false} />
```

**Kleurschema:**
| Range | Kleur | CSS variable |
|-------|-------|-------------|
| 0-29% | Rood | `--color-red-500` |
| 30-69% | Oranje | `--color-amber-400` |
| 70-100% | Groen | `--color-green-500` |

## Design tokens

```css
/* Nieuwe CSS variables voor match-day */
.matchDayHeader {
  /* Geen magic numbers — alles via tokens */
}

.countdownBadge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-amber-400);
}

.liveDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-red-500);
  animation: livePulse 1.5s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.matchDaySubtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}
```

## Bestanden

| Bestand | Actie |
|---------|-------|
| `demo/src/hooks/useMatchDayMode.ts` | **Nieuw** — match-day detection + countdown timer |
| `demo/src/components/dashboard/ReadinessRing.tsx` | **Nieuw** — SVG circular progress |
| `demo/src/pages/DashboardPage.tsx` | Match-day header conditional + accent class |
| `demo/src/pages/DashboardPage.module.css` | `.matchDayHeader`, `.countdownBadge`, `.liveDot`, `.matchDayActiveMatch` |
| `demo/src/components/dashboard/ActiveMatchCard.tsx` | ReadinessRing integratie |
| `demo/src/components/dashboard/ActiveMatchCard.module.css` | Ring positioning |
| `demo/src/components/dashboard/UpcomingMatchesCard.tsx` | Compact ReadinessRing per match |
| `demo/src/components/dashboard/SmartActionsCard.tsx` | Match-day action filtering |

## Afhankelijkheden

- **H2 moet eerst:** UpcomingMatchesCard + useMatchSheet (readiness data)
- **H3 moet eerst:** SmartActionsCard refactored (event-based actions)
- **Bestaande data:** `useClosestMatch` geeft `contentDoneSubtypes` — readiness berekening is client-side

## Prefers-reduced-motion

Alle animaties respecteren `prefers-reduced-motion: reduce`:
- `matchDayPulse` → geen glow animation
- `livePulse` → geen opacity pulse
- `ReadinessRing` stroke transition → instant (0s)
- Countdown update: geen visuele transition, alleen tekst update

## Acceptatiecriteria

- [ ] Match-day detection correct: vandaag = wedstrijddag als active match vandaag start
- [ ] Header toont countdown ("Over Xu Ymin") op wedstrijddag
- [ ] Header toont "LIVE" badge met rode pulserende dot als match bezig is
- [ ] ActiveMatchCard krijgt oranje accent border + subtiele glow op wedstrijddag
- [ ] SmartActions toont alleen match-relevante acties op wedstrijddag
- [ ] ReadinessRing op ActiveMatchCard (48px) met percentage label
- [ ] ReadinessRing op UpcomingMatchesCard (32px, compact, geen label)
- [ ] Kleurschema: rood < 30%, oranje 30-70%, groen > 70%
- [ ] Countdown timer update elke minuut (setInterval met cleanup)
- [ ] `prefers-reduced-motion` gerespecteerd — geen animaties bij voorkeur
- [ ] CSS variables — geen hardcoded kleuren
- [ ] TypeScript clean, Vite build succesvol
