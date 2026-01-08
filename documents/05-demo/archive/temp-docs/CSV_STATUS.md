# CSV Status - Eredivisie 2024/25

**Laatste update:** 7 januari 2026

## Huidige status: 16/18 clubs compleet

### ✅ Clubs in CSV (met correcte database namen)
1. Ajax
2. Almere City
3. AZ
4. FC Groningen
5. FC Twente
6. FC Utrecht
7. Feyenoord
8. Fortuna Sittard
9. Go Ahead Eagles
10. Heracles Almelo
11. NAC Breda
12. **NEC** (was: NEC Nijmegen - gefixed!)
13. PEC Zwolle
14. PSV
15. RKC Waalwijk
16. Sparta Rotterdam

### ❌ Nog toe te voegen (2 clubs)
17. **SC Heerenveen** - 15 spelers nodig
18. **Willem II** - 15 spelers nodig

**Totaal benodigd:** 30 spelers (2 keepers, 5 verdedigers, 5 middenvelders, 3 aanvallers per club)

## Team mapping (Database → CSV)

De CSV gebruikt `team_type` kolom met waarde **"Eerste Elftal"**.

Het seed command zoekt nu naar:
- **Eerste Elftal** → `[Club] 1` (bijv. "Ajax 1")
- **Jong/O21** → `Jong [Club]` OF `[Club] O21` (beide varianten worden geprobeerd)
- **Reserves** → `[Club] Reserves`
- **Vrouwen** → `[Club] Vrouwen`

## Seed command updates

✅ **seed_level_9_players.py** is geüpdatet om:
1. Meerdere team naam varianten te proberen (Jong/O21)
2. Reserves teams te vinden (niet "Tweede Elftal")
3. Alle 4 team types per club te ondersteunen

## Volgende stappen

1. ⏳ **Gebruiker voegt toe:** SC Heerenveen dataset
2. ⏳ **Gebruiker voegt toe:** Willem II dataset
3. ⏳ **Gebruiker voegt toe:** Buitenlandse clubs datasets
4. ✅ **Klaar voor seeding:** Na toevoeging Willem II + SC Heerenveen

## Database team structuur (alle 18 clubs)

Elk club heeft **4 teams**:
- `[Club] 1` (Eerste Elftal)
- `Jong [Club]` of `[Club] O21` (Jeugd)
- `[Club] Reserves` (Tweede team)
- `[Club] Vrouwen` (Vrouwenteam)

**Totaal:** 18 clubs × 4 teams = **72 teams** in productie database
