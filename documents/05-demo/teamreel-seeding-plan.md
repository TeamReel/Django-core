# TeamReel Seeding Plan - Railway Production

**Last Updated:** 2026-01-08
**Environment:** Railway PostgreSQL Production
**Database URL**: `switchback.proxy.rlwy.net:17304`
**Related Docs:**
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Hierarchy & Design Decisions
- [TeamReel Database Audit](teamreel-db-audit.md) - Current Database State
- [TeamReel Current Database State](teamreel-current-db-state.md) - Quick Status Reference

---

## 📊 Status Overview

### ✅ Completed (2026-01-08)

| Federation | Scope | Status | Memberships | Matches |
|------------|-------|--------|-------------|---------|
| **KNVB** | Season 2024/2025 (All 90 teams) | ✅ Complete | 1,358 | 500 |
| **DFB** | Season 2024/2025 (6 teams) | ✅ Complete | 106 | 60 |
| **FIGC** | Season 2024/2025 (6 teams) | ✅ Complete | 99 | 60 |
| **The FA** | Season 2024/2025 (6 teams) | ✅ Complete | 97 | 60 |
| **KNVB** | Season 2023/2024 (Ajax/PSV/Feyenoord) | ✅ Complete | 22 | - |
| **KNVB** | Season 2022/2023 (Ajax/PSV/Feyenoord) | ✅ Complete | 24 | - |
| **KNVB** | Season 2021/2022 (Ajax/PSV/Feyenoord) | ✅ Complete | 28 | - |
| **KNVB** | Season 2020/2021 (Ajax/PSV/Feyenoord) | ✅ Complete | 24 | - |

**Totals:**
- **2,121 Users** (unique players/staff)
- **2,190 ProjectMemberships** (season-scoped roles)
- **680 Matches** (Activity records with opponent_project FK)
- **Competition Normalization**: 48 competitions renamed from league-specific (Eredivisie, Bundesliga) to generic "League"

---

## 1️⃣ KNVB - Season 2024/2025

### A. Eerste Elftal (Main Teams) - RETRY
**CSV:** `documents/05-demo/players_knvb_2024_25.csv`
**Periode:** `Season 2024/2025`
**Status:** PARTIALLY DONE (3/18 clubs) - needs retry from FC Groningen
**Clubs:** 18 Dutch clubs
**Expected:** ~258 players + 36 coaches = ~294 users

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_knvb_2024_25.csv --period "Season 2024/2025"
```

### B. Reserve Teams (Jong, Reserves, Vrouwen)
**CSV:** `documents/05-demo/players_knvb_reserves_2024_25.csv`
**Periode:** `Season 2024/2025`
**Status:** CSV READY
**Clubs:** 18 clubs × 3 team types
**Expected:** 810 players + 108 coaches = ~918 users

```powershell
# First generate the CSV
cd documents\05-demo
python generate_reserve_teams.py
cd ..\..

# Then seed
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_knvb_reserves_2024_25.csv --period "Season 2024/2025"
```

---

## 2️⃣ International Clubs - Season 2024/25

**CSV:** `documents/05-demo/players_international_2024_25.csv`
**Periode:** `Season 2024/25` (NOTE: Different format!)
**Status:** CSV READY
**Clubs:** 18 clubs (6 DFB + 6 FIGC + 6 The FA)
**Expected:** ~266 players + 36 coaches = ~302 users

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_international_2024_25.csv --period "Season 2024/25"
```

---

## 3️⃣ Historical Seasons - Top 3 KNVB Clubs

### Season 2023/2024
**CSV:** `documents/05-demo/players_eredivisie_2023_24.csv`
**Clubs:** Ajax, PSV, Feyenoord
**Expected:** ~45 players + 6 coaches = ~51 users

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_eredivisie_2023_24.csv --period "Season 2023/2024"
```

### Season 2022/2023
**CSV:** `documents/05-demo/players_eredivisie_2022_23.csv`
**Expected:** ~51 users

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_eredivisie_2022_23.csv --period "Season 2022/2023"
```

### Season 2021/2022
**CSV:** `documents/05-demo/players_eredivisie_2021_22.csv`
**Expected:** ~51 users

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_eredivisie_2021_22.csv --period "Season 2021/2022"
```

### Season 2020/2021
**CSV:** `documents/05-demo/players_eredivisie_2020_21.csv`
**Expected:** ~51 users

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py seed_level_9_players --csv-path documents/05-demo/players_eredivisie_2020_21.csv --period "Season 2020/2021"
```

---

## 📊 Total Overview

| Category | CSV File | Clubs | Users | Status |
|----------|----------|-------|-------|--------|
| KNVB Eerste Elftal | players_knvb_2024_25.csv | 18 | ~294 | PARTIAL (3/18) |
| KNVB Reserves | players_knvb_reserves_2024_25.csv | 18×3 | ~918 | READY |
| International | players_international_2024_25.csv | 18 | ~302 | READY |
| Historical 2023/24 | players_eredivisie_2023_24.csv | 3 | ~51 | READY |
| Historical 2022/23 | players_eredivisie_2022_23.csv | 3 | ~51 | READY |
| Historical 2021/22 | players_eredivisie_2021_22.csv | 3 | ~51 | READY |
| Historical 2020/21 | players_eredivisie_2020_21.csv | 3 | ~51 | READY |
| **TOTAL** | **7 CSV files** | **~85 clubs** | **~1,718 users** | |

---

## 🚨 Critical Notes

1. **Period Names Differ:**
   - KNVB uses: `Season 2024/2025` (with slash)
   - DFB/FIGC/The FA use: `Season 2024/25` (without slash)

2. **Team Names in Database:**
   - KNVB: `[Club] 1`, `Jong [Club]`, `[Club] Reserves`, `[Club] Vrouwen`
   - DFB: `[Club] 1. Mannschaft`
   - FIGC: `[Club] 1a Squadra`
   - The FA: `[Club] First Team`

3. **CSV team_type Must Match:**
   - Use exact team_type in CSV that maps to database team name
   - Code now maps: `Eerste Elftal` → `[Club] 1`

4. **Retry Strategy:**
   - KNVB Eerste Elftal crashed at FC Groningen
   - Check if AZ, Ajax, Almere City were committed before crash
   - May need to skip already seeded clubs in CSV or clear and restart

---

## ⚙️ Execution Order (Recommended)

1. **Generate Reserve Teams CSV** (if not done)
   ```powershell
   cd documents\05-demo
   python generate_reserve_teams.py
   cd ..\..
   ```

2. **Retry/Complete KNVB Eerste Elftal** (highest priority - current season main teams)

3. **Seed KNVB Reserve Teams** (complete current season)

4. **Seed International Clubs** (current season international data)

5. **Seed Historical Seasons** (4 seasons for top 3 clubs)

---

## 🔍 Validation After Seeding

```powershell
# Check user count
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py shell -c "from accounts.models import User; print(f'Total users: {User.objects.count()}')"

# Check memberships per period
python manage.py shell -c "from projects.models import ProjectMembership; from activities.models import Period; [(print(f'{p.name}: {ProjectMembership.objects.filter(period=p).count()} memberships')) for p in Period.objects.all()[:5]]"

# Check teams with memberships
python manage.py shell -c "from projects.models import Project, ProjectMembership; teams_with_data = Project.objects.filter(projectmembership__isnull=False).distinct().count(); print(f'Teams with data: {teams_with_data}')"
```
