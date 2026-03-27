# UI Review Report — Roadmap #26: My Team Hub

> **Datum:** 2026-03-18
> **Methode:** Playwright MCP browser review
> **URL:** `https://demo.teamreel.app/knvb/asc/helden-6/2025-2026`
> **User:** brianstokvis@teamreel.app (Admin role)
> **Viewports:** Desktop 1280×900, Mobile 375×812

---

## Samenvatting

De My Team Hub is functioneel en visueel grotendeels correct geïmplementeerd. Er zijn **3 kritieke bugs** gevonden die de desktop-ervaring en tab-navigatie breken. De mobiele weergave werkt goed qua layout maar heeft een tab-switching bug.

**Kritiek (blokkerend):** 3
**Hoog:** 2
**Medium:** 4
**Laag:** 2

---

## Kritieke Bevindingen

### K1 — Tab bar onzichtbaar op desktop
| | |
|---|---|
| **Severity** | 🔴 Kritiek |
| **Component** | `MobileTabBar` in `MyTeamHubPage.tsx` |
| **Probleem** | De Hub tab pills (Overview, Wedstrijden, Media, Selectie, Beheer) zijn onzichtbaar op desktop (>639px) |
| **Oorzaak** | `MobileTabBar` rendert een `<div class="mobile-tab-bar">` dat in `layouts.css` als `display: none` staat met een media query `@media (max-width: 639px)` voor `display: flex`. De CSS module `.inlineWrap` overschrijft dit niet. |
| **Impact** | Op desktop is er geen tab navigatie voor de Hub. Gebruikers zijn afhankelijk van de legacy Panel B sidebar die andere tab-namen gebruikt. |
| **Fix** | Optie A: Voeg `display: flex` toe aan `.inlineWrap` in `MobileTabBar.module.css` zodat het op alle viewports zichtbaar is. Optie B: Gebruik een ander component voor de Hub tabs dat niet afhankelijk is van de `mobile-tab-bar` class. |

### K2 — Tab switching werkt niet (memoization bug)
| | |
|---|---|
| **Severity** | 🔴 Kritiek |
| **Component** | `MyTeamHubPage.tsx` regel 77-93 |
| **Probleem** | Na klikken op een tab (mobile of URL-param) wisselt de content niet — het blijft Overview tonen |
| **Oorzaak** | `activeTab` gebruikt `useMemo` met `window.location.search` maar de dependency array is `[isPlayer, isSupporter]`. Bij URL-verandering via `navigate()` re-rendert het component maar `useMemo` geeft de gecachte waarde terug omdat de deps niet veranderen. |
| **Impact** | Tab navigatie is volledig kapot — alleen directe URL navigatie (page reload) werkt. |
| **Fix** | Gebruik `useLocation()` of `useSearchParams()` van React Router om reactief de search params te lezen, en voeg dat toe aan de memo deps. Voorbeeld: `const [searchParams] = useSearchParams(); const activeTab = useMemo(() => { const raw = searchParams.get('tab') || 'overview'; ... }, [searchParams, isPlayer, isSupporter]);` |

### K3 — Panel B tab aliasing incompleet
| | |
|---|---|
| **Severity** | 🔴 Kritiek |
| **Component** | `MyTeamHubPage.tsx` regel 82-86 |
| **Probleem** | Panel B sidebar tabs gebruiken andere namen dan de Hub tabs, en de aliasing map is incompleet |
| **Oorzaak** | Aliasing map: `content→media`, `competitions/assets→beheer`. Ontbreekt: `matches→wedstrijden`, `squad→selectie`, `team→selectie`. De tabs `hierarchy`, `transactions`, `workflow` hebben geen mapping en vallen terug op `overview`. |
| **Impact** | Klikken op Panel B tabs "Matches", "Squad", "Team" toont Overview in plaats van de verwachte content. |
| **Fix** | Voeg aliasing toe: `matches→wedstrijden`, `squad→selectie`, `team→selectie`, `hierarchy→overview`, `transactions→beheer`, `workflow→beheer`. Of: verberg Panel B wanneer de Hub actief is en toon de Hub tabs op alle viewports. |

---

## Hoge Bevindingen

### H1 — Back link draagt tab parameter mee
| | |
|---|---|
| **Severity** | 🟠 Hoog |
| **Component** | `MyTeamHubPage.tsx` — `‹ ASC'62` link |
| **Probleem** | De back link naar de club pagina bevat de huidige `?tab=` parameter (bijv. `/knvb/asc?tab=wedstrijden`) |
| **Impact** | Club pagina opent op een verkeerde/niet-bestaande tab |
| **Fix** | Gebruik statische href zonder search params: `team.backToClubHref` zonder `window.location.search` |

### H2 — Console error: 404 op generation-requests
| | |
|---|---|
| **Severity** | 🟠 Hoog |
| **Component** | API call |
| **Probleem** | `GET /api/v1/generation-requests/?project=387&page_size=1` retourneert 404 |
| **Impact** | Elke pageload genereert een error in de console. Kan content-gerelateerde features breken. |
| **Fix** | Backend: Controleer of het generation-requests endpoint bestaat voor dit project. Frontend: Voeg error handling toe zodat 404 geen rode error in console veroorzaakt. |

---

## Medium Bevindingen

### M1 — Seizoensdatum toont "— — —"
| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Component** | SeasonOverviewTab — stats card |
| **Probleem** | De seizoensdatum in de overview card toont "— — —" in plaats van een datumbereik |
| **Impact** | Visueel verwarrend, ontbrekende informatie |
| **Oorzaak** | Waarschijnlijk ontbrekende `start_date`/`end_date` in seizoensdata of verkeerde formatting |

### M2 — Unicode escapes in Media tab badges
| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Component** | SeasonContentTab — content cards |
| **Probleem** | Badges tonen `\U2705 COMPLETED` en `\u2B07 Download` in plaats van ✅ en ⬇️ |
| **Impact** | Visueel lelijk, raw escape sequences zichtbaar voor gebruiker |
| **Fix** | Controleer of de badge text correct wordt gerenderd — mogelijk worden unicode escapes als strings opgeslagen in de database i.p.v. als unicode characters |

### M3 — Match display title toont dezelfde team 2x
| | |
|---|---|
| **Severity** | 🟡 Medium (data issue) |
| **Probleem** | Matches tonen "DVC Dedemsvaart vs DVC Dedemsvaart", "WFV vs WFV", "SC Rouveen vs SC Rouveen" |
| **Impact** | Verwarrend — gebruiker ziet niet welk team de tegenstander was |
| **Oorzaak** | Data issue: `matchDisplayTitle` fallback is waarschijnlijk verkeerd. De opponent naam wordt niet correct opgehaald uit de API. |

### M4 — Club assets tonen radio buttons i.p.v. thumbnails
| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Component** | Overview tab — Club assets section |
| **Probleem** | Club assets (Logo, Sponsor, Thuis tenue, etc.) tonen als radio buttons/circles in plaats van thumbnail previews |
| **Impact** | Geen visuele feedback over welke assets al geüpload zijn |
| **Oorzaak** | Mogelijk ontbreken de asset thumbnails in de data, of de rendering component verwacht een ander data format |

---

## Lage Bevindingen

### L1 — Beheer tab: dubbele heading "Competities" / "Competitions"
| | |
|---|---|
| **Severity** | 🟢 Laag |
| **Component** | Beheer tab — Competitions section |
| **Probleem** | Sectie header is "Competities" (NL) maar tabel header is "Competitions" (EN) |
| **Fix** | Vertaal "Competitions" naar "Competities" of gebruik consistente taal |

### L2 — Beheer tab: datum truncation met backslash
| | |
|---|---|
| **Severity** | 🟢 Laag |
| **Component** | Beheer tab — competition dates |
| **Probleem** | Datum toont "1-9-2025 \..." met zichtbare backslash |
| **Fix** | Controleer datum formatting en truncation logic |

---

## Viewport Testing

### Desktop (1280×900)
| Aspect | Status | Opmerking |
|--------|--------|-----------|
| Layout | ⚠️ | 2-kolom grid werkt correct, maar tabs onzichtbaar |
| Panel B | ⚠️ | Legacy tabs zichtbaar met verkeerde tab namen |
| Hub header | ✅ | Team naam, seizoen pill, Actief badge, share knop correct |
| Stats card | ⚠️ | Layout goed, maar datum ontbreekt |
| Club assets | ⚠️ | Radio buttons i.p.v. thumbnails |
| Media assets | ✅ | Progress bars en counters correct |
| Aankomend/Resultaten | ✅ | Cards correct gerenderd |
| Competities | ✅ | Sport badges correct |

### Mobile (375×812)
| Aspect | Status | Opmerking |
|--------|--------|-----------|
| Layout | ✅ | Single column, goed responsive |
| Tab bar | ⚠️ | Zichtbaar met alle 5 tabs, maar switching werkt niet |
| Bottom nav | ✅ | Home, My Team, +, Studio, Profile correct |
| Touch targets | ✅ | Alle knoppen voldoende groot (44px min) |
| Scroll | ✅ | Main area scrollt correct |
| Horizontal overflow | ✅ | Geen ongewenste horizontal scroll |

---

## Accessibility

| Check | Status |
|-------|--------|
| Tab `role="tablist"` + `role="tab"` | ✅ Correct op mobile MobileTabBar |
| `aria-selected` op actieve tab | ✅ Aanwezig |
| `aria-expanded` op SeasonSwitcher | ✅ (bij multi-season, niet testbaar met 1 season) |
| Keyboard escape op dropdowns | ✅ Geïmplementeerd in code |
| Focus management | ⚠️ Niet getest (tabs werken niet) |
| Screen reader labels | ✅ "Deel deze pagina", "Actief" correct |
| Disabled state | ✅ "Actief" button correct disabled |

---

## Score

| Dimensie | Score | Status |
|----------|-------|--------|
| Layout | 7/10 | ⚠️ Goed op mobile, desktop mist tab visibility |
| Responsive | 8/10 | ✅ Mobile layout werkt goed |
| Functionaliteit | 3/10 | ❌ Tab switching broken |
| Token compliance | 9/10 | ✅ Design tokens correct gebruikt |
| Dark mode | — | Niet getest |
| Visual consistency | 7/10 | ⚠️ Enkele encoding/display issues |
| Accessibility | 7/10 | ⚠️ ARIA correct, maar functionaliteit kapot |

**Totaal: 41/60** — De Hub layout en visuele design zijn goed, maar de core tab navigatie moet gerepareerd worden voordat dit productie-klaar is.

---

## Aanbevolen prioriteiten

1. **Fix K2** — `activeTab` useMemo dependency bug → tab switching herstellen
2. **Fix K1** — Tab bar zichtbaar maken op desktop (of Panel B aanpassen)
3. **Fix K3** — Tab aliasing compleet maken voor Panel B compatibiliteit
4. **Fix H1** — Back link tab parameter verwijderen
5. **Fix M2** — Unicode escape rendering in content badges
