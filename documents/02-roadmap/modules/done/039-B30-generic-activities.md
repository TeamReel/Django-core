# B30: Generic Activities & Periods

**Phase:** 10
**Status:** ✅ Done
**Module ID:** 039
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 39. B30 – Generic Activities & Periods

**Doel**: Generic event & resource planning - time-bound cycles (seasons/quarters) en activities (matches/meetings) zonder domain lock-in.

**Waarom agnostisch**: Event planning is universeel - sports seasons, fiscal quarters, project sprints, meeting schedules.

**Wat moet er gebeuren**:
- **Period model**: Nestable time-bound cycles (infinite depth)
  - Fields: name, start_date, end_date, description
  - Foreign keys: organisation (required), project (optional), parent_period (self-referential, optional)
  - Supports hierarchies: Year → Season → Phase OR Fiscal Year → Quarter → Month
  - Examples:
    - Sports: "Seizoen 2023/2024" → "Najaarscompetitie" → "December 2023"
    - Business: "FY 2024" → "Q1 2024" → "January"
    - Education: "Semester 1" → "Week 5"
  - Indexes: (organisation, project), (parent_period)
- **Activity model**: Specific events within projects
  - Fields: title, activity_type, start_time, end_time, location, data (JSON)
  - Foreign keys: project, period (links to most specific period in hierarchy)
  - Activity types: configurable (match, meeting, training, lecture, sprint_review)
  - Data field: Flexible JSON for domain-specific attributes (score, participants, attachments)
- **Participation model**: Track attendance/roles at both period and activity level
  - Fields: role, status, notes, data (JSON for role-specific info)
  - Foreign keys:
    - activity (optional) - For event participation (match, meeting)
    - period (optional) - For period membership (season squad, quarter team)
    - member (via organisation membership) - Required
  - Constraint: Exactly one of (activity, period) must be set
  - Roles: configurable (squad_member, captain, starter, substitute, attendee, speaker, organizer)
  - Status: confirmed, tentative, declined, no_response
  - Use cases:
    - Period-level: Season squad selection, project team assignments
    - Activity-level: Match lineups, meeting attendees
  - Data field: Role-specific metadata (jersey_number, position, responsibilities)
- **Calendar views**: Monthly/weekly activity display with period filtering
- **Period tree navigation**: Show parent/child relationships, breadcrumbs
- **Integration**: Audit trail (B09), notifications (B16), exports (B38)

**Demo Requirements**:
- 📅 **Activities Page** (`/demo/activities`):
  - **Period hierarchy management**:
    - Create root period (e.g., "Seizoen 2023/2024")
    - Create nested periods (e.g., "Najaarscompetitie" under "Seizoen 2023/2024")
    - Tree view with expand/collapse
    - Breadcrumb navigation
  - **Activity calendar view**:
    - Monthly/weekly display
    - Filter by period (shows activities in selected period + children)
    - Color-code by activity type
  - **Activity list**:
    - Filter by period/type/date range
    - Group by period hierarchy
  - **Activity detail**:
    - View participants with roles/status
    - Edit activity metadata
    - Record outcomes (flexible JSON editor)
  - **Participation tracking**:
    - Add participants to periods (e.g., season squad: 25 members with roles)
    - Add participants to activities (e.g., match lineup: 11 starters + 7 substitutes)
    - View period members (list all squad members with roles/data)
    - Update status (confirmed/tentative/declined)
    - Role-specific data entry (jersey number, position for sports)
    - Inherit period members as suggestions for activity participation
  - **Tests**:
    1. Create period hierarchy: Seizoen → Najaarscompetitie → December
    2. Add squad members to Seizoen (Participation → Period, role="squad_member")
    3. Schedule activity (wedstrijd) in December period
    4. Add participants to activity (Participation → Activity, roles: starter/substitute)
    5. Record outcome with flexible data (score, goals, cards)
    6. Navigate hierarchy, verify:
       - Activity shows in all parent periods
       - Squad members visible at period level
       - Activity participants separate from period squad

**Status**: ✅ Done

**Specify Prompt**:
```
/spec-kitty.specify feature=B30-generic-activities-periods

[feature summary]
Generic event & resource planning with nestable time-bound cycles (periods) and activities.

[goals]
- Period model: Infinite-depth hierarchy (parent_period self-FK)
  - FK: organisation (required), project (optional), parent_period (optional)
  - Supports: Year → Season → Phase OR FY → Quarter → Month
- Activity model: Events within projects, flexible JSON data
  - FK: project, period (most specific in hierarchy)
  - Configurable activity types (match, meeting, training, etc.)
- Participation model: Track attendance/roles at period AND activity level
  - FK: activity (optional), period (optional), member (required)
  - Constraint: Exactly one of (activity, period) must be set
  - Configurable roles and status
  - Period-level: Season squads, project teams
  - Activity-level: Match lineups, meeting attendees
- Calendar views: Monthly/weekly with period hierarchy filtering
- Period tree navigation: Show parent/child, breadcrumbs
- Integration: B09 audit, B16 notifications, B38 exports

[demo requirements]
Demo page: /demo/activities
- Period hierarchy management (create root, nest children, tree view)
  - Period-level: Season squad (25 members)
  - Activity-level: Match lineup (11 starters + 7 subs)
- Outcome recording (flexible JSON editor)
- Tests: create 3-level hierarchy → add squad to period → schedule activity → add activity participants → verify separation

[use case examples]
Sports:
  - Organisation(Club) → Project(Team U19) → Period(Season 2023/24, squad=25 players)
    → Period(Fall Competition) → Activity(Match, lineup=18 players from squad)
Business:
  - Organisation → Period(FY, team=50 employees) → Period(Q1, team=12 project members)
    → Activity(Sprint Review, attendees=5 from Q1 team)
Education:
  - Organisation → Project(Course, enrolled=100 students) → Period(Semester)
    → Activity(Lecture, attendees=85 from enrolled
Sports: Organisation → Project(Team) → Period(Season) → Period(Competition Phase) → Activity(Match)
Business: Organisation → Period(FY) → Period(Quarter) → Period(Month) → Activity(Meeting)
Education: Organisation → Project(Course) → Period(Semester) → Period(Week) → Activity(Lecture)
```
