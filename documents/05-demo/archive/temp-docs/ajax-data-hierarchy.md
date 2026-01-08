# Ajax Data Hierarchy - Production Database

**Generated:** 2026-01-07
**Database:** Railway Production (`railway`)
**Purpose:** Document current data structure for Ajax Amsterdam team

---

## 📊 Complete Hierarchy

```
ORGANISATION: Eredivisie
├─ ID: dafb7951-55b4-4f3e-bdc2-848c68e5c453
├─ Slug: eredivisie
└─ Type: Football League (Netherlands)

    └─ PROJECT (Team): Ajax Amsterdam
        ├─ ID: 57
        └─ Organisation: Eredivisie

        └─ ROOT PERIOD (Season): Season 2025/2026 - Ajax Amsterdam
            ├─ ID: 2636813e-8738-4eca-b6d6-578fcb6c7477
            ├─ Start Date: 2025-08-01
            └─ End Date: 2026-05-31

            ├─── CHILD PERIOD: League Competition - Ajax Amsterdam
            │    ├─ ID: 618bd8cf-b647-4f82-b470-6f09883e3aa7
            │    ├─ Total Activities: 37
            │    ├─ Activity Type: "League Match"
            │    ├─ Date Range: 2025-08-02 → 2026-05-24
            │    ├─ Match Format: Weekly fixtures
            │    └─ Sample Activities:
            │        • "@ Feyenoord Rotterdam" (Away)
            │        • "vs AZ Alkmaar" (Home)
            │        • "vs PSV Eindhoven" (Home)
            │        • "vs FC Utrecht" (Home)
            │
            └─── CHILD PERIOD: Cup Tournament - Ajax Amsterdam
                 ├─ ID: 45ffc848-6006-4cc9-b341-2af31aa22add
                 ├─ Total Activities: 4
                 ├─ Activity Type: "Cup Match"
                 ├─ Date Range: 2025-10-22 → 2025-12-17
                 ├─ Match Format: Mid-week knockout rounds
                 └─ Sample Activities:
                     • "@ Feyenoord Rotterdam" (Away, 20:00)
                     • "vs Feyenoord Rotterdam" (Home, 20:00)
                     • "vs FC Utrecht" (Home, 20:00)
```

---

## 📈 Statistics Summary

| Metric | Value |
|--------|-------|
| **Total Activities** | 41 |
| **League Matches** | 37 |
| **Cup Matches** | 4 |
| **Season Duration** | ~10 months (Aug 2025 - May 2026) |
| **First Match** | 2025-08-02 (League) |
| **Last Match** | 2026-05-24 (League) |

---

## 🎯 Activity Details

### League Competition

| Property | Value |
|----------|-------|
| **Period Name** | League Competition - Ajax Amsterdam |
| **Activity Type** | League Match |
| **Total Matches** | 37 |
| **Frequency** | Weekly (primarily Saturdays 18:00, Sundays 14:30) |
| **First Match** | 2025-08-02 |
| **Last Match** | 2026-05-24 |

**Sample Activities:**

```
DATE       TIME   TYPE          TITLE                        LOCATION
---------- ------ ------------- ---------------------------- ---------------------------
2025-08-02 18:00  League Match  @ Feyenoord Rotterdam        Feyenoord Rotterdam Arena
2025-08-16 18:00  League Match  vs AZ Alkmaar                Ajax Amsterdam Stadium
2025-08-23 18:00  League Match  vs PSV Eindhoven             Ajax Amsterdam Stadium
2025-08-31 14:30  League Match  vs PSV Eindhoven             Ajax Amsterdam Stadium
2025-09-13 18:00  League Match  vs Feyenoord Rotterdam       Ajax Amsterdam Stadium
2025-09-20 18:00  League Match  vs FC Utrecht                Ajax Amsterdam Stadium
```

### Cup Tournament

| Property | Value |
|----------|-------|
| **Period Name** | Cup Tournament - Ajax Amsterdam |
| **Activity Type** | Cup Match |
| **Total Matches** | 4 |
| **Frequency** | Mid-week (Tuesdays/Wednesdays 20:00) |
| **First Match** | 2025-10-22 |
| **Last Match** | 2025-12-17 |

**Sample Activities:**

```
DATE       TIME   TYPE       TITLE                        LOCATION
---------- ------ ---------- ---------------------------- ---------------------------
2025-10-22 20:00  Cup Match  @ Feyenoord Rotterdam        Feyenoord Rotterdam Arena
2025-11-05 20:00  Cup Match  @ Feyenoord Rotterdam        Feyenoord Rotterdam Arena
2025-11-25 20:00  Cup Match  vs Feyenoord Rotterdam       Ajax Amsterdam Stadium
2025-12-17 20:00  Cup Match  vs FC Utrecht                Ajax Amsterdam Stadium
```

---

## 🔍 Current Data Observations

### ✅ What Works Well

1. **Correct Hierarchy**: Data follows proper structure (Org → Project → Season → Competition → Match)
2. **Realistic Timeline**: 10-month season from August to May matches real football calendar
3. **Match Variety**: Mix of home (vs) and away (@) fixtures
4. **Time Differentiation**: League (18:00/14:30) vs Cup (20:00) kickoff times
5. **Real Opponents**: Authentic Dutch club names (Feyenoord, PSV, AZ, Utrecht)

### ⚠️ Potential Issues

1. **Activity Titles Missing Context**:
   - Current: `"vs AZ Alkmaar"` or `"@ Feyenoord Rotterdam"`
   - Missing: Home team name (Ajax Amsterdam)
   - **Impact**: Frontend must prepend team name to create full match title
   - **Solution**: Currently handled by frontend `ActivityFeed.tsx` component

2. **Low Cup Match Count**:
   - Only 4 cup matches for entire season
   - Real KNVB Cup has ~6 rounds (R32, R16, QF, SF, Final)
   - **Potential Issue**: May not look realistic for demo purposes

3. **Possible Duplicate League Fixtures**:
   - 37 matches seems high (Eredivisie typically has 34 matchdays)
   - May include duplicate fixtures or friendlies
   - **Action Item**: Verify if duplicates exist

4. **Period Names Include Team Name**:
   - `"League Competition - Ajax Amsterdam"` (redundant since period belongs to project)
   - `"Cup Tournament - Ajax Amsterdam"` (same issue)
   - **Minor**: Doesn't break functionality but adds noise

---

## 🎨 Frontend Integration

### Current Implementation

The frontend (`demo/src/components/ActivityFeed/ActivityFeed.tsx`) handles data transformation:

```typescript
// Extract team name from project
const teamName = activity.project.name; // "Ajax Amsterdam"

// Build full match title
if (displayTitle.startsWith('vs ')) {
  const opponent = displayTitle.substring(3);
  displayTitle = `${teamName} vs ${opponent}`; // "Ajax Amsterdam vs FC Utrecht"
} else if (displayTitle.startsWith('@ ')) {
  const opponent = displayTitle.substring(2);
  displayTitle = `${teamName} @ ${opponent}`; // "Ajax Amsterdam @ Feyenoord"
}
```

### API Endpoints

- **Activities List**: `GET /api/v1/activities/?project_id=57`
- **Filtered by Org**: `GET /api/v1/activities/?organisation_id={org_id}`
- **Response Format**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 123,
        "title": "vs AZ Alkmaar",
        "activity_type": "League Match",
        "start_time": "2025-08-16T18:00:00Z",
        "location": "Ajax Amsterdam Stadium",
        "project": {
          "id": 57,
          "name": "Ajax Amsterdam"
        },
        "period": {
          "id": "618bd8cf-...",
          "name": "League Competition - Ajax Amsterdam"
        }
      }
    ]
  }
  ```

---

## 📝 Optimization Recommendations

### Option A: Increase Cup Matches
Add more knockout rounds to create realistic tournament progression:
- Round of 32 (Oct)
- Round of 16 (Nov)
- Quarter Finals (Dec)
- Semi Finals (Feb/Mar)
- Final (Apr/May)

**Total**: ~6 matches (current: 4)

### Option B: Clean Activity Titles
Store full match titles in database:
- Change: `"vs AZ Alkmaar"` → `"Ajax Amsterdam vs AZ Alkmaar"`
- **Pros**: Self-documenting, better for reports/exports
- **Cons**: Breaks existing frontend logic, requires migration

### Option C: Remove Period Name Suffixes
Simplify period names:
- Change: `"League Competition - Ajax Amsterdam"` → `"League Competition"`
- **Pros**: Cleaner, less redundant (team context in project)
- **Cons**: Requires data migration

### Option D: Add Match Round Context
Enrich activities with round information:
- Add field: `round` or `matchday`
- Example: `"Matchday 5"`, `"Round of 16"`
- **Pros**: Better for filtering/sorting
- **Cons**: Requires schema change

---

## 🗂️ Related Documentation

- [Frontend Integration Proposal](./frontend-integration-proposal.md) - Overall demo visualization strategy
- [Demo Data Status](./demo-data-status.md) - Data population checklist
- [Production DB Audit](./production-db-audit.md) - Production deployment verification

---

## 🔧 Maintenance Commands

### Query Activity Counts
```bash
$env:PGPASSWORD="..."; psql -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway -c "
SELECT
    p.name as team,
    per.name as period,
    a.activity_type,
    COUNT(*) as count
FROM activities_activity a
JOIN activities_period per ON a.period_id = per.id
JOIN projects_project p ON a.project_id = p.id
WHERE p.name ILIKE '%Ajax%'
GROUP BY p.name, per.name, a.activity_type;
"
```

### Reseed Activities
```bash
python manage.py seed_demo_activities --clean
```

### Check for Duplicates
```bash
$env:PGPASSWORD="..."; psql -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway -c "
SELECT title, start_time, COUNT(*)
FROM activities_activity
WHERE project_id = 57
GROUP BY title, start_time
HAVING COUNT(*) > 1;
"
```

---

**Last Updated:** 2026-01-07
**Verified Against:** Railway Production Database
