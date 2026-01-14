# TeamReel Current Database State

**Last Updated:** 2026-01-08 09:55
**Environment:** Railway PostgreSQL Production
**Purpose:** Quick reference for database fill status and seeding progress
**Status:** ⚠️ Contains rows with 0 matches (use `python clean_db_state.py` to filter)
**Related Docs:**
- [TeamReel Database Audit](teamreel-db-audit.md) - Comprehensive model-by-model analysis
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Architecture & Design Decisions
- [TeamReel Seeding Plan](teamreel-seeding-plan.md) - Detailed seeding procedures

**Last Update:** Competition names normalized + 680 matches created

---

## 🔄 How to Regenerate This Report

This document can be regenerated at any time to reflect the current database state.

### Option 1: Quick Script (Recommended)
```powershell
# Connect to Railway production database
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python generate_db_state.py
```

**Script:** `generate_db_state.py` (root directory)
**Output:** Overwrites this file with fresh hierarchy data
**Duration:** ~5-10 seconds

### Option 2: Detailed Inspection
```powershell
# For more detailed analysis
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python inspect_current_data_v3.py
```

**Script:** `inspect_current_data_v3.py` (root directory)
**Output:** Alternative format with nested structure
**Duration:** ~5-10 seconds

### When to Regenerate
- ✅ After seeding new data (players, matches, periods)
- ✅ After running data migrations or normalizations
- ✅ Weekly for monitoring database growth
- ✅ Before major releases or demos

---

## 📊 Database Statistics

### KNVB (Royal Dutch Football Association)
- **Clubs:** 36 (Eredivisie + International)
- **Teams:** 90 (Main, O21, Jong, Reserves, Vrouwen)
- **Seasons:** 102 (including historical 2020-2024)
- **Competitions:** 570 → Normalized to "League/Cup/Youth" (48 updated)
- **Total Memberships:** 1,631 player registrations
- **Unique Players:** 1,526 distinct individuals
- **Historical Seasons:** 12 (Ajax 2020-2024: 4 seasons × 15 players each)
- **O21 Youth Teams:** 18 with players
- **Matches Created:** 500 league matches ✅

### DFB (German Football Association)
- **Teams:** 6 Bundesliga clubs with 89 total players
- **Season:** 2024/2025 with League competition (normalized)
- **Matches Created:** 60 league matches ✅

### FIGC (Italian Football Federation)
- **Teams:** 6 Serie A clubs with 87 total players
- **Season:** 2024/2025 with League competition (normalized)
- **Matches Created:** 60 league matches ✅

### The FA (English Football Association)
- **Teams:** 6 Premier League clubs with 90 total players
- **Season:** 2024/2025 with League competition (normalized)
- **Matches Created:** 60 league matches ✅

### 🎉 Total Match Summary
- **Total Teams:** 108 (50 KNVB senior + 40 KNVB youth + 18 international)
- **Total Matches:** 680 league matches across all federations
- **Match Distribution:** ~10 matches per senior team
- **Match Types:** Random opponents from different clubs within same federation

---


## 📊 Unique Categories Overview

**Note:** Only showing data for teams/competitions with matches.


### Organisations
- **dfb**: 6 clubs, 6 teams, 1 competitions
- **figc**: 6 clubs, 6 teams, 1 competitions
- **knvb**: 36 clubs, 90 teams, 13 competitions
- **the-fa**: 6 clubs, 6 teams, 1 competitions

### Seasons (5 unique)
- Season 2020/2021
- Season 2021/2022
- Season 2022/2023
- Season 2023/2024
- Season 2024/2025

### Competition Types (10 unique)
- **Cup**: 72 team-competitions
- **Eredivisie**: 47 team-competitions
- **European**: 72 team-competitions
- **Friendly**: 72 team-competitions
- **League**: 85 team-competitions
- **League Cup**: 72 team-competitions
- **O21 Divisie 1**: 18 team-competitions
- **Play-offs**: 72 team-competitions
- **Premier League**: 6 team-competitions
- **Youth**: 72 team-competitions

### Summary Statistics
- **Total Clubs**: 36
- **Total Teams (with matches)**: 96
- **Total Matches**: 802
- **Total Player Registrations (active teams)**: 6736

---


## 📊 Unique Categories Overview

**Note:** Only showing data for teams/competitions with matches.


### Organisations
- **dfb**: 6 clubs, 6 teams, 1 competitions
- **figc**: 6 clubs, 6 teams, 1 competitions
- **knvb**: 19 clubs, 19 teams, 2 competitions

### Seasons (1 unique)
- Season 2024/2025

### Competition Types (2 unique)
- **Cup**: 16 team-competitions
- **League**: 31 team-competitions

### Summary Statistics
- **Total Clubs**: 30
- **Total Teams (with matches)**: 30
- **Total Matches**: 802
- **Total Player Registrations (active teams)**: 1095

---


## 📊 Unique Categories Overview

**Note:** Only showing data for teams/competitions with matches.


### Organisations
- **dfb**: 6 clubs, 6 teams, 1 competitions
- **figc**: 6 clubs, 6 teams, 1 competitions
- **knvb**: 19 clubs, 19 teams, 2 competitions

### Seasons (1 unique)
- Season 2024/2025

### Competition Types (2 unique)
- **Cup**: 16 team-competitions
- **League**: 31 team-competitions

### Summary Statistics
- **Total Clubs**: 30
- **Total Teams (with matches)**: 30
- **Total Matches**: 802
- **Total Player Registrations (active teams)**: 1095

---

## 📋 Complete Hierarchy View

**Note:** Rows with 0 matches have been filtered out to reduce noise.

| ORG | CLUB | TEAM | SEASON | COMPETITION | PLAYERS | MATCHES |
|-----|------|------|--------|-------------|---------|---------|
| dfb | Bayer Leverkusen | Bayer Leverkusen 1. Mannschaft | Season 2024/2025 | League | 15 | 10 |
| dfb | Bayern München | Bayern München 1. Mannschaft | Season 2024/2025 | League | 15 | 10 |
| dfb | Borussia Dortmund | Borussia Dortmund 1. Mannschaft | Season 2024/2025 | League | 15 | 10 |
| dfb | Eintracht Frankfurt | Eintracht Frankfurt 1. Mannschaft | Season 2024/2025 | League | 15 | 10 |
| dfb | RB Leipzig | RB Leipzig 1. Mannschaft | Season 2024/2025 | League | 14 | 10 |
| dfb | VfB Stuttgart | VfB Stuttgart 1. Mannschaft | Season 2024/2025 | League | 15 | 10 |
| figc | AC Milan | AC Milan 1a Squadra | Season 2024/2025 | League | 15 | 10 |
| figc | AS Roma | AS Roma 1a Squadra | Season 2024/2025 | League | 14 | 10 |
| figc | Atalanta | Atalanta 1a Squadra | Season 2024/2025 | League | 14 | 10 |
| figc | Inter Milan | Inter Milan 1a Squadra | Season 2024/2025 | League | 15 | 10 |
| figc | Juventus | Juventus 1a Squadra | Season 2024/2025 | League | 15 | 10 |
| figc | Napoli | Napoli 1a Squadra | Season 2024/2025 | League | 14 | 10 |
| knvb | AC Milan | AC Milan 1a Squadra | Season 2024/2025 | League | 15 | 10 |
| knvb | Ajax | Ajax 1 | Season 2024/2025 | Cup | 19 | 3 |
| knvb | Ajax | Ajax 1 | Season 2024/2025 | League | 19 | 34 |
| knvb | Almere City | Almere City 1 | Season 2024/2025 | Cup | 30 | 3 |
| knvb | Almere City | Almere City 1 | Season 2024/2025 | League | 30 | 34 |
| knvb | AZ | AZ 1 | Season 2024/2025 | Cup | 18 | 4 |
| knvb | AZ | AZ 1 | Season 2024/2025 | League | 18 | 34 |
| knvb | FC Groningen | FC Groningen 1 | Season 2024/2025 | Cup | 30 | 7 |
| knvb | FC Groningen | FC Groningen 1 | Season 2024/2025 | League | 30 | 34 |
| knvb | FC Twente | FC Twente 1 | Season 2024/2025 | Cup | 32 | 4 |
| knvb | FC Twente | FC Twente 1 | Season 2024/2025 | League | 32 | 34 |
| knvb | FC Utrecht | FC Utrecht 1 | Season 2024/2025 | Cup | 32 | 2 |
| knvb | FC Utrecht | FC Utrecht 1 | Season 2024/2025 | League | 32 | 34 |
| knvb | Feyenoord | Feyenoord 1 | Season 2024/2025 | Cup | 18 | 2 |
| knvb | Feyenoord | Feyenoord 1 | Season 2024/2025 | League | 18 | 34 |
| knvb | Fortuna Sittard | Fortuna Sittard 1 | Season 2024/2025 | Cup | 28 | 6 |
| knvb | Fortuna Sittard | Fortuna Sittard 1 | Season 2024/2025 | League | 28 | 34 |
| knvb | Go Ahead Eagles | Go Ahead Eagles 1 | Season 2024/2025 | Cup | 30 | 5 |
| knvb | Go Ahead Eagles | Go Ahead Eagles 1 | Season 2024/2025 | League | 30 | 34 |
| knvb | Heracles Almelo | Heracles Almelo 1 | Season 2024/2025 | Cup | 28 | 2 |
| knvb | Heracles Almelo | Heracles Almelo 1 | Season 2024/2025 | League | 28 | 34 |
| knvb | NAC Breda | NAC Breda 1 | Season 2024/2025 | Cup | 26 | 2 |
| knvb | NAC Breda | NAC Breda 1 | Season 2024/2025 | League | 26 | 34 |
| knvb | NEC | NEC 1 | Season 2024/2025 | Cup | 18 | 5 |
| knvb | NEC | NEC 1 | Season 2024/2025 | League | 18 | 34 |
| knvb | PEC Zwolle | PEC Zwolle 1 | Season 2024/2025 | Cup | 32 | 5 |
| knvb | PEC Zwolle | PEC Zwolle 1 | Season 2024/2025 | League | 32 | 34 |
| knvb | PSV | PSV 1 | Season 2024/2025 | Cup | 20 | 5 |
| knvb | PSV | PSV 1 | Season 2024/2025 | League | 20 | 34 |
| knvb | RKC Waalwijk | RKC Waalwijk 1 | Season 2024/2025 | Cup | 28 | 4 |
| knvb | RKC Waalwijk | RKC Waalwijk 1 | Season 2024/2025 | League | 28 | 34 |
| knvb | SC Heerenveen | SC Heerenveen 1 | Season 2024/2025 | Cup | 32 | 1 |
| knvb | SC Heerenveen | SC Heerenveen 1 | Season 2024/2025 | League | 32 | 34 |
| knvb | Sparta Rotterdam | Sparta Rotterdam 1 | Season 2024/2025 | League | 32 | 34 |
| knvb | Willem II | Willem II 1 | Season 2024/2025 | League | 30 | 34 |
